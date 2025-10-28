# Strands UI - Hooks-Based Architecture

## Overview

This project provides a web-based UI for Strands agents using the built-in hooks system for rich visibility into agent operations.

## Architecture

```
Browser (React/Next.js)
    ↓ WebSocket
FastAPI Backend
    ↓ UI Hooks
Strands Agent
    ↓ Structured Events
```

### Key Components

#### Backend

**`backend/ui_hooks.py`** - Hook Provider
- Implements `HookProvider` interface from Strands
- Captures all agent lifecycle events:
  - Tool calls (before/after with inputs/outputs)
  - Model calls (thinking/reasoning)
  - Messages added to conversation
  - Errors and exceptions
- Streams structured events to WebSocket clients

**`backend/agent_session.py`** - Session Manager
- Manages Strands Agent instances (not subprocesses)
- Attaches UI hooks to each agent
- Handles WebSocket connections per session
- Persists conversation history
- Supports multiple concurrent sessions

**`backend/main.py`** - FastAPI Application
- REST API for session management
- WebSocket endpoint for real-time events
- No subprocess spawning or text parsing

#### Frontend

**Event Types** (`frontend/lib/websocket.ts`)
```typescript
type WSEventType =
  | "session_start" | "session_end"
  | "user_input" | "message"
  | "thinking_start" | "thinking_end"
  | "tool_call_start" | "tool_call_end"
  | "error" | "agent_initialized"
  | "invocation_start" | "invocation_end"
  | "interrupt";
```

**Components**
- `ChatMessage.tsx` - User/assistant messages
- `ToolCallDisplay.tsx` - Rich tool call visualization
- `ThinkingDisplay.tsx` - Agent thinking indicator
- `page.tsx` - Main UI with clean event rendering

## Features

### 1. Tool Call Visibility
See all MCP tool calls with:
- Tool name and inputs
- Execution status (pending/success/error)
- Results or error messages
- Visual status indicators

### 2. Thinking Logs
Real-time indication when agent is:
- Invoking the model
- Processing responses
- Planning next actions

### 3. Clean Message Display
- User messages styled distinctly
- Agent responses clearly labeled
- Error messages highlighted
- No debug/system clutter

### 4. Session Management
- Create multiple sessions
- Switch between active sessions
- View conversation history
- Delete individual or all sessions

## Hooks Used

From `strands.hooks.events`:

1. **AgentInitializedEvent** - Agent setup complete
2. **BeforeInvocationEvent** - Request starting
3. **AfterInvocationEvent** - Request completed
4. **MessageAddedEvent** - Message added to history
5. **BeforeToolCallEvent** - Tool about to execute
6. **AfterToolCallEvent** - Tool execution complete
7. **BeforeModelCallEvent** - Model call starting
8. **AfterModelCallEvent** - Model response received

## Running the Application

### Backend

```bash
# Install dependencies
uv sync

# Run backend (from project root)
uv run python backend/main.py

# Or use start script
./start-backend.sh  # Linux/Mac
./start-backend.ps1  # Windows
```

Backend runs on: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

### Configuration

Default model configuration (in `agent_session.py`):
```python
{
    "base_url": "http://localhost:11434/v1",  # Ollama endpoint
    "api_key": "not-needed",
    "model_id": "openai/gpt-oss-20b",
    "temperature": 0.7,
    "max_tokens": 2000,
}
```

To use a different model, modify `agent_session.py` or pass `model_config` when creating a session.

## API Endpoints

### REST API

- `POST /api/sessions` - Create new session
  - Body: `{"model_config": {...}}` (optional)
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/{id}` - Get session details
- `POST /api/sessions/{id}/input` - Send input
  - Body: `{"content": "message"}`
- `POST /api/sessions/{id}/stop` - Stop session
- `DELETE /api/sessions/{id}` - Delete session
- `DELETE /api/sessions` - Delete all sessions

### WebSocket

- `WS /ws/{session_id}` - Real-time event stream
  - Sends all hook events as JSON
  - Receives `{"type": "input", "content": "..."}` messages

## Event Flow Example

1. User sends message "hello"
   ```json
   {"type": "user_input", "data": {"content": "hello"}, ...}
   ```

2. Agent starts processing
   ```json
   {"type": "invocation_start", ...}
   {"type": "thinking_start", ...}
   ```

3. Model responds
   ```json
   {"type": "thinking_end", "content": "...", ...}
   {"type": "message", "role": "assistant", "content": "Hi there!", ...}
   ```

4. Agent invokes tool (if needed)
   ```json
   {"type": "tool_call_start", "tool_name": "calculator", "tool_input": {...}, ...}
   {"type": "tool_call_end", "tool_id": "...", "result": "42", ...}
   ```

5. Agent completes
   ```json
   {"type": "invocation_end", ...}
   ```

## Benefits Over Subprocess Approach

### Before (Subprocess Wrapper)
- ❌ Parse stdout/stderr text
- ❌ No structured data
- ❌ Fragile string matching
- ❌ No tool call visibility
- ❌ No thinking logs
- ❌ Complex filtering logic

### After (Hooks-Based)
- ✅ Structured events from source
- ✅ Rich metadata (inputs/outputs/timing)
- ✅ Type-safe event handling
- ✅ Full tool call visibility
- ✅ Real-time thinking indicators
- ✅ Clean, simple rendering

## Future Enhancements

### Plan Mode with Interrupts
Use `event.interrupt()` in hooks to implement approval workflows:
```python
def on_before_tool_call(self, event: BeforeToolCallEvent):
    if event.tool_use["name"] in DANGEROUS_TOOLS:
        approval = event.interrupt("plan_approval", reason="APPROVAL")
        if approval != "approved":
            event.cancel_tool = "User rejected plan"
```

### Enhanced Tool Visualization
- Execution time tracking
- Tool dependency graphs
- Tool output previews
- Retry mechanisms

### Agent Configuration UI
- Model selection
- Temperature/parameter tuning
- System prompt customization
- Tool enable/disable

## Troubleshooting

### Backend won't start
- Check if port 8000 is available
- Verify Strands is installed: `uv run python -c "import strands"`
- Check logs for missing dependencies

### Frontend shows connection error
- Ensure backend is running on port 8000
- Check CORS settings in `backend/main.py`
- Verify WebSocket URL in frontend

### No model responses
- Check if Ollama is running: `curl http://localhost:11434/v1/models`
- Verify model is downloaded
- Check backend logs for API errors

### Tool calls not showing
- Verify agent has tools configured
- Check `ui_hooks.py` is attached to agent
- Look for tool events in browser console

## File Structure

```
strands-ui/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── agent_session.py     # Agent session manager
│   ├── ui_hooks.py          # Hook provider
│   └── cli_manager.py.old   # Old subprocess code (backup)
├── frontend/
│   ├── app/
│   │   └── page.tsx         # Main UI
│   ├── components/
│   │   ├── ChatMessage.tsx
│   │   ├── ToolCallDisplay.tsx
│   │   ├── ThinkingDisplay.tsx
│   │   ├── ChatInput.tsx
│   │   └── Sidebar.tsx
│   └── lib/
│       ├── websocket.ts     # WebSocket client
│       ├── api.ts           # REST API client
│       └── store.ts         # State management
└── sessions/                # Session storage
```

## Credits

Built with:
- [Strands](https://github.com/anthropics/strands) - Agent framework
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [Next.js](https://nextjs.org/) - Frontend framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
