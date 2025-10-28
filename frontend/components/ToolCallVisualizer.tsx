"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolCallVisualizerProps = {
  content: string;
  timestamp: string;
  type: string;
};

type ParsedToolCall = {
  name: string;
  parameters?: Record<string, any>;
  result?: any;
  status?: "pending" | "success" | "error";
  duration?: number;
};

export function ToolCallVisualizer({ content, timestamp, type }: ToolCallVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [parsedCall, setParsedCall] = useState<ParsedToolCall | null>(null);

  // Try to parse tool call information from content
  useState(() => {
    try {
      // Look for common tool call patterns
      const toolCallMatch = content.match(/tool[:\s]+(\w+)/i);
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (toolCallMatch || jsonMatch) {
        const parsed: ParsedToolCall = {
          name: toolCallMatch?.[1] || "Unknown Tool",
          status: type === "stderr" ? "error" : "success"
        };

        if (jsonMatch) {
          try {
            const jsonData = JSON.parse(jsonMatch[0]);
            parsed.parameters = jsonData;
          } catch {
            // Not valid JSON, ignore
          }
        }

        setParsedCall(parsed);
      }
    } catch {
      // Parsing failed, will show raw content
    }
  });

  if (!parsedCall) {
    return null; // Not a tool call, let the regular message component handle it
  }

  return (
    <div className="mb-4 border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}

        <Wrench className={cn(
          "h-5 w-5 flex-shrink-0",
          parsedCall.status === "success" && "text-green-600",
          parsedCall.status === "error" && "text-red-600",
          parsedCall.status === "pending" && "text-yellow-600"
        )} />

        <div className="flex-1 text-left">
          <div className="font-medium">
            {parsedCall.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString()}
            {parsedCall.duration && ` • ${parsedCall.duration}ms`}
          </div>
        </div>

        {parsedCall.status === "success" && (
          <CheckCircle className="h-5 w-5 text-green-600" />
        )}
        {parsedCall.status === "error" && (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
        {parsedCall.status === "pending" && (
          <Clock className="h-5 w-5 text-yellow-600 animate-pulse" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t p-4 bg-muted/30">
          {parsedCall.parameters && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold mb-2">Parameters:</h4>
              <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                {JSON.stringify(parsedCall.parameters, null, 2)}
              </pre>
            </div>
          )}

          {parsedCall.result && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold mb-2">Result:</h4>
              <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                {JSON.stringify(parsedCall.result, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-2">Raw Output:</h4>
            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto whitespace-pre-wrap">
              {content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
