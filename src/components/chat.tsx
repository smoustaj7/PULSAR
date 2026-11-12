import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

type ChatProps = {
  apiUrl?: string;
  metrics?: string;
};

const DEFAULT_API_URL = "http://localhost:8000";

export default function Chat({
  apiUrl = DEFAULT_API_URL,
  metrics = "",
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "Hi Space Traveler🌠\n I'm your personal health assistant.\n I can help explain your health information. \nI do not diagnose; contact a clinician about urgent concerns.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text },
    ]);
    setQuestion("");
    setError("");
    setIsLoading(true);

    const formData = new FormData();
    formData.append("question", text);
    if (metrics) formData.append("metrics", metrics);
    if (image) formData.append("image", image);
    setImage(null);

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/chat`, {
        method: "POST",
        body: formData,
      });
      const result: { answer?: string; detail?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail ?? `Request failed (${response.status}).`);
      }
      if (typeof result.answer !== "string") {
        throw new Error("The server response did not contain an answer.");
      }

      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", text: result.answer! },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reach the chat server.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="health-chat" aria-label="Health assistant chat">
      <header className="health-chat__header">
        <div className="health-chat__avatar" aria-hidden="true">
          +
        </div>
        <div>
          <h2 className="health-chat__title">Health assistant</h2>
          <p className="health-chat__subtitle">Health information, not diagnosis</p>
        </div>
      </header>

      <div className="health-chat__messages" aria-live="polite">
        {messages.map((message) => (
          <div
            className={`health-chat__message health-chat__message--${message.role}`}
            key={message.id}
          >
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        ))}
        {isLoading && (
          <div className="health-chat__message health-chat__message--assistant" role="status">
            Thinking...
          </div>
        )}
        {error && (
          <p className="health-chat__error" role="alert">
            {error}
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="health-chat__form" onSubmit={handleSubmit}>
        {image && (
          <div className="health-chat__attachment">
            <span>{image.name}</span>
            <button type="button" onClick={() => setImage(null)} aria-label="Remove attached image">
              Remove
            </button>
          </div>
        )}
        <div className="health-chat__controls">
          <label className="health-chat__attach" title="Attach an image">
            <span aria-hidden="true">+</span>
            <span className="health-chat__sr-only">Attach an image</span>
            <input
              accept="image/*"
              type="file"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
          </label>
          <textarea
            aria-label="Your question"
            placeholder="Ask about your health information..."
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            className="health-chat__send"
            type="submit"
            disabled={!question.trim() || isLoading}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </form>

      <style>{`
        .health-chat {
          display: flex;
          flex-direction: column;
          width: min(390px, calc(100vw - 32px));
          height: min(620px, calc(100svh - 32px));
          overflow: hidden;
          border: 1px solid #cfe3ff33;
          border-radius: 16px;
          background: #080d18ed;
          color: #e8eef8;
          font: 14px/1.5 system-ui, 'Segoe UI', sans-serif;
          box-shadow: 0 16px 48px #0008;
          backdrop-filter: blur(14px);
        }
        .health-chat__header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #ffffff1a;
        }
        .health-chat__avatar {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 50%;
          background: #4f9ce833;
          color: #9bd0ff;
          font-size: 24px;
        }
        .health-chat__title {
          margin: 0;
          color: #f2f7ff;
          font-size: 15px;
        }
        .health-chat__subtitle {
          margin: 2px 0 0;
          color: #aab8ca;
          font-size: 11px;
        }
        .health-chat__messages {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          padding: 16px;
        }
        .health-chat__message {
          max-width: 88%;
          padding: 10px 12px;
          border-radius: 14px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          
        }
        .health-chat__message p {
          margin: 0 0 4px;
        }

        .health-chat__message p:last-child {
          margin-bottom: 0;
        }
        .health-chat__message h1,
        .health-chat__message h2,
        .health-chat__message h3,
        .health-chat__message h4,
        .health-chat__message h5,
        .health-chat__message h6 {
          margin: 0 0 4px;
          font-size: 1em;
          line-height: inherit;
        }
        .health-chat__message--assistant {
          align-self: flex-start;
          border: 1px solid #ffffff14;
          border-bottom-left-radius: 4px;
          background: #ffffff0d;
        }
        .health-chat__message--user {
          align-self: flex-end;
          border-bottom-right-radius: 4px;
          background: #2469a8;
          color: #fff;
        }
        .health-chat__error {
          margin: 0;
          color: #ff9a9a;
          font-size: 12px;
        }
        .health-chat__form {
          padding: 12px;
          border-top: 1px solid #ffffff1a;
        }
        .health-chat__attachment {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
          color: #c9d8e9;
          font-size: 12px;
        }
        .health-chat__attachment span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .health-chat__attachment button {
          border: 0;
          background: none;
          color: #9bd0ff;
          cursor: pointer;
        }
        .health-chat__controls {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .health-chat__attach,
        .health-chat__send {
          display: grid;
          min-width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid #8eb6e766;
          border-radius: 10px;
          background: #d7e6ff18;
          color: #f2f7ff;
          cursor: pointer;
        }
        .health-chat__attach {
          position: relative;
          font-size: 22px;
        }
        .health-chat__attach input {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          clip-path: inset(50%);
        }
        .health-chat__attach:focus-within,
        .health-chat__send:focus-visible {
          outline: 2px solid #9bd0ff;
          outline-offset: 2px;
        }
        .health-chat__controls textarea {
          flex: 1;
          min-width: 0;
          max-height: 120px;
          resize: vertical;
          box-sizing: border-box;
          padding: 10px 11px;
          border: 1px solid #ffffff24;
          border-radius: 10px;
          background: #02040a80;
          color: #f2f7ff;
          font: inherit;
        }
        .health-chat__controls textarea:focus {
          border-color: #70b8ff;
          outline: none;
        }
        .health-chat__controls textarea::placeholder {
          color: #8d9bad;
        }
        .health-chat__send {
          padding: 0 12px;
          background: #2469a8;
          font: inherit;
          font-weight: 600;
        }
        .health-chat__send:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
        .health-chat__sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          clip-path: inset(50%);
        }
      `}</style>
    </section>
  );
}
