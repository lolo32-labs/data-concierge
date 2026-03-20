interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 flex-1">
      <div className="text-center">
        <p className="text-2xl mb-1">&#x1f44b;</p>
        <p
          className="font-medium text-[15px]"
          style={{ color: "var(--text-primary)" }}
        >
          What would you like to know?
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Ask anything, or try one of these:
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="px-3 py-2 rounded-full text-xs transition-colors cursor-pointer"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand-primary)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
