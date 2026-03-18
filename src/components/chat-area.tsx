"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./message-bubble";
import SuggestedQuestions from "./suggested-questions";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatAreaProps {
  clientId: string;
  suggestedQuestions: string[];
}

export default function ChatArea({ clientId, suggestedQuestions }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

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
        setMessages((prev) => [...prev, { role: "assistant", content: "Too many requests. Please wait a minute and try again." }]);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || data.error || "Something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm temporarily unavailable. Please try again in a minute." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
        {messages.length === 0 ? (
          <SuggestedQuestions questions={suggestedQuestions} onSelect={sendMessage} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 px-4 py-3 rounded-2xl rounded-bl-sm text-sm">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business..."
            disabled={loading}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-5 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}
