# 🚀 Start Here - Strands UI

## Quick Start (3 terminals)

### 1️⃣ Terminal 1 - UI
```bash
cd frontend
npm install  # First time only
npm run start:all
```
Starts on: http://localhost:3000 (UI) + ws://localhost:8000 (WebSocket)

### 2️⃣ Terminal 2 - Agent
```bash
uv run agent_server.py
```
Starts on: http://localhost:8001 (Agent API)

### 3️⃣ Browser
Open: http://localhost:3000
- Click "Create Session"
- Type your message
- Watch the agent work!

## Customize Your Agent

Edit `my_agent.py` to:
- Add your own tools
- Change the model
- Modify the system prompt

No other changes needed! The UI automatically visualizes your agent.

## Files You Care About

- `my_agent.py` ← **Your agent config (edit this!)**
- `agent_server.py` ← HTTP wrapper (usually don't touch)
- `ui_hooks.py` ← UI integration (don't touch)
- `frontend/` ← UI code (optional customization)

## Example Messages to Try

```
"What's the weather in Tokyo?"
"Calculate 42 * 17"
"Search docs for authentication"
```

## Next Steps

See `TEST.md` for detailed testing guide
See `README.md` for full documentation
