# Strands UI

A modern web interface for [Strands Agents](https://strandsagents.com), providing real-time visualization of agent interactions, tool calls, thinking processes, and conversation history.

## Features

- **Real-time Agent Interaction**: Direct integration with Strands Agent using hooks-based architecture
- **WebSocket Streaming**: Real-time event streaming for immediate feedback
- **Session Management**: Create, resume, and manage multiple agent sessions
- **Conversation Persistence**: Automatic session history with Strands FileSessionManager
- **Tool Call Visualization**: Rich display of tool executions with inputs and outputs
- **Thinking Indicators**: Visual feedback when the agent is processing
- **Modern UI**: Clean, responsive interface built with Next.js 14 and Tailwind CSS

## Architecture

The application uses Strands' built-in hook system for event capture:

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   Browser   │ ◄────────────────────────► │    FastAPI   │
│  (Next.js)  │         REST API           │    Backend   │
└─────────────┘                            └──────┬───────┘
                                                  │
                                                  │ creates
                                                  │
                                            ┌─────▼────────┐
                                            │ Strands Agent│
                                            │  with Hooks  │
                                            └──────────────┘
```

### Key Components

**Backend**:
- `main.py` - FastAPI application with REST and WebSocket endpoints
- `agent_session.py` - Manages Strands Agent instances with FileSessionManager
- `ui_hooks.py` - HookProvider implementation capturing agent lifecycle events

**Frontend**:
- Next.js 14 App Router with React Server Components
- WebSocket client for real-time event streaming
- Structured event types for type-safe rendering
- Zustand for state management

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- Local model server (Ollama, LM Studio, or OpenAI-compatible endpoint)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd strands-ui
```

### 2. Set up Python Environment

```bash
# Create a virtual environment
python -m venv .venv

# Activate it (Linux/Mac)
source .venv/bin/activate

# Or on Windows
.venv\Scripts\activate

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Set up Frontend

```bash
cd frontend
npm install
cd ..
```

## Configuration

### Backend Configuration

The backend is configured in `backend/agent_session.py`. By default, it uses Ollama with the `openai/gpt-oss-20b` model:

```python
model = OpenAIModel(
    client_args={
        "base_url": "http://localhost:11434/v1",  # Ollama endpoint
        "api_key": "not-needed",
    },
    model_id="openai/gpt-oss-20b",
)
```

**To use a different model**:
1. Edit `backend/agent_session.py`
2. Update the `model` configuration in the `AgentSession.start()` method
3. Options include: OpenAI, Anthropic, Bedrock, or other OpenAI-compatible endpoints

### Frontend Configuration

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Application

### Start the Backend

```bash
# From project root, with virtual environment activated
python backend/main.py
```

The backend will start on `http://localhost:8000`

### Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### Access the UI

Open your browser and navigate to `http://localhost:3000`

## Usage

### Creating a Session

1. Click "New Session" in the sidebar
2. A new Strands Agent instance is created with hooks
3. Start chatting with the agent

### Resuming Sessions

1. Old sessions are listed in the sidebar
2. Click on any session to resume it
3. Full conversation history is restored via FileSessionManager

### Deleting Sessions

1. Hover over a session in the sidebar
2. Click the X button to delete
3. Or use "Clear All" to remove all sessions

### Observing Agent Activity

The UI provides structured visualization of:
- **User messages** - Your input to the agent
- **Agent responses** - The agent's text responses
- **Tool calls** - Visual cards showing tool name, inputs, and results
- **Thinking indicators** - Loading state while the agent processes
- **Errors** - Clear error messages when issues occur

## Project Structure

```
strands-ui/
├── backend/
│   ├── main.py              # FastAPI application with endpoints
│   ├── agent_session.py     # Agent instance and session management
│   ├── ui_hooks.py          # Strands HookProvider implementation
│   ├── requirements.txt     # Python dependencies
│   └── sessions/            # UI transcript storage (gitignored)
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main chat interface
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── ChatMessage.tsx      # User/agent message display
│   │   ├── ChatInput.tsx        # Message input component
│   │   ├── Sidebar.tsx          # Session list sidebar
│   │   ├── ToolCallDisplay.tsx  # Tool execution visualization
│   │   └── ThinkingDisplay.tsx  # Thinking indicator
│   ├── lib/
│   │   ├── api.ts           # REST API client
│   │   ├── websocket.ts     # WebSocket client with event types
│   │   ├── store.ts         # Zustand state management
│   │   └── utils.ts         # Utility functions
│   └── package.json
│
├── strands_sessions/        # Strands FileSessionManager storage (gitignored)
├── .gitignore
├── README.md
└── CLAUDE.md                # Development documentation
```

## API Endpoints

### REST API

- `POST /api/sessions` - Create a new agent session
- `GET /api/sessions` - List all saved sessions
- `GET /api/sessions/{id}` - Get session details and transcript
- `POST /api/sessions/{id}/resume` - Resume a stopped session with history
- `POST /api/sessions/{id}/input` - Send input to a session
- `POST /api/sessions/{id}/stop` - Stop a running session
- `DELETE /api/sessions/{id}` - Delete a session and its data
- `DELETE /api/sessions` - Delete all sessions

### WebSocket

- `WS /ws/{session_id}` - Real-time event streaming

**Event Types**:
- `session_start`, `session_end` - Session lifecycle
- `user_input` - User messages
- `message` - Agent responses
- `thinking_start`, `thinking_end` - Processing indicators
- `tool_call_start`, `tool_call_end` - Tool execution events
- `error` - Error notifications

## How It Works

### Hooks-Based Architecture

Instead of parsing subprocess output, the application uses Strands' native hook system:

1. **UIHooks** (`ui_hooks.py`) implements the `HookProvider` interface
2. Hooks capture events like:
   - `MessageAddedEvent` - New messages in conversation
   - `BeforeToolCallEvent`, `AfterToolCallEvent` - Tool execution
   - `BeforeModelCallEvent`, `AfterModelCallEvent` - LLM calls
3. Events are streamed to WebSocket clients in real-time
4. Frontend components render events as structured data

### Session Persistence

Sessions use Strands' `FileSessionManager`:
- Automatic conversation history saving
- Seamless session resumption
- Per-session isolation
- Stored in `strands_sessions/` directory

## Troubleshooting

### Backend won't start

- Ensure Python 3.10+ is installed: `python --version`
- Check virtual environment is activated
- Verify all dependencies: `pip install -r backend/requirements.txt`
- Check port 8000 is not in use

### Frontend won't start

- Ensure Node.js 18+ is installed: `node --version`
- Try: `rm -rf frontend/node_modules && cd frontend && npm install`
- Verify backend is running on port 8000

### WebSocket connection fails

- Check `frontend/.env.local` has correct API URL
- Verify CORS configuration in `backend/main.py`
- Check browser console for connection errors

### Sessions not saving

- Verify `sessions/` and `strands_sessions/` directories exist
- Check file permissions on session directories
- Look for errors in backend logs

### Model not responding

- Verify your model server (Ollama/LM Studio) is running
- Check the `base_url` in `backend/agent_session.py`
- Confirm the model name is correct
- Look for model-related errors in backend logs

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
