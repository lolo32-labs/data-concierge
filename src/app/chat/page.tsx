"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MessageBubble from "@/components/message-bubble";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "What's my real profit this month?",
  "Which products are making me money?",
  "How are my ads performing?",
  "Break down my margins by channel",
  "Show me the full profit waterfall",
];

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  // Load chat history
  useEffect(() => {
    fetch("/api/chat/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          setMessages(data.messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, []);

  // Handle initial question from URL ?q=
  useEffect(() => {
    if (!historyLoaded) return;
    const q = searchParams.get("q");
    if (q && messages.length === 0) {
      sendMessage(q);
    }
  }, [historyLoaded, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading || sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      let content = data.answer || data.error || "Sorry, I couldn't process that.";
      if (data.noStore) {
        content = "You haven't connected a Shopify store yet.\n\n[**Connect Your Store →**](/connect)\n\nOr [try the demo](/demo/chat) to see ProfitSight in action!";
      }
      const assistantMsg: Message = { role: "assistant", content };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    }
    setLoading(false);
    sendingRef.current = false;
  }

  const hasMessages = messages.length > 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Sidebar */}
      <div style={{ width: 260, borderRight: "1px solid var(--border-primary)", padding: 20, flexShrink: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <a href="/dashboard" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 13 }}>
            &larr; Dashboard
          </a>
        </div>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 12, fontWeight: 600 }}>
          Quick Questions
        </h3>
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={loading}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "10px 12px", marginBottom: 6, borderRadius: 6,
              border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
              color: "var(--text-primary)", cursor: loading ? "wait" : "pointer",
              fontSize: 13, lineHeight: 1.4,
            }}
          >
            {q}
          </button>
        ))}
        <div style={{ marginTop: 24 }}>
          <a href="/settings" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 13 }}>
            Settings
          </a>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
          {!hasMessages && (
            <div style={{ textAlign: "center", marginTop: 80 }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
                Ask ProfitSight anything
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
                Ask about your profits, products, ad spend, or channels.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {QUICK_QUESTIONS.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: "8px 16px", borderRadius: 20,
                      border: "1px solid var(--border-primary)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {loading && (
            <div style={{ display: "flex", marginBottom: 16 }}>
              <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 14 }}>
                Analyzing your data<span className="loading-dots" />
              </div>
              <style>{`
                .loading-dots::after {
                  content: '';
                  animation: dots 1.5s steps(4, end) infinite;
                }
                @keyframes dots {
                  0% { content: ''; }
                  25% { content: '.'; }
                  50% { content: '..'; }
                  75% { content: '...'; }
                  100% { content: ''; }
                }
              `}</style>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border-primary)" }}>
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            style={{ display: "flex", gap: 8 }}
          >
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
                  sendMessage(input);
                }
              }}
              placeholder="Ask about your profit, products, or ads..."
              disabled={loading}
              rows={1}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 8,
                border: "1px solid var(--border-primary)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)", fontSize: 14,
                outline: "none", resize: "none", overflow: "hidden",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: "12px 24px", borderRadius: 8,
                border: "none", background: "var(--accent-primary)",
                color: "var(--accent-primary-text)",
                fontWeight: 600, fontSize: 14,
                cursor: loading ? "wait" : "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
