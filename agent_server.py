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
from typing import Optional, Dict

# Import your agent
from my_agent import create_my_agent
from ui_hooks import UIHooks

app = FastAPI(title="Strands Agent Server")

# Store agent instances per session
agent_sessions: Dict[str, any] = {}

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


@app.get("/")
async def root():
    return {
        "name": "Strands Agent Server",
        "status": "running",
        "endpoints": {
            "/chat": "POST - Send message to agent",
            "/health": "GET - Health check"
        }
    }


if __name__ == "__main__":
    import uvicorn
    print("🤖 Starting Strands Agent Server...")
    print("📡 Agent will connect to UI at ws://localhost:8000")
    print("🌐 Server running on http://localhost:8001\n")
    uvicorn.run(app, host="0.0.0.0", port=8001)
