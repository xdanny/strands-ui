from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import asyncio

from agent_session import AgentSessionManager

app = FastAPI(title="Strands UI Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agent session manager
session_manager = AgentSessionManager()


class CreateSessionRequest(BaseModel):
    agent_config: Optional[Dict[str, Any]] = None


class SendInputRequest(BaseModel):
    content: str


@app.post("/api/sessions")
async def create_session(request: CreateSessionRequest):
    """Create a new Strands Agent session"""
    session = session_manager.create_session()

    # Start the agent with optional model configuration
    await session.start(model_config=request.agent_config)

    return {
        "session_id": session.session_id,
        "created_at": session.created_at,
        "status": "running"
    }


@app.get("/api/sessions")
async def list_sessions():
    """List all sessions"""
    sessions = await session_manager.list_sessions()
    return {"sessions": sessions}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session details and transcript"""
    session = session_manager.get_session(session_id)

    if not session:
        # Try to load from disk
        session = await session_manager.load_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Add loaded session back to active sessions (but don't start agent yet)
        session_manager.sessions[session_id] = session

    return {
        "session_id": session.session_id,
        "created_at": session.created_at,
        "is_running": session.is_running,
        "transcript": session.transcript
    }


@app.post("/api/sessions/{session_id}/resume")
async def resume_session(session_id: str):
    """Resume a stopped session with conversation history"""
    session = session_manager.get_session(session_id)

    if not session:
        # Try to load from disk
        session = await session_manager.load_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Add to active sessions
        session_manager.sessions[session_id] = session

    if session.is_running:
        return {
            "session_id": session.session_id,
            "status": "already_running"
        }

    # Resume the session with conversation history
    await session.start(resume=True)

    return {
        "session_id": session.session_id,
        "status": "resumed"
    }


@app.post("/api/sessions/{session_id}/input")
async def send_input(session_id: str, request: SendInputRequest):
    """Send input to an agent session"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.is_running:
        raise HTTPException(status_code=400, detail="Session is not running")

    await session.send_input(request.content)
    return {"status": "sent"}


@app.post("/api/sessions/{session_id}/stop")
async def stop_session(session_id: str):
    """Stop an agent session"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await session.stop()
    return {"status": "stopped"}


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its transcript"""
    import shutil
    from pathlib import Path

    print(f"[Delete] Deleting session {session_id}")

    # Stop the session if it's running
    session = session_manager.get_session(session_id)
    if session and session.is_running:
        print(f"[Delete] Stopping running session {session_id}")
        await session.stop()

    # Remove from active sessions
    if session_id in session_manager.sessions:
        print(f"[Delete] Removing {session_id} from active sessions")
        del session_manager.sessions[session_id]

    # Delete the UI transcript files (sessions/ directory)
    session_dir = Path(session_manager.storage_path) / session_id
    if session_dir.exists():
        print(f"[Delete] Removing UI transcript directory: {session_dir}")
        shutil.rmtree(session_dir)

    # Delete the Strands session files (strands_sessions/ directory)
    # Strands FileSessionManager prefixes session directories with "session_"
    strands_session_dir = Path(session_manager.storage_path).parent / "strands_sessions" / f"session_{session_id}"
    if strands_session_dir.exists():
        print(f"[Delete] Removing Strands session directory: {strands_session_dir}")
        shutil.rmtree(strands_session_dir)
    else:
        print(f"[Delete] Strands session directory not found: {strands_session_dir}")

    print(f"[Delete] Successfully deleted session {session_id}")
    return {"status": "deleted"}


@app.delete("/api/sessions")
async def delete_all_sessions():
    """Delete all sessions"""
    import shutil
    from pathlib import Path

    print(f"[Delete All] Deleting all sessions")

    # Stop all running sessions
    session_count = len(session_manager.sessions)
    print(f"[Delete All] Stopping {session_count} active sessions")
    for session in list(session_manager.sessions.values()):
        if session.is_running:
            await session.stop()

    # Clear active sessions
    session_manager.sessions.clear()
    print(f"[Delete All] Cleared active sessions")

    # Delete all UI transcript directories (sessions/ directory)
    storage_path = Path(session_manager.storage_path)
    if storage_path.exists():
        ui_dir_count = sum(1 for d in storage_path.iterdir() if d.is_dir())
        print(f"[Delete All] Removing {ui_dir_count} UI transcript directories")
        for session_dir in storage_path.iterdir():
            if session_dir.is_dir():
                shutil.rmtree(session_dir)

    # Delete all Strands session directories (strands_sessions/ directory)
    strands_storage_path = storage_path.parent / "strands_sessions"
    if strands_storage_path.exists():
        strands_dir_count = sum(1 for d in strands_storage_path.iterdir() if d.is_dir())
        print(f"[Delete All] Removing {strands_dir_count} Strands session directories")
        for session_dir in strands_storage_path.iterdir():
            if session_dir.is_dir():
                shutil.rmtree(session_dir)
    else:
        print(f"[Delete All] Strands sessions directory not found")

    print(f"[Delete All] Successfully deleted all sessions")
    return {"status": "all_deleted"}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time agent events"""
    print(f"[WebSocket] Connection attempt for session {session_id}")
    await websocket.accept()
    print(f"[WebSocket] Connection accepted")

    session = session_manager.get_session(session_id)
    if not session:
        print(f"[WebSocket] Session not found: {session_id}")
        await websocket.close(code=1008, reason="Session not found")
        return

    print(f"[WebSocket] Session found, registering callback")

    # Define callback to send events to WebSocket
    async def send_event(event):
        try:
            print(f"[WebSocket] Sending event to client: {event['type']}")
            await websocket.send_json(event)
        except Exception as e:
            print(f"[WebSocket] Error sending event: {e}")

    # Register callback
    session.add_output_callback(send_event)
    print(f"[WebSocket] Callback registered. Sending {len(session.transcript)} existing events")

    try:
        # Send existing transcript
        for event in session.transcript:
            print(f"[WebSocket] Sending existing event: {event['type']}")
            await websocket.send_json(event)

        print(f"[WebSocket] Entering main loop")
        # Keep connection alive and listen for messages
        while True:
            data = await websocket.receive_json()
            print(f"[WebSocket] Received from client: {data}")

            # Handle different message types
            if data.get("type") == "input":
                await session.send_input(data.get("content", ""))
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        print(f"[WebSocket] Client disconnected from session {session_id}")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Unregister callback
        print(f"[WebSocket] Cleaning up connection for session {session_id}")
        session.remove_output_callback(send_event)


@app.get("/")
async def root():
    return {
        "name": "Strands UI Backend",
        "status": "running",
        "active_sessions": len(session_manager.sessions)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
