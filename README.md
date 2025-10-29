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

Strands UI is a **standalone service** that your agents connect to. Run it once, and any number of agent projects can visualize their work through it.

```
┌─────────────────┐         ┌──────────────────┐
│  Your Agent     │         │                  │
│  Project A      │────┐    │   Strands UI     │
│  + UIHooks      │    │    │  (standalone)    │
└─────────────────┘    │    │                  │
                       ├───►│  WebSocket Server│
┌─────────────────┐    │    │  + Next.js UI    │
│  Your Agent     │────┘    │                  │
│  Project B      │         │  Port 3000, 8000 │
│  + UIHooks      │         │                  │
└─────────────────┘         └──────────────────┘
```

**Key concept:** The UI is separate from your agent code. Multiple agents can connect simultaneously.

## Quick Start

### 1. Start the Standalone UI

```bash
git clone https://github.com/yourusername/strands-ui
cd strands-ui
npm install
npm start
```

This starts the standalone UI service:
- **WebSocket Server** (port 8000) - Relays events between agents and UI
- **Next.js Frontend** (port 3000) - The web interface

**Leave this running** - it's your visualization hub for any agent project.

### 2. Connect Your Agent

In your agent project (can be anywhere):

**Option A: Using the provided agent server (FastAPI wrapper)**
```bash
# Copy agent_server.py and my_agent.py to your project as templates
uv run agent_server.py
```

Then open `http://localhost:3000`, create a session, and chat!

**Option B: Direct UIHooks integration**
```python
from ui_hooks import UIHooks

agent = Agent(
    model=your_model,
    hooks=[UIHooks(session_id=session_id, websocket_url="ws://localhost:8000")]
)
```

### 3. Watch in Real-Time

1. Open `http://localhost:3000`
2. Your agent's activity appears automatically with full markdown rendering
3. All conversations are saved to `strands_sessions/` and persist across restarts

**That's it!** The UI is now a service that any of your agent projects can connect to.

## How It Works

### Core Components

**Strands UI (this repo):**
1. **Frontend UI** (`frontend/`) - Creates sessions, displays responses with markdown
2. **WebSocket Server** (`frontend/server.js`) - Relays events between agents and UI

**Your Agent Project (anywhere):**
3. **Your Agent Code** - Define tools, model, and logic
4. **UIHooks Integration** - One line to connect to the UI

### Provided Templates

This repo includes reference implementations you can copy to your projects:

- **`agent_server.py`** - FastAPI wrapper that provides HTTP `/chat` endpoint (optional)
- **`my_agent.py`** - Example agent configuration showing how to structure your agent
- **`example-agent.py`** - Standalone script showing direct UIHooks integration

**These are blueprints** - copy and adapt them to your project structure.

### Flow (with agent_server.py approach)

1. UI running standalone on ports 3000/8000
2. User creates session in UI → generates session ID
3. User types message → sent to your agent server via HTTP POST `/chat`
4. Your agent processes with UIHooks → streams events to WebSocket server
5. WebSocket server → broadcasts to all connected UI clients
6. UI updates in real-time with markdown rendering

### Flow (with direct UIHooks)

1. UI running standalone on ports 3000/8000
2. Your agent runs anywhere with UIHooks configured
3. Agent processes messages → streams events to WebSocket server
4. UI displays events in real-time

## Using with Your Own Agent Project

The key pattern is: **Your agent code lives in your project, you just add UIHooks to visualize it.**

### Method 1: Copy the Blueprint (Recommended for HTTP API)

Copy `agent_server.py` and `my_agent.py` to your project as templates:

```bash
# In your agent project
cp /path/to/strands-ui/agent_server.py .
cp /path/to/strands-ui/my_agent.py .
cp /path/to/strands-ui/ui_hooks.py .
```

Then customize `my_agent.py` with your tools and logic:

```python
# your_project/my_agent.py
from strands import Agent, tool

@tool
def your_custom_tool(arg: str) -> str:
    """Your tool logic here"""
    return result

def create_my_agent(session_id=None, ui_hooks=None):
    """Create your agent"""
    hooks = [ui_hooks] if ui_hooks else []

    return Agent(
        model=your_model,
        session_id=session_id,  # Enables persistence
        tools=[your_custom_tool],
        hooks=hooks,
        system_prompt="Your prompt"
    )
```

Run your agent server (agent_server.py already imports from my_agent.py):

```bash
# In your agent project
uv run agent_server.py
```

### Method 2: Direct Integration (Recommended for Script-based Agents)

Just add UIHooks to your existing agent:

```python
# your_existing_agent.py
from ui_hooks import UIHooks  # Copy ui_hooks.py to your project
import uuid

session_id = str(uuid.uuid4())

agent = Agent(
    model=your_model,
    session_id=session_id,
    tools=your_tools,
    hooks=[UIHooks(session_id=session_id, websocket_url="ws://localhost:8000")]
)

response = agent("Your query")
```

**That's it!** As long as Strands UI is running (`npm start` in the strands-ui repo), your agent will visualize in the UI.

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

**Start the UI (do this once, leave it running):**
```bash
# In strands-ui repo
npm start
```

This starts:
- WebSocket server (port 8000)
- Next.js frontend (port 3000)

**Start your agent(s) (in your project directories):**
```bash
# In your agent project
uv run agent_server.py

# Or run your agent script directly with UIHooks
uv run your_agent.py
```

**Multiple agents:** You can run multiple agent projects simultaneously - they'll all connect to the same UI and can be viewed in different sessions.

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
