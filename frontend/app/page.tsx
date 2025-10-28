"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ToolCallDisplay } from "@/components/ToolCallDisplay";
import { ThinkingDisplay } from "@/components/ThinkingDisplay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { createSession, getSessionEvents, addSessionEvent, listSessions } from "@/lib/sessions";
import { StrandsWebSocket, WSEvent } from "@/lib/websocket";
import { AlertCircle, Copy, Check } from "lucide-react";

export default function Home() {
  const {
    currentSessionId,
    events,
    isConnected,
    setCurrentSession,
    addEvent,
    setConnected,
    setEvents,
    clearEvents,
  } = useStore();

  const [ws, setWs] = useState<StrandsWebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events]);

  // Track thinking state
  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (lastEvent) {
      if (lastEvent.type === "thinking_start" || lastEvent.type === "invocation_start") {
        setIsThinking(true);
      } else if (lastEvent.type === "thinking_end" || lastEvent.type === "message" || lastEvent.type === "error") {
        setIsThinking(false);
      }
    }
  }, [events]);

  const handleNewSession = () => {
    // Create new session in localStorage
    const session = createSession();

    // Update sessions list in store
    const updatedSessions = listSessions();
    useStore.getState().setSessions(updatedSessions);

    // Connect to it
    handleSelectSession(session.session_id);
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setError(null);

      // Close existing WebSocket
      if (ws) {
        ws.close();
      }

      // Load existing events from localStorage
      const existingEvents = getSessionEvents(sessionId);
      setEvents(existingEvents);

      // Set as current session
      setCurrentSession(sessionId);

      // Connect WebSocket
      const newWs = new StrandsWebSocket(sessionId);

      // Register event handler
      newWs.on((event: WSEvent) => {
        console.log("Received event:", event.type);
        addEvent(event);

        // Save to localStorage
        addSessionEvent(sessionId, event);
      });

      // Connect and handle result
      newWs.connect()
        .then(() => {
          console.log("WebSocket connected");
          setConnected(true);
        })
        .catch((error) => {
          console.error("WebSocket connection failed:", error);
          setError("Failed to connect to WebSocket server");
          setConnected(false);
        });

      setWs(newWs);

    } catch (error) {
      console.error("Failed to select session:", error);
      setError(error instanceof Error ? error.message : "Failed to select session");
    }
  };

  const handleCopySessionId = async () => {
    if (!currentSessionId) return;

    try {
      await navigator.clipboard.writeText(currentSessionId);
      setCopiedSessionId(true);
      setTimeout(() => setCopiedSessionId(false), 2000);
    } catch (error) {
      console.error("Failed to copy session ID:", error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentSessionId || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message to agent");
      }

      // Agent response will come through WebSocket hooks
      // No need to handle response here
    } catch (error) {
      console.error("Failed to send message:", error);
      setError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        currentSessionId={currentSessionId}
      />

      <main className="flex-1 flex flex-col">
        {/* Header with session ID */}
        {currentSessionId && (
          <div className="border-b px-6 py-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Current Session</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>{currentSessionId}</span>
                  <button
                    onClick={handleCopySessionId}
                    className="p-1 hover:bg-accent rounded transition-colors"
                    title="Copy session ID"
                  >
                    {copiedSessionId ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 text-sm ${isConnected ? "text-green-600" : "text-muted-foreground"}`}>
                  <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-600" : "bg-gray-400"}`} />
                  {isConnected ? "Connected" : "Waiting for agent..."}
                </div>
              </div>
            </div>
          </div>
        )}

        {!currentSessionId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <h1 className="text-2xl font-semibold">Strands UI</h1>
              <p className="text-muted-foreground">
                Create a new session to visualize your Strands agent in real-time.
              </p>
              <Button onClick={handleNewSession} size="lg">
                Create Session
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Area */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {error && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {events.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 space-y-4">
                    <p>Session created! Send a message to start.</p>
                    <p className="text-xs">
                      Make sure the agent server is running:
                    </p>
                    <code className="block bg-muted px-4 py-2 rounded font-mono text-xs">
                      uv run agent_server.py
                    </code>
                  </div>
                )}

                {events.map((event, index) => {
                  const key = `${event.type}-${event.timestamp}-${index}`;

                  // Tool calls - pair start and end events
                  if (event.type === "tool_call_start") {
                    const endEvent = events.find(
                      (e, i) => i > index && e.type === "tool_call_end" && e.tool_id === event.tool_id
                    );
                    return <ToolCallDisplay key={key} startEvent={event} endEvent={endEvent} />;
                  }

                  // Skip tool_call_end (already rendered with start)
                  if (event.type === "tool_call_end") {
                    return null;
                  }

                  // Skip system events
                  if (
                    event.type === "session_start" ||
                    event.type === "session_end" ||
                    event.type === "invocation_start" ||
                    event.type === "invocation_end" ||
                    event.type === "thinking_start" ||
                    event.type === "thinking_end" ||
                    event.type === "agent_initialized"
                  ) {
                    return null;
                  }

                  // Render message
                  return <ChatMessage key={key} event={event} />;
                })}

                <ThinkingDisplay isActive={isThinking} />

                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="border-t px-6 py-4">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={isSending || isThinking}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
