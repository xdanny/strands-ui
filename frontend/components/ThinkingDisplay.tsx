import { Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ThinkingDisplayProps = {
  isActive: boolean;
};

export function ThinkingDisplay({ isActive }: ThinkingDisplayProps) {
  if (!isActive) return null;

  return (
    <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
          Agent is thinking...
        </span>
        <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />
      </div>
    </div>
  );
}
