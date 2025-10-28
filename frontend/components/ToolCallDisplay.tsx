import { WSEvent } from "@/lib/websocket";
import { cn } from "@/lib/utils";
import { Wrench, CheckCircle, XCircle, Loader2 } from "lucide-react";

type ToolCallDisplayProps = {
  startEvent: WSEvent;
  endEvent?: WSEvent;
};

export function ToolCallDisplay({ startEvent, endEvent }: ToolCallDisplayProps) {
  const isComplete = !!endEvent;
  const hasError = endEvent?.error;
  const toolName = startEvent.tool_name || "Unknown Tool";
  const toolInput = startEvent.tool_input;
  const result = endEvent?.result;

  return (
    <div
      className={cn(
        "mb-4 p-4 rounded-lg border-2",
        hasError && "border-destructive/30 bg-destructive/5",
        !hasError && isComplete && "border-green-500/30 bg-green-50 dark:bg-green-950/20",
        !isComplete && "border-blue-500/30 bg-blue-50 dark:bg-blue-950/20"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Tool Call: {toolName}</span>
        <div className="flex-1" />
        {!isComplete && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
        {isComplete && !hasError && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
        {hasError && (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
      </div>

      {/* Tool Input */}
      {toolInput && Object.keys(toolInput).length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Input:
          </div>
          <div className="bg-muted/50 rounded p-2 text-xs font-mono overflow-x-auto">
            <pre>{JSON.stringify(toolInput, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Tool Result or Error */}
      {isComplete && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">
            {hasError ? "Error:" : "Result:"}
          </div>
          <div
            className={cn(
              "rounded p-2 text-xs overflow-x-auto",
              hasError
                ? "bg-destructive/10 text-destructive"
                : "bg-muted/50 text-foreground"
            )}
          >
            <pre className="whitespace-pre-wrap">
              {hasError ? endEvent.error : result || "(no output)"}
            </pre>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!isComplete && (
        <div className="text-xs text-muted-foreground italic">
          Executing...
        </div>
      )}
    </div>
  );
}
