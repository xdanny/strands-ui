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
import { createSession, getSession, stopSession, resumeSession } from "@/lib/api";
import { StrandsWebSocket, WSEvent } from "@/lib/websocket";
import { AlertCircle, Loader2, XCircle } from "lucide-react";

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
    sessions,
    setSessions
  } = useStore();

  const [ws, setWs] = useState<StrandsWebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
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

  const handleNewSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Disconnect existing WebSocket if any
      if (ws) {
        ws.close();
      }

      // Create new session
      const data = await createSession();
      setCurrentSession(data.session_id);

      // Connect WebSocket
      const newWs = new StrandsWebSocket(data.session_id);
      newWs.on((event) => {
        addEvent(event);
      });

      await newWs.connect();
      setWs(newWs);
      setConnected(true);

      // Refresh sessions list
      const { sessions: updatedSessions } = await import("@/lib/api").then(m => m.listSessions());
      setSessions(updatedSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      console.error("Error creating session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    clearEvents();

    try {
      // Disconnect existing WebSocket
      if (ws) {
        ws.close();
      }

      // Load session data
      const sessionData = await getSession(sessionId);
      setCurrentSession(sessionId);
      setEvents(sessionData.transcript || []);

      // If session is not running, resume it to restore conversation context
      if (!sessionData.is_running) {
        await resumeSession(sessionId);
      }

      // Connect WebSocket
      const newWs = new StrandsWebSocket(sessionId);
      newWs.on((event) => {
        addEvent(event);
      });

      await newWs.connect();
      setWs(newWs);
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
      console.error("Error loading session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (message: string) => {
    if (ws && isConnected) {
      ws.sendInput(message);
    }
  };

  const handleStopSession = async () => {
    if (!currentSessionId) return;

    try {
      await stopSession(currentSessionId);
      if (ws) {
        ws.close();
        setWs(null);
      }
      setConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop session");
      console.error("Error stopping session:", err);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        currentSessionId={currentSessionId}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Strands UI</h1>
            {currentSessionId && (
              <p className="text-sm text-muted-foreground">
                Session: {currentSessionId.slice(0, 8)}...
                {isConnected && <span className="ml-2 text-green-600">● Connected</span>}
                {!isConnected && currentSessionId && <span className="ml-2 text-gray-600">● Disconnected</span>}
              </p>
            )}
          </div>
          {currentSessionId && isConnected && (
            <Button variant="destructive" size="sm" onClick={handleStopSession}>
              <XCircle className="h-4 w-4 mr-2" />
              Stop Session
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!currentSessionId && !isLoading && (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Welcome to Strands UI</h2>
                <p className="text-muted-foreground mb-6">
                  Create a new session or select an existing one to get started
                </p>
                <Button onClick={handleNewSession}>
                  Create New Session
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="m-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          )}

          {currentSessionId && !isLoading && (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="max-w-4xl mx-auto">
                  {events.length === 0 && (
                    <div className="text-center text-muted-foreground p-8">
                      Session started. Send a message to begin.
                    </div>
                  )}

                  {/* Render events with proper components */}
                  {events.map((event, index) => {
                    const key = `${event.type}-${event.timestamp}-${index}`;

                    // Tool calls - pair start and end events
                    if (event.type === "tool_call_start") {
                      // Find matching end event
                      const endEvent = events.find(
                        (e, i) => i > index && e.type === "tool_call_end" && e.tool_id === event.tool_id
                      );
                      return <ToolCallDisplay key={key} startEvent={event} endEvent={endEvent} />;
                    }

                    // Skip tool_call_end events (they're rendered with start)
                    if (event.type === "tool_call_end") {
                      return null;
                    }

                    // Skip system events
                    if (event.type === "session_start" || event.type === "session_end" ||
                        event.type === "agent_initialized" || event.type === "invocation_start" ||
                        event.type === "invocation_end" || event.type === "thinking_start" ||
                        event.type === "thinking_end") {
                      return null;
                    }

                    // Render regular messages (user input, assistant messages, errors)
                    return <ChatMessage key={key} event={event} />;
                  })}

                  {/* Show thinking indicator */}
                  <ThinkingDisplay isActive={isThinking} />

                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="max-w-4xl mx-auto">
                  <ChatInput
                    onSend={handleSendMessage}
                    disabled={!isConnected}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
