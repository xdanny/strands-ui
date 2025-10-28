const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function createSession(command: string = 'strands', args?: string[]) {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
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
  const response = await fetch(`${API_BASE_URL}/api/sessions`);

  if (!response.ok) {
    throw new Error('Failed to list sessions');
  }

  return response.json();
}

export async function getSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error('Failed to get session');
  }

  return response.json();
}

export async function stopSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/stop`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to stop session');
  }

  return response.json();
}

export async function resumeSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/resume`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to resume session');
  }

  return response.json();
}

export async function deleteSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }

  return response.json();
}

export async function deleteAllSessions() {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete all sessions');
  }

  return response.json();
}
