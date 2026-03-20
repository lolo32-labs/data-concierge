import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[80%] px-4 py-3 text-sm"
        style={
          isUser
            ? {
                backgroundColor: "var(--brand-primary)",
                color: "var(--text-inverse)",
                borderRadius: "14px 14px 4px 14px",
              }
            : {
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "14px 14px 14px 4px",
              }
        }
      >
        {isUser ? (
          content
        ) : (
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong
                  className="font-bold"
                  style={{ color: "var(--brand-primary)" }}
                >
                  {children}
                </strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-1">{children}</li>,
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="text-xs border-collapse w-full">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th
                  className="px-2 py-1 text-left"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-subtle)",
                  }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td
                  className="px-2 py-1"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {children}
                </td>
              ),
              code: ({ children }) => (
                <code
                  className="text-xs px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {children}
                </code>
              ),
            }}
          >
            {content}
          </Markdown>
        )}
      </div>
    </div>
  );
}
