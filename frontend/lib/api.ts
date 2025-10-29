// Agent Server API (port 8001) - for session persistence
const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8001';

// WebSocket Server API (port 8000) - legacy, may not be used
const WS_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetch all sessions from the backend (strands_sessions directory)
 */
export async function fetchSessions() {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions`);

  if (!response.ok) {
    throw new Error('Failed to fetch sessions from backend');
  }

  const data = await response.json();
  return data.sessions || [];
}

/**
 * Fetch all messages for a specific session from the backend
 */
export async function fetchSessionMessages(sessionId: string) {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions/${sessionId}/messages`);

  if (!response.ok) {
    if (response.status === 404) {
      return []; // Session not found, return empty
    }
    throw new Error('Failed to fetch session messages');
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * Send a message to the agent
 */
export async function sendMessageToAgent(sessionId: string, message: string) {
  const response = await fetch(`${AGENT_API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      message: message,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message to agent');
  }

  return response.json();
}

// Legacy WebSocket Server API functions (kept for backwards compatibility)
export async function createSession(command: string = 'strands', args?: string[]) {
  const response = await fetch(`${WS_API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command, args }),
  });

  if (!response.ok) {
    throw new Error('Failed to create session');
  }

  return response.json();
}

export async function listSessions() {
  const response = await fetch(`${WS_API_BASE_URL}/api/sessions`);

  if (!response.ok) {
    throw new Error('Failed to list sessions');
  }

  return response.json();
}

export async function getSession(sessionId: string) {
  const response = await fetch(`${WS_API_BASE_URL}/api/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error('Failed to get session');
  }

  return response.json();
}

export async function stopSession(sessionId: string) {
  const response = await fetch(`${WS_API_BASE_URL}/api/sessions/${sessionId}/stop`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to stop session');
  }

  return response.json();
}

export async function resumeSession(sessionId: string) {
  const response = await fetch(`${WS_API_BASE_URL}/api/sessions/${sessionId}/resume`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to resume session');
  }

  return response.json();
}

export async function deleteSession(sessionId: string) {
  const response = await fetch(`${WS_API_BASE_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }

  return response.json();
}

export async function deleteAllSessions() {
  const response = await fetch(`${WS_API_BASE_URL}/api/sessions`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete all sessions');
  }

  return response.json();
}
