import { WSEvent } from "@/lib/websocket";
import { cn } from "@/lib/utils";
import { User, Bot, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

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
      <div className="text-sm leading-relaxed overflow-x-auto prose prose-sm dark:prose-invert max-w-none">
        {isError ? (
          <div className="whitespace-pre-wrap">{event.error}</div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            components={{
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                return !inline ? (
                  <code className={className} {...props}>
                    {children}
                  </code>
                ) : (
                  <code
                    className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ node, children, ...props }) => (
                <pre
                  className="bg-muted p-3 rounded-md overflow-x-auto my-2"
                  {...props}
                >
                  {children}
                </pre>
              ),
              p: ({ node, children, ...props }) => (
                <p className="mb-2 last:mb-0" {...props}>
                  {children}
                </p>
              ),
              ul: ({ node, children, ...props }) => (
                <ul className="list-disc list-inside mb-2" {...props}>
                  {children}
                </ul>
              ),
              ol: ({ node, children, ...props }) => (
                <ol className="list-decimal list-inside mb-2" {...props}>
                  {children}
                </ol>
              ),
              li: ({ node, children, ...props }) => (
                <li className="mb-1" {...props}>
                  {children}
                </li>
              ),
              a: ({ node, children, ...props }) => (
                <a
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {children}
                </a>
              ),
              blockquote: ({ node, children, ...props }) => (
                <blockquote
                  className="border-l-4 border-primary/30 pl-4 italic my-2"
                  {...props}
                >
                  {children}
                </blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
