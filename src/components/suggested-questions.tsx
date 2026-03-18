interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 flex-1">
      <div className="text-center">
        <p className="text-2xl mb-1">👋</p>
        <p className="text-gray-300 font-medium">What would you like to know?</p>
        <p className="text-gray-500 text-sm mt-1">Ask anything, or try one of these:</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="bg-gray-900 border border-gray-700 px-3 py-2 rounded-full text-xs text-gray-300 hover:border-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
