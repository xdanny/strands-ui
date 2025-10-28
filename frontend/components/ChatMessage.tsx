import { WSEvent } from "@/lib/websocket";
import { cn } from "@/lib/utils";
import { User, Bot, AlertCircle } from "lucide-react";

type ChatMessageProps = {
  event: WSEvent;
};

export function ChatMessage({ event }: ChatMessageProps) {
  // Determine message type
  const isUserMessage = event.type === "user_input";
  const isAgentMessage = event.type === "message" && event.role === "assistant";
  const isError = event.type === "error";

  // Skip non-displayable events
  if (!isUserMessage && !isAgentMessage && !isError) {
    return null;
  }

  // Extract content
  let content = "";
  if (isUserMessage) {
    content = event.data?.content || event.content || "";
  } else {
    content = event.content || "";
  }

  // Skip empty messages
  if (!content.trim()) {
    return null;
  }

  // Format timestamp
  const timestamp = new Date(event.timestamp).toLocaleTimeString();

  return (
    <div
      className={cn(
        "mb-4 p-4 rounded-lg transition-colors",
        isUserMessage && "bg-primary/10 ml-12 border border-primary/20",
        isAgentMessage && "bg-muted mr-12 border border-muted-foreground/20",
        isError && "bg-destructive/10 border border-destructive/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {isUserMessage && (
          <>
            <div className="bg-primary text-primary-foreground rounded-full p-1">
              <User className="h-3 w-3" />
            </div>
            <span className="text-xs font-semibold">You</span>
          </>
        )}
        {isAgentMessage && (
          <>
            <div className="bg-muted-foreground text-background rounded-full p-1">
              <Bot className="h-3 w-3" />
            </div>
            <span className="text-xs font-semibold">Agent</span>
          </>
        )}
        {isError && (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-semibold text-destructive">Error</span>
          </>
        )}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>

      {/* Content */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto">
        {isError ? event.error : content}
      </div>
    </div>
  );
}
