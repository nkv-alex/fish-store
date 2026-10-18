"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  answer?: string;
  error?: string;
};

const initialMessages: Record<Locale, string> = {
  es: "¡Hola! ¿En qué puedo ayudarte con la tienda?",
  en: "Hello! How can I help you with the store?",
  fr: "Bonjour ! Comment puis-je vous aider avec la boutique ?",
  de: "Hallo! Wie kann ich dir mit dem Shop helfen?",
};

export function ChatWidget() {
  const { locale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: initialMessages[locale] }]);
    }
    textAreaRef.current?.focus();
  }, [locale, messages.length, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending) return;

    const conversation = [...messages, { role: "user" as const, content }];
    setMessages(conversation);
    setInput("");
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: conversation.slice(-8).map(({ role, content: text }) => ({
            role,
            content: text.slice(0, 1200),
          })),
        }),
      });
      const result = (await response.json()) as ChatResponse;
      const answer = result.answer;
      if (!response.ok || !answer) {
        if (response.status === 503) {
          throw new Error(t("chatUnavailable"));
        }
        if (response.status === 429) {
          throw new Error(t("chatOverloaded"));
        }
        throw new Error(t("chatError"));
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: answer },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.message === t("chatUnavailable")
          ? requestError.message
          : requestError instanceof Error && requestError.message === t("chatOverloaded")
            ? requestError.message
            : t("chatError"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <section
          className="chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="chat-title"
        >
          <header className="chat-header">
            <div>
              <p className="chat-kicker">PEZCADO · AI</p>
              <h2 id="chat-title">{t("chatTitle")}</h2>
            </div>
            <button
              className="chat-close"
              type="button"
              aria-label={t("closeChat")}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="chat-messages" aria-live="polite">
            {messages.map((message, index) => (
              <p className={`chat-message ${message.role}`} key={`${index}-${message.role}`}>
                {message.content}
              </p>
            ))}
            {pending && <p className="chat-message assistant">{t("chatThinking")}</p>}
            <div ref={endRef} />
          </div>
          {error && <p className="chat-error" role="alert">{error}</p>}
          <form className="chat-form" onSubmit={submit}>
            <textarea
              ref={textAreaRef}
              rows={2}
              maxLength={1200}
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder={t("chatPlaceholder")}
              aria-label={t("chatPlaceholder")}
              required
            />
            <button type="submit" disabled={pending || !input.trim()}>{t("send")}</button>
          </form>
          <p className="chat-disclosure">{t("chatDisclosure")}</p>
        </section>
      )}
      <button
        type="button"
        className={`chat-launcher${open ? " open" : ""}`}
        aria-label={open ? t("closeChat") : t("openChat")}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <span aria-hidden="true">×</span> : <span aria-hidden="true">✦</span>}
      </button>
    </div>
  );
}
