import asyncio
import io
import os
import threading
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from model.huggingface import load_model

SYSTEM = """
You are a supportive health-information assistant for an astronaut health-monitoring app.

By default, give a brief, plain-language summary that groups related information together. Lead with the main takeaway, then mention only the most relevant details and one practical next step if useful. Do not add a title or a long list unless it improves clarity.

If the user asks for more detail, explain the relevant points more fully and organize them with short headings or bullets.

Explain medical terms simply. Avoid repetition, unnecessary formatting, and emojis. Do not diagnose, claim certainty, or invent information. Say when the provided information is insufficient.

You are not a substitute for a clinician. For urgent or worsening symptoms, advise the user to contact the flight surgeon or a qualified clinician promptly.
"""

pipe: Any | None = None
model_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global pipe
    pipe = load_model()
    yield
    pipe = None


app = FastAPI(lifespan=lifespan)
# The dev server, the production preview and the deployed site.
frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://localhost:4173,https://astropulse-health.pages.dev",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins.split(",") if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat(
    question: str = Form(...),
    metrics: str = Form(""),
    image: UploadFile | None = File(None),
):
    model = pipe
    if model is None:
        raise HTTPException(status_code=503, detail="The MedGemma model is not loaded.")

    user = []
    if metrics:
        user.append(
            {
                "type": "text",
                "text": f"Crew member metrics (computed by the app):\n{metrics}",
            }
        )
    if image is not None:
        try:
            image_bytes = await image.read()
            with Image.open(io.BytesIO(image_bytes)) as uploaded_image:
                img = uploaded_image.convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc
        user.append({"type": "image", "image": img})
    user.append({"type": "text", "text": question})

    messages = [
        {"role": "system", "content": [{"type": "text", "text": SYSTEM}]},
        {"role": "user", "content": user},
    ]

    def generate():
        with model_lock:
            return model(text=messages, max_new_tokens=256)

    output = await asyncio.to_thread(generate)
    generated_text = output[0]["generated_text"]
    if isinstance(generated_text, str):
        answer = generated_text
    else:
        content = generated_text[-1]["content"]
        if isinstance(content, str):
            answer = content
        else:
            answer = "".join(
                item["text"]
                for item in content
                if isinstance(item, dict) and item.get("type") == "text"
            )

    return {"answer": answer}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
