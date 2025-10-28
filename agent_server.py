#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "strands-agents-builder",
#   "openai",
#   "websockets",
#   "fastapi",
#   "uvicorn",
# ]
# ///
"""
Strands Agent HTTP Server

Serves a Strands agent via FastAPI with UI hooks integration.
This server imports your agent from my_agent.py and adds UI visualization.

Your agent code stays separate - this is just an HTTP wrapper with UI hooks.

Usage:
    uv run agent_server.py

Architecture:
    1. Frontend sends message to /chat endpoint
    2. Server creates agent with UIHooks
    3. Agent processes message and streams events to WebSocket
    4. Frontend receives events and updates UI
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import json
from pathlib import Path

# Import your agent
from my_agent import create_my_agent
from ui_hooks import UIHooks

app = FastAPI(title="Strands Agent Server")

# Store agent instances per session
agent_sessions: Dict[str, any] = {}

# Session persistence directory
SESSIONS_DIR = Path("strands_sessions")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    response: str
    session_id: str


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to the agent and get a response.

    The agent will stream events to the UI via WebSocket hooks.

    Flow:
        1. Get or create agent for this session
        2. Agent maintains conversation history
        3. Agent processes message
        4. UIHooks stream events to WebSocket server
        5. Frontend receives events via WebSocket
    """
    try:
        print(f"[Agent Server] Received message for session {request.session_id}")
        print(f"[Agent Server] Message: {request.message[:100]}...")

        # Get or create agent for this session
        if request.session_id not in agent_sessions:
            print(f"[Agent Server] Creating new agent for session {request.session_id}")
            agent = create_my_agent(
                session_id=request.session_id,
                ui_hooks=UIHooks(
                    session_id=request.session_id,
                    websocket_url="ws://localhost:8000"
                )
            )
            agent_sessions[request.session_id] = agent
        else:
            print(f"[Agent Server] Using existing agent for session {request.session_id}")
            agent = agent_sessions[request.session_id]

        # Invoke agent (this will stream events to UI via hooks)
        response = agent(request.message)

        print(f"[Agent Server] Response generated for session {request.session_id}")

        return ChatResponse(
            response=str(response),
            session_id=request.session_id
        )

    except Exception as e:
        print(f"[Agent Server] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "healthy", "message": "Agent server is running"}


@app.get("/sessions")
async def list_sessions():
    """
    List all persisted sessions.

    Returns:
        List of session metadata including session_id, created_at, message count
    """
    try:
        if not SESSIONS_DIR.exists():
            return {"sessions": []}

        sessions = []
        for session_dir in SESSIONS_DIR.glob("session_*"):
            session_json = session_dir / "session.json"
            if session_json.exists():
                with open(session_json, "r") as f:
                    session_data = json.load(f)

                # Count messages
                messages_dir = session_dir / "agents" / "agent_default" / "messages"
                message_count = len(list(messages_dir.glob("*.json"))) if messages_dir.exists() else 0

                sessions.append({
                    "session_id": session_data["session_id"],
                    "created_at": session_data["created_at"],
                    "updated_at": session_data["updated_at"],
                    "message_count": message_count
                })

        # Sort by updated_at descending
        sessions.sort(key=lambda x: x["updated_at"], reverse=True)
        return {"sessions": sessions}

    except Exception as e:
        print(f"[Agent Server] Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    """
    Get all messages for a specific session.

    Args:
        session_id: The session ID to load

    Returns:
        List of messages with role, content, and timestamp
    """
    try:
        session_dir = SESSIONS_DIR / f"session_{session_id}"
        if not session_dir.exists():
            raise HTTPException(status_code=404, detail="Session not found")

        messages_dir = session_dir / "agents" / "agent_default" / "messages"
        if not messages_dir.exists():
            return {"messages": []}

        messages = []
        for message_file in sorted(messages_dir.glob("message_*.json")):
            with open(message_file, "r") as f:
                message_data = json.load(f)

                # Extract content from message
                content = ""
                if "message" in message_data and "content" in message_data["message"]:
                    content_list = message_data["message"]["content"]
                    if isinstance(content_list, list) and len(content_list) > 0:
                        content = content_list[0].get("text", "")

                messages.append({
                    "message_id": message_data["message_id"],
                    "role": message_data["message"]["role"],
                    "content": content,
                    "created_at": message_data["created_at"]
                })

        return {"messages": messages}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Agent Server] Error loading session messages: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {
        "name": "Strands Agent Server",
        "status": "running",
        "endpoints": {
            "/chat": "POST - Send message to agent",
            "/sessions": "GET - List all sessions",
            "/sessions/{session_id}/messages": "GET - Get messages for a session",
            "/health": "GET - Health check"
        }
    }


if __name__ == "__main__":
    import uvicorn
    print("🤖 Starting Strands Agent Server...")
    print("📡 Agent will connect to UI at ws://localhost:8000")
    print("🌐 Server running on http://localhost:8001\n")
    uvicorn.run(app, host="0.0.0.0", port=8001)
