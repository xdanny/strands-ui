"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { listSessions, deleteSession, deleteAllSessions } from "@/lib/sessions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarProps = {
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  currentSessionId: string | null;
};

export function Sidebar({ onNewSession, onSelectSession, currentSessionId }: SidebarProps) {
  const { sessions, setSessions } = useStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const sessions = await listSessions();
    setSessions(sessions);
  };

  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm("Delete this session?")) {
      return;
    }

    setDeletingId(sessionId);
    try {
      deleteSession(sessionId);
      loadSessions();

      if (currentSessionId === sessionId) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Failed to delete session");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = () => {
    if (!confirm(`Delete all ${sessions.length} sessions?`)) {
      return;
    }

    try {
      deleteAllSessions();
      loadSessions();
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete all sessions:", error);
      alert("Failed to delete all sessions");
    }
  };

  const handleCopySessionId = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedId(sessionId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy session ID:", error);
    }
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b space-y-2">
        <Button onClick={onNewSession} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
        {sessions.length > 0 && (
          <Button
            onClick={handleClearAll}
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All ({sessions.length})
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className={cn(
                "relative group rounded-lg mb-2 transition-colors",
                "hover:bg-accent",
                currentSessionId === session.session_id && "bg-accent"
              )}
            >
              <button
                onClick={() => onSelectSession(session.session_id)}
                className="w-full text-left p-3"
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      Session
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {session.session_id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleString()}
                    </div>
                    {session.message_count !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {session.message_count} events
                      </div>
                    )}
                  </div>
                </div>
              </button>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleCopySessionId(session.session_id, e)}
                  className={cn(
                    "p-1.5 rounded-md",
                    "hover:bg-muted",
                    copiedId === session.session_id && "bg-green-500/10"
                  )}
                  title="Copy session ID"
                >
                  {copiedId === session.session_id ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={(e) => handleDeleteSession(session.session_id, e)}
                  disabled={deletingId === session.session_id}
                  className={cn(
                    "p-1.5 rounded-md",
                    "hover:bg-destructive hover:text-destructive-foreground",
                    "disabled:opacity-50"
                  )}
                  title="Delete session"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center text-sm text-muted-foreground p-4">
              No sessions yet. Create one to get started!
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
