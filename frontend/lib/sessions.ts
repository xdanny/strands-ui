/**
 * Session management with backend persistence
 *
 * Sessions are now fetched from the backend (agent_server.py on port 8001)
 * which reads from the strands_sessions/ directory. localStorage is used
 * as a cache for WebSocket events during active sessions.
 */

import { fetchSessions, fetchSessionMessages } from './api';

export interface Session {
  session_id: string;
  created_at: string;
  updated_at?: string;
  message_count: number;
}

const EVENTS_KEY_PREFIX = 'strands_ui_events_';

/**
 * Create a new session (generates UUID, doesn't save to backend yet)
 * Session will be created in backend when first message is sent
 */
export function createSession(): Session {
  const session: Session = {
    session_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    message_count: 0,
  };

  // Initialize empty events array in localStorage cache
  localStorage.setItem(EVENTS_KEY_PREFIX + session.session_id, JSON.stringify([]));

  return session;
}

/**
 * List all sessions from the backend
 * Falls back to empty array if backend is unavailable
 */
export async function listSessions(): Promise<Session[]> {
  try {
    const sessions = await fetchSessions();
    return sessions;
  } catch (error) {
    console.error('Failed to fetch sessions from backend:', error);
    // Fallback: return empty array if backend unavailable
    return [];
  }
}

/**
 * Get a specific session from the backend
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const sessions = await listSessions();
    return sessions.find(s => s.session_id === sessionId) || null;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Delete session (currently no backend endpoint, only clears localStorage cache)
 * TODO: Add delete endpoint to backend
 */
export function deleteSession(sessionId: string): void {
  // Remove events from localStorage cache
  localStorage.removeItem(EVENTS_KEY_PREFIX + sessionId);
}

/**
 * Delete all sessions (currently only clears localStorage cache)
 * TODO: Add delete all endpoint to backend
 */
export function deleteAllSessions(): void {
  // Clear all event caches
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(EVENTS_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Get session events - tries backend first, falls back to localStorage cache
 */
export async function getSessionEvents(sessionId: string): Promise<any[]> {
  try {
    // Try to fetch from backend first
    const messages = await fetchSessionMessages(sessionId);

    if (messages && messages.length > 0) {
      // Convert backend messages to event format
      const events = messages.map((msg: any) => ({
        type: msg.role === 'user' ? 'user_input' : 'message',
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        session_id: sessionId,
      }));
      return events;
    }
  } catch (error) {
    console.log('No backend messages, using localStorage cache:', error);
  }

  // Fallback to localStorage cache
  const data = localStorage.getItem(EVENTS_KEY_PREFIX + sessionId);
  return data ? JSON.parse(data) : [];
}

/**
 * Add event to localStorage cache (for real-time WebSocket events)
 */
export function addSessionEvent(sessionId: string, event: any): void {
  const data = localStorage.getItem(EVENTS_KEY_PREFIX + sessionId);
  const events = data ? JSON.parse(data) : [];
  events.push(event);
  localStorage.setItem(EVENTS_KEY_PREFIX + sessionId, JSON.stringify(events));
}
