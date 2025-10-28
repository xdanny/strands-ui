/**
 * Local session management
 *
 * Sessions are managed in the frontend using localStorage.
 * Each session tracks its ID, creation time, and event history.
 */

export interface Session {
  session_id: string;
  created_at: string;
  message_count: number;
}

const SESSIONS_KEY = 'strands_ui_sessions';
const EVENTS_KEY_PREFIX = 'strands_ui_events_';

export function createSession(): Session {
  const session: Session = {
    session_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    message_count: 0,
  };

  // Add to sessions list
  const sessions = listSessions();
  sessions.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

  // Initialize empty events array
  localStorage.setItem(EVENTS_KEY_PREFIX + session.session_id, JSON.stringify([]));

  return session;
}

export function listSessions(): Session[] {
  const data = localStorage.getItem(SESSIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getSession(sessionId: string): Session | null {
  const sessions = listSessions();
  return sessions.find(s => s.session_id === sessionId) || null;
}

export function deleteSession(sessionId: string): void {
  // Remove from sessions list
  const sessions = listSessions();
  const filtered = sessions.filter(s => s.session_id !== sessionId);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));

  // Remove events
  localStorage.removeItem(EVENTS_KEY_PREFIX + sessionId);
}

export function deleteAllSessions(): void {
  const sessions = listSessions();

  // Remove all events
  sessions.forEach(session => {
    localStorage.removeItem(EVENTS_KEY_PREFIX + session.session_id);
  });

  // Clear sessions list
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([]));
}

export function getSessionEvents(sessionId: string): any[] {
  const data = localStorage.getItem(EVENTS_KEY_PREFIX + sessionId);
  return data ? JSON.parse(data) : [];
}

export function addSessionEvent(sessionId: string, event: any): void {
  const events = getSessionEvents(sessionId);
  events.push(event);
  localStorage.setItem(EVENTS_KEY_PREFIX + sessionId, JSON.stringify(events));

  // Update message count
  const sessions = listSessions();
  const session = sessions.find(s => s.session_id === sessionId);
  if (session) {
    session.message_count = events.length;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }
}
