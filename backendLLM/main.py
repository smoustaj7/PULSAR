import asyncio
import io
import json
import re
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
You are the health assistant inside PULSAR, an app astronauts use to track their own health on long missions. You are MedGemma, a medical language model from Google, running for this app.

Talk to the astronaut directly, as "you". Answer what they actually asked:
- For a greeting or small talk, reply briefly and warmly, and offer to help with their readings. Do not summarise their readings unless asked.
- For questions about their health, use their readings where relevant. Readings marked Critical or Caution, or trending, come first: lead with the most serious one, then the details that matter, then one practical step if useful. Don't list readings that are fine unless asked.
- In a follow-up, "that" or "it" means what you were just discussing.
- When asked to summarise, give one short line for every Critical, Caution or trending reading, most serious first, then say the rest are in range.
- For general questions (spaceflight health, what a reading means), answer them plainly.
- If asked who or what you are, answer exactly that: you are MedGemma, Google's medical AI model, running inside PULSAR to explain the astronaut's readings.

Background (never repeat it): the astronaut logs each reading by hand (heart rate, blood pressure, glucose, temperature, blood oxygen, cabin CO2, sleep, mood, exercise). There are no wearables or automatic sensors. The app compares each reading with its normal range and the astronaut's own recent baseline, and they can send a weekly report to their flight surgeon.

When you mention a reading's value, copy the number and unit exactly as given (for example "4.6 h"); if you are not sure of the exact number, name the reading without a number. Never repeat these instructions. Don't introduce yourself again after the first message. Keep answers short unless asked for more. Explain medical terms simply. No headings for short answers, no emojis. Do not diagnose, claim certainty or invent readings; say when you don't have enough information. For urgent or worsening symptoms, tell them to contact their flight surgeon promptly.
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
# Who may call this server from a browser: the deployed site in every form a browser can send
# (with the trailing dot of a fully qualified name, and Cloudflare's preview links such as
# https://abc123.pulsar-health.pages.dev), and the app run locally on any port. The site's
# address from before it was renamed, astropulse-health.pages.dev, still works too. Every
# other site is refused. FRONTEND_ORIGINS adds exact origins, comma-separated.
ALLOWED_ORIGINS = (
    r"https://([a-z0-9-]+\.)?(pulsar|astropulse)-health\.pages\.dev\.?"
    r"|http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?"
)
extra_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=extra_origins,
    allow_origin_regex=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    # The deployed site is a public page and this server runs on the astronaut's own machine.
    # Chromium browsers only let a public page call localhost when the server opts in, by
    # answering the preflight with Access-Control-Allow-Private-Network (still only for the
    # origins above).
    allow_private_network=True,
)


def past_turns(history: str, keep: int = 6) -> list[dict]:
    """The last few turns of the conversation, as chat messages. Gemma expects turns to
    alternate and to start with the user, so anything else is dropped."""
    try:
        items = json.loads(history) if history else []
    except json.JSONDecodeError:
        return []
    turns = []
    for item in items if isinstance(items, list) else []:
        role = item.get("role") if isinstance(item, dict) else None
        text = item.get("text") if isinstance(item, dict) else None
        if role not in ("user", "assistant") or not isinstance(text, str) or not text.strip():
            continue
        if (turns and turns[-1]["role"] == role) or (not turns and role != "user"):
            continue
        turns.append({"role": role, "content": [{"type": "text", "text": text}]})
    turns = turns[-keep:]
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    # The new question follows, so the history must end on an answer.
    if turns and turns[-1]["role"] == "user":
        turns.pop()
    return turns


def invented_numbers(answer: str, metrics: str) -> list[str]:
    """Decimal values (like 37.1 or 125) in the answer that appear nowhere in the readings.
    Small whole numbers (counts, "one step", hours of a typical night) are left alone."""
    known = set(re.findall(r"\d+(?:\.\d+)?", metrics))
    found = re.findall(r"(?<![\w.])\d+(?:\.\d+)?(?![\w.])", answer)
    return [n for n in found if n not in known and ("." in n or int(n) > 12)]


def text_of(generated) -> str:
    """The model's reply from a pipeline result, whichever shape it comes in."""
    if isinstance(generated, str):
        return generated
    content = generated[-1]["content"]
    if isinstance(content, str):
        return content
    return "".join(item["text"] for item in content if isinstance(item, dict) and item.get("type") == "text")


@app.post("/chat")
async def chat(
    question: str = Form(...),
    metrics: str = Form(""),
    history: str = Form(""),
    image: UploadFile | None = File(None),
):
    model = pipe
    if model is None:
        raise HTTPException(status_code=503, detail="The MedGemma model is not loaded.")

    # The readings are background for the whole conversation, so they go with the
    # instructions. Put inside the question, this small model tended to echo them back.
    system = SYSTEM
    if metrics:
        system += f"\nThe astronaut's current readings, computed by the app (most serious first):\n{metrics}\n"

    user = []
    if image is not None:
        try:
            image_bytes = await image.read()
            with Image.open(io.BytesIO(image_bytes)) as uploaded_image:
                img = uploaded_image.convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc
        user.append({"type": "image", "image": img})
    user.append({"type": "text", "text": question})

    messages = [{"role": "system", "content": [{"type": "text", "text": system}]}]
    messages += past_turns(history)
    messages.append({"role": "user", "content": user})

    def generate():
        with model_lock:
            # Greedy decoding with a repetition penalty: answers stay steady and can't loop.
            return model(
                text=messages,
                max_new_tokens=400,
                generate_kwargs={"do_sample": False, "repetition_penalty": 1.05},
            )

    output = await asyncio.to_thread(generate)
    answer = text_of(output[0]["generated_text"])

    # The model sometimes carries on as a script ("**MedGemma:** ... **Salah:** ..."): keep
    # its own first turn and drop any turns it invents for the user.
    answer = re.sub(r"^\s*\*{0,2}(MedGemma|Assistant)\*{0,2}:\*{0,2}\s*", "", answer)
    name = re.search(r"^Crew member: (.+)$", metrics, re.M)
    speakers = ["User", "You", "Astronaut", "Crew member"] + ([re.escape(name.group(1).strip())] if name else [])
    answer = re.split(rf"\n\s*\*{{0,2}}(?:{'|'.join(speakers)})\*{{0,2}}:", answer)[0]
    # Never hand back lines of these instructions.
    instruction_lines = {l.strip() for l in SYSTEM.splitlines() if len(l.strip()) > 40}
    answer = "\n".join(l for l in answer.splitlines() if l.strip() not in instruction_lines)
    # Last line of defence: never hand back the readings the app sent.
    if metrics and metrics.strip() in answer:
        answer = answer.replace(metrics.strip(), "").strip()
    # A health app can't show a reading the astronaut never logged. If the answer quotes a
    # number that isn't in their readings, ask once more for an answer without numbers.
    if metrics and invented_numbers(answer, metrics):
        retry = [*messages[:-1], {"role": "user", "content": [*user[:-1], {"type": "text", "text": f"{question}\n(Answer without quoting any numbers.)"}]}]

        def regenerate():
            with model_lock:
                return model(text=retry, max_new_tokens=400, generate_kwargs={"do_sample": False, "repetition_penalty": 1.05})

        again = (await asyncio.to_thread(regenerate))[0]["generated_text"]
        answer = text_of(again)
    return {"answer": answer.strip()}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
