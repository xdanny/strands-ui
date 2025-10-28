/**
 * WebSocket Server for Strands UI
 *
 * Simple WebSocket relay server that receives events from Strands agents
 * and broadcasts them to connected frontend clients.
 *
 * Usage:
 *   node server.js
 */

const WebSocket = require('ws');

const PORT = 8000;
const wss = new WebSocket.Server({ port: PORT });

// Store connections per session: sessionId -> Set<WebSocket>
const sessions = new Map();

wss.on('connection', (ws, req) => {
  // Extract session ID from URL: /ws/{session_id}
  const match = req.url.match(/\/ws\/([^/]+)/);
  if (!match) {
    console.log('[WebSocket] Connection rejected - no session ID in URL');
    ws.close(1008, 'Session ID required in URL: /ws/{session_id}');
    return;
  }

  const sessionId = match[1];
  console.log(`[WebSocket] New connection for session ${sessionId}`);

  // Add to session connections
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new Set());
  }
  sessions.get(sessionId).add(ws);

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data);
      console.log(`[WebSocket] Received ${event.type} for session ${sessionId}`);

      // Broadcast to all connections in this session (except sender)
      const sessionConnections = sessions.get(sessionId);
      if (sessionConnections) {
        sessionConnections.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Connection closed for session ${sessionId}`);

    // Remove from session
    const sessionConnections = sessions.get(sessionId);
    if (sessionConnections) {
      sessionConnections.delete(ws);

      // Clean up empty sessions
      if (sessionConnections.size === 0) {
        sessions.delete(sessionId);
        console.log(`[WebSocket] Session ${sessionId} has no more connections`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`[WebSocket] Error for session ${sessionId}:`, error);
  });
});

console.log(`✅ Strands UI WebSocket server running on ws://localhost:${PORT}`);
console.log(`📊 Agents connect to: ws://localhost:${PORT}/ws/{session_id}`);
console.log(`🌐 Frontend connects to receive events\n`);
