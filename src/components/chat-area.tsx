"use client";

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import MessageBubble from "./message-bubble";
import SuggestedQuestions from "./suggested-questions";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatAreaProps {
  clientId: string;
  suggestedQuestions: string[];
  initialQuestion?: string;
  onMessageCountChange?: (count: number) => void;
}

export interface ChatAreaHandle {
  sendMessage: (question: string) => void;
}

const ChatArea = forwardRef<ChatAreaHandle, ChatAreaProps>(function ChatArea(
  { clientId, suggestedQuestions, initialQuestion, onMessageCountChange },
  ref
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialQuestionSent = useRef(false);
  const loadingRef = useRef(false);

  // Keep loadingRef in sync
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Notify parent of user message count changes
  useEffect(() => {
    if (onMessageCountChange) {
      const userMessageCount = messages.filter((m) => m.role === "user").length;
      onMessageCountChange(userMessageCount);
    }
  }, [messages, onMessageCountChange]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || loadingRef.current) return;

      const userMsg: Message = { role: "user", content: question.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(`/api/${clientId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: question.trim() }),
        });

        if (res.status === 429) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Too many requests. Please wait a minute and try again.",
            },
          ]);
          return;
        }

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.answer || data.error || "Something went wrong.",
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm temporarily unavailable. Please try again in a minute.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [clientId]
  );

  // Expose sendMessage to parent via ref
  useImperativeHandle(ref, () => ({ sendMessage }), [sendMessage]);

  // Auto-submit initial question (from ?q= param) after brief delay
  useEffect(() => {
    if (initialQuestion && !initialQuestionSent.current) {
      initialQuestionSent.current = true;
      const timer = setTimeout(() => {
        sendMessage(initialQuestion);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialQuestion, sendMessage]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
        {messages.length === 0 ? (
          <SuggestedQuestions
            questions={suggestedQuestions}
            onSelect={sendMessage}
          />
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm"
                  style={{
                    backgroundColor: "var(--surface)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="p-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask about your profit..."
            disabled={loading}
            rows={1}
            className="flex-1 rounded-2xl px-5 py-3 text-sm outline-none resize-none"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              overflow: "hidden",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full w-10 h-10 flex items-center justify-center text-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: "var(--brand-primary)",
              color: "var(--text-inverse)",
            }}
          >
            &#8593;
          </button>
        </div>
      </form>
    </div>
  );
});

export default ChatArea;
