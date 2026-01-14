import { Lightbulb } from "lucide-react";

export const SuggestionBox = ({ suggestion, loading = false }) => {
  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Sales Demand Suggestion
        </h3>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Generating suggestion...</p>
      ) : suggestion ? (
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
          {suggestion}
        </p>
      ) : (
        <p className="text-sm text-gray-400">
          No suggestion available yet.
        </p>
      )}
    </div>
  );
};