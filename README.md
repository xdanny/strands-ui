# Strands UI

A modern web interface for [Strands Agents](https://strandsagents.com), providing real-time visualization of agent interactions, tool calls, thinking processes, and conversation history.

## Features

- **Real-time Agent Visualization**: See your agent's thinking, tool calls, and responses in real-time
- **Markdown Rendering**: Full markdown support with syntax highlighting for code blocks
- **Session Persistence**: All agent conversations are saved to disk and persist across restarts
- **Simple Integration**: Just add `UIHooks` to your agent - one line of code
- **One Command Startup**: Run everything from root with `npm start`
- **Standalone Hook**: Copy `ui_hooks.py` to your project and go
- **Tool Call Visualization**: Rich display of tool executions with inputs and outputs
- **Thinking Indicators**: Visual feedback when the agent is processing
- **Modern UI**: Clean, responsive interface built with Next.js 14 and Tailwind CSS

## Architecture

Your agent runs independently and connects directly to the UI:

```
┌──────────────┐              ┌──────────────┐
│ Your Agent   │              │   Frontend   │
│              │              │              │
│  + UIHooks   │  WebSocket   │  Next.js UI  │
│              │ ◄──────────► │  + WS Server │
└──────────────┘              └──────────────┘
```

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/strands-ui
cd strands-ui
npm install
```

### 2. Start Everything

From the project root, run:

```bash
npm start
```

This single command starts all three components:
- **WebSocket Server** (port 8000) - Relays events between agent and UI
- **Next.js Frontend** (port 3000) - The web interface
- **Agent Server** (port 8001) - FastAPI server wrapping your agent

### 3. Use the UI

1. Open `http://localhost:3000`
2. Click "Create Session"
3. Type your message and press Enter
4. Watch the agent respond in real-time with full markdown rendering!

That's it! All conversations are automatically saved to `strands_sessions/` and persist across restarts.

## How It Works

The system has three components:

1. **Frontend UI** (`frontend/`) - Creates sessions, sends messages, displays responses
2. **WebSocket Server** (`frontend/server.js`) - Relays events between agent and UI
3. **Agent Server** (`agent_server.py`) - HTTP wrapper around your Strands agent

**Your Agent** (`my_agent.py`):
- Define your tools, model, and system prompt
- Keep your agent logic separate and reusable
- Can be used with or without UI

**Flow**:
1. User creates session in UI → generates session ID
2. User types message → sent to agent server via HTTP POST `/chat`
3. Agent server imports your agent and adds UIHooks
4. Agent processes with UIHooks → streams events to WebSocket server
5. WebSocket server → broadcasts events to UI
6. UI updates in real-time

## Using with Your Own Agent

The key pattern is: **Your agent stays separate, UI is just added via hooks**

### Step 1: Create Your Agent

```python
# my_agent.py
from strands import Agent, tool

@tool
def my_tool(arg: str) -> str:
    """Your tool

    Args:
        arg: Description of argument
    """
    return result

def create_my_agent(session_id=None, ui_hooks=None):
    """Create your agent with optional session persistence and UI hooks"""
    hooks = [ui_hooks] if ui_hooks else []

    return Agent(
        model=your_model,
        session_id=session_id,  # Enables persistence to strands_sessions/
        tools=[my_tool],
        hooks=hooks,
        system_prompt="Your prompt"
    )
```

### Step 2: Agent Server is Ready

`agent_server.py` already imports from `my_agent.py`:

```python
# agent_server.py (already configured!)
from my_agent import create_my_agent
from ui_hooks import UIHooks

@app.post("/chat")
async def chat(request: ChatRequest):
    agent = create_my_agent(
        session_id=request.session_id,  # Enables persistence
        ui_hooks=UIHooks(request.session_id, "ws://localhost:8000")
    )
    response = agent(request.message)
    return ChatResponse(...)
```

### Step 3: Run Everything

From the project root:

```bash
# Start all services (WebSocket + Frontend + Agent Server)
npm start

# Or test your agent without UI
uv run my_agent.py "Your question"
```

**That's it!** Just edit `my_agent.py` with your tools and configuration. All sessions are automatically persisted to `strands_sessions/` and can be reviewed even after restarting the servers.

## Session Persistence

All agent conversations are automatically saved to the `strands_sessions/` directory:

```
strands_sessions/
└── session_<uuid>/
    ├── session.json           # Session metadata
    └── agents/
        └── agent_default/
            └── messages/       # All conversation messages
                ├── message_0.json
                ├── message_1.json
                └── ...
```

**Benefits:**
- ✅ Conversations persist across server restarts
- ✅ Agent maintains full context from previous messages
- ✅ Review any session's complete history
- ✅ Sessions automatically resume when agent is recreated with same session_id

**API Endpoints:**
- `GET /sessions` - List all saved sessions
- `GET /sessions/{session_id}/messages` - Get all messages for a session

**Example:**
```bash
# List all sessions
curl http://localhost:8001/sessions

# Get messages from a specific session
curl http://localhost:8001/sessions/<session-id>/messages
```

## Installation Details

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+ with uv
- Local model server (Ollama, LM Studio, or OpenAI-compatible endpoint)

### UI Setup

```bash
# From project root
npm install
```

This installs all frontend dependencies.

### Python Dependencies

For `ui_hooks.py`:

```bash
uv pip install websockets
```

Or add to your `pyproject.toml`:

```toml
dependencies = [
    "websockets>=12.0",
]
```

## Usage

### Adding UI Hooks to Your Agent

```python
import uuid
from strands import Agent
from ui_hooks import UIHooks

# Generate unique session ID
session_id = str(uuid.uuid4())

# Create agent with hooks
agent = Agent(
    model=your_model,
    tools=your_tools,
    hooks=[UIHooks(
        session_id=session_id,
        websocket_url="ws://localhost:8000"
    )]
)

# Use agent normally
response = agent("Your query")
```

### Running the Application

**Recommended: Start everything together (from project root)**
```bash
npm start
```

This starts:
- WebSocket server (port 8000)
- Next.js frontend (port 3000)
- Agent server (port 8001)

**Advanced: Start services separately**
```bash
# Terminal 1: WebSocket server
npm run ws

# Terminal 2: Next.js UI
npm run dev:frontend

# Terminal 3: Agent server
npm run dev:backend
```

### Viewing Agent Activity

1. Open `http://localhost:3000` in your browser
2. Run your agent with UIHooks
3. See real-time visualization of:
   - User messages
   - Agent responses
   - Tool calls with inputs/outputs
   - Thinking indicators
   - Errors

## Project Structure

```
strands-ui/
├── package.json             # Root package - npm start runs everything
├── agent_server.py          # FastAPI server with session endpoints
├── my_agent.py              # Your agent configuration
├── ui_hooks.py              # Standalone hook provider (copy this!)
├── example-agent.py         # Example agent with UI integration
│
├── strands_sessions/        # Persistent session storage (auto-created)
│   └── session_<uuid>/
│       ├── session.json
│       └── agents/agent_default/messages/
│
└── frontend/
    ├── server.js            # WebSocket relay server
    ├── package.json         # Includes markdown, ws, concurrently
    ├── app/
    │   ├── page.tsx         # Main chat interface
    │   ├── layout.tsx       # Includes highlight.js styles
    │   └── globals.css      # Styles
    ├── components/
    │   ├── ChatMessage.tsx      # Message display with markdown rendering
    │   ├── ChatInput.tsx        # Input component
    │   ├── ToolCallDisplay.tsx  # Tool visualization
    │   └── ThinkingDisplay.tsx  # Thinking indicator
    └── lib/
        ├── websocket.ts     # WebSocket client
        └── store.ts         # State management
```

## How It Works

### UIHooks

The `ui_hooks.py` file is a Strands `HookProvider` that:
1. Captures agent events (tool calls, messages, thinking states)
2. Connects to the WebSocket server
3. Streams events in real-time
4. Requires only `websockets` package

### WebSocket Server

The `frontend/server.js` Node.js server:
1. Accepts connections from agents and frontend clients
2. Routes events between agent and UI
3. Manages multiple sessions simultaneously
4. Lightweight (~70 lines of code)

### Frontend

The Next.js UI:
1. Connects to WebSocket server
2. Receives and renders events
3. Displays tool calls, messages, and thinking states
4. No API calls needed - pure WebSocket streaming

## Configuration

### Change WebSocket Port

**frontend/server.js**:
```javascript
const PORT = 8000;  // Change this
```

**ui_hooks.py usage**:
```python
UIHooks(session_id="...", websocket_url="ws://localhost:YOUR_PORT")
```

### Change Model

Edit your agent configuration (or see `example-agent.py`):

```python
# For Ollama
model = OpenAIModel(
    client_args={"base_url": "http://localhost:11434/v1", "api_key": "not-needed"},
    model_id="openai/gpt-oss-20b"
)

# For OpenAI
model = OpenAIModel(
    client_args={"api_key": os.getenv("OPENAI_API_KEY")},
    model_id="gpt-4"
)

# For Anthropic
from strands.models.anthropic import AnthropicModel
model = AnthropicModel(
    client_args={"api_key": os.getenv("ANTHROPIC_API_KEY")},
    model_id="claude-3-5-sonnet-20241022"
)
```

## Troubleshooting

### WebSocket connection fails

- Ensure `frontend/server.js` is running: `npm run ws`
- Check the port is 8000: `lsof -i :8000`
- Verify URL in `UIHooks`: `ws://localhost:8000`

### Events not showing in UI

- Open browser console for errors
- Check WebSocket connection status
- Verify session ID matches between agent and UI
- Ensure `websockets` package is installed: `uv pip install websockets`

### Frontend won't start

- Ensure Node.js 18+: `node --version`
- Install dependencies: `cd frontend && npm install`
- Check for port conflicts (3000, 8000)

## Deploying

### Deploy Frontend

Deploy to Vercel, Netlify, or any Node.js host. The WebSocket server and Next.js app can run together:

```bash
npm run start:all
```

### Run Agent Anywhere

Your agent can run anywhere - local machine, server, container. Just point UIHooks to your deployed WebSocket URL:

```python
hooks=[UIHooks(
    session_id=session_id,
    websocket_url="wss://your-domain.com"  # Use wss:// for secure connection
)]
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Acknowledgments

Built with [Strands Agents](https://strandsagents.com) - A modern Python framework for building AI agents.
