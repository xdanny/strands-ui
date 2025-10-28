# Testing Guide

## Quick Test Flow

### Terminal 1: Start UI + WebSocket Server
```bash
cd frontend
npm install  # First time only
npm run start:all
```

**Expected output**:
- WebSocket server starts on port 8000
- Next.js starts on port 3000
- Both servers running concurrently

### Terminal 2: Start Agent Server
```bash
uv run agent_server.py
```

**Expected output**:
```
🤖 Starting Strands Agent Server...
📡 Agent will connect to UI at ws://localhost:8000
🌐 Server running on http://localhost:8001

INFO:     Uvicorn running on http://0.0.0.0:8001
```

### Terminal 3: Test Agent Without UI (Optional)
```bash
uv run my_agent.py "What is the weather in Tokyo?"
```

**Expected output**:
```
🤖 Query: What is the weather in Tokyo?
💭 Thinking...

✅ Response:
Weather in Tokyo: Sunny, 72°F (22°C)
```

### Browser: Test Full Flow

1. Open `http://localhost:3000`
2. Click "Create Session"
3. You should see:
   - Session ID displayed in header
   - "Session created! Send a message to start."
   - Chat input at the bottom

4. Type a message: "What's the weather in Paris?"
5. Press Enter

**Expected UI behavior**:
- Message appears as user message
- Thinking indicator shows
- Tool call card appears: "get_weather"
- Tool result shows
- Agent response appears

**Expected Terminal 2 output**:
```
[Agent Server] Received message for session <uuid>
[Agent Server] Message: What's the weather in Paris?...
[UI Hooks] Connected to WebSocket server: ws://localhost:8000/ws/<uuid>
[UI Hook] Sending event: thinking_start
[UI Hook] Sending event: tool_call_start
[UI Hook] Sending event: tool_call_end
[UI Hook] Sending event: message
[Agent Server] Response generated for session <uuid>
```

## Test Cases

### Test 1: Weather Tool
```
User: "What's the weather in London?"
Expected: Tool call visible, response with weather
```

### Test 2: Calculator Tool
```
User: "Calculate 15 * 23"
Expected: Tool call to calculate(), result "15 * 23 = 345"
```

### Test 3: Search Tool
```
User: "Search docs for API authentication"
Expected: Tool call to search_docs(), documentation results
```

### Test 4: Multi-turn Conversation
```
User: "What's the weather in Tokyo?"
Agent: <responds>
User: "And what about Paris?"
Expected: Both messages visible, context maintained
```

### Test 5: Session Persistence
1. Send messages
2. Reload browser page
3. Select same session from sidebar
Expected: All previous messages still visible

## Common Issues

### Issue: "Failed to send message to agent"
- Check agent server is running on port 8001
- Check CORS configuration in agent_server.py

### Issue: "WebSocket not connected"
- Check frontend/server.js is running on port 8000
- Check browser console for WebSocket errors

### Issue: "Module not found: strands"
- Run: `uv pip install strands-agents-builder`

### Issue: "Module not found: websockets"
- Run: `uv pip install websockets`

### Issue: Events not showing in UI
- Check Terminal 2 for UIHooks connection messages
- Open browser DevTools → Network → WS tab
- Verify WebSocket connection is established

## Success Criteria

✅ All three terminals running without errors
✅ Browser shows UI with session
✅ Messages can be sent and received
✅ Tool calls visible with inputs/outputs
✅ Thinking indicators appear during processing
✅ Session persists after page reload
