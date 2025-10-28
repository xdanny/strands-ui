"""
Agent Session Manager

Manages Strands Agent instances with UI hooks for real-time event streaming.
Replaces the subprocess-based CLI manager with direct agent integration.
"""

import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable, Dict, Any, List
import aiofiles

from strands import Agent
from strands.models.openai import OpenAIModel
from strands.session.file_session_manager import FileSessionManager
from ui_hooks import UIHooks


class AgentSession:
    """Manages a single Strands Agent session with UI hooks"""

    def __init__(self, session_id: str, storage_path: Path):
        self.session_id = session_id
        self.storage_path = storage_path
        self.agent: Optional[Agent] = None
        self.ui_hooks: Optional[UIHooks] = None
        self.output_callbacks: List[Callable] = []
        self.transcript: List[Dict[str, Any]] = []
        self.created_at = datetime.now().isoformat()
        self.is_running = False
        self._response_queue: Optional[asyncio.Queue] = None

    async def start(self, model_config: Optional[Dict[str, Any]] = None, resume: bool = False):
        """Start the agent session with UI hooks

        Args:
            model_config: Optional model configuration
            resume: If True, restore conversation history from Strands session manager
        """
        if self.is_running:
            raise RuntimeError("Session already running")

        print(f"[Agent Session] Starting session {self.session_id}, resume={resume}")

        # Default model configuration (OpenAI-compatible local model)
        if model_config is None:
            model_config = {
                "base_url": "http://localhost:11434/v1",
                "api_key": "not-needed",
                "model_id": "openai/gpt-oss-20b",
                "temperature": 0.7,
                "max_tokens": 2000,
            }

        # Create model
        model = OpenAIModel(
            client_args={
                "base_url": model_config.get("base_url", "http://localhost:11434/v1"),
                "api_key": model_config.get("api_key", "not-needed"),
            },
            model_id=model_config.get("model_id", "openai/gpt-oss-20b"),
            params={
                "temperature": model_config.get("temperature", 0.7),
                "max_tokens": model_config.get("max_tokens", 2000),
            }
        )

        # Create UI hooks
        self.ui_hooks = UIHooks(self.session_id)
        self.ui_hooks.add_callback(self._handle_hook_event)

        # Create Strands FileSessionManager for automatic persistence
        # It will automatically restore conversation history if the session exists
        strands_session_dir = str(self.storage_path.parent / "strands_sessions")
        print(f"[Agent Session] Creating FileSessionManager with session_id={self.session_id}, storage_dir={strands_session_dir}")

        strands_session_manager = FileSessionManager(
            session_id=self.session_id,
            storage_dir=strands_session_dir
        )

        # Create agent with hooks and session manager
        self.agent = Agent(
            model=model,
            system_prompt="""You are a helpful AI assistant running locally.
You can help with coding, questions, analysis, and general tasks.
Be concise but thorough in your responses.""",
            hooks=[self.ui_hooks],
            session_manager=strands_session_manager
        )

        # The FileSessionManager automatically restores the conversation history!
        print(f"[Agent Session] Agent created with session_id={self.session_id}, messages in history: {len(self.agent.messages)}")
        if len(self.agent.messages) > 0:
            print(f"[Agent Session] First message: {self.agent.messages[0]}")
            print(f"[Agent Session] Last message: {self.agent.messages[-1]}")

        self.is_running = True

        # Log session start (or resume)
        if resume:
            await self._log_event("session_resumed", {})
        else:
            await self._log_event("session_start", {})

    async def _handle_hook_event(self, event: Dict[str, Any]):
        """Handle events from UI hooks and forward to callbacks"""
        # Add to transcript
        self.transcript.append(event)

        # Save transcript
        await self._save_transcript()

        # Notify all output callbacks
        for callback in self.output_callbacks:
            try:
                await callback(event)
            except Exception as e:
                print(f"Error in output callback: {e}")

    async def _log_event(self, event_type: str, data: Dict[str, Any] = None):
        """Log a session event"""
        event = {
            "type": event_type,
            "data": data or {},
            "timestamp": datetime.now().isoformat(),
            "session_id": self.session_id
        }
        self.transcript.append(event)
        await self._save_transcript()

        # Notify callbacks
        for callback in self.output_callbacks:
            try:
                await callback(event)
            except Exception as e:
                print(f"Error in output callback: {e}")

    async def send_input(self, text: str):
        """Send input to the agent"""
        if not self.agent or not self.is_running:
            raise RuntimeError("Agent not running")

        print(f"[Agent Session] Received input: {text}")

        # Log user input
        await self._log_event("user_input", {"content": text})

        # Run agent asynchronously and stream response
        try:
            print(f"[Agent Session] Invoking agent...")
            # Use invoke_async for non-streaming response
            result = await self.agent.invoke_async(text)
            print(f"[Agent Session] Agent invocation complete. Stop reason: {result.stop_reason}")

            # The hooks will capture all events during execution
            # So we just need to log the final result
            if result.stop_reason == "end_turn":
                # Successfully completed
                pass
            elif result.stop_reason == "interrupt":
                # Handle interrupts (plan mode)
                await self._log_event("interrupt", {
                    "interrupts": [{"id": i.id, "name": i.name, "reason": i.reason}
                                   for i in result.interrupts]
                })
            elif result.stop_reason == "error":
                await self._log_event("error", {"error": str(result.error)})

        except Exception as e:
            print(f"[Agent Session] Error during invocation: {e}")
            await self._log_event("error", {"error": str(e)})
            raise

    async def stop(self):
        """Stop the agent session"""
        if not self.is_running:
            return

        self.is_running = False
        self.agent = None

        await self._log_event("session_end", {})
        await self._save_transcript()

    def add_output_callback(self, callback: Callable):
        """Add a callback to be notified of output events"""
        self.output_callbacks.append(callback)

    def remove_output_callback(self, callback: Callable):
        """Remove an output callback"""
        if callback in self.output_callbacks:
            self.output_callbacks.remove(callback)

    async def _save_transcript(self):
        """Save transcript to disk"""
        session_dir = self.storage_path / self.session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        transcript_file = session_dir / "transcript.json"
        async with aiofiles.open(transcript_file, 'w') as f:
            await f.write(json.dumps({
                "session_id": self.session_id,
                "created_at": self.created_at,
                "transcript": self.transcript
            }, indent=2))

    async def load_transcript(self):
        """Load transcript from disk"""
        transcript_file = self.storage_path / self.session_id / "transcript.json"
        if not transcript_file.exists():
            return

        async with aiofiles.open(transcript_file, 'r') as f:
            content = await f.read()
            data = json.loads(content)
            self.transcript = data.get("transcript", [])
            self.created_at = data.get("created_at", self.created_at)


class AgentSessionManager:
    """Manages multiple agent sessions"""

    def __init__(self, storage_path: str = "./sessions"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.sessions: Dict[str, AgentSession] = {}

    def create_session(self) -> AgentSession:
        """Create a new agent session"""
        session_id = str(uuid.uuid4())
        session = AgentSession(session_id, self.storage_path)
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[AgentSession]:
        """Get an existing session"""
        return self.sessions.get(session_id)

    async def list_sessions(self) -> List[Dict[str, Any]]:
        """List all saved sessions"""
        sessions = []
        for session_dir in self.storage_path.iterdir():
            if session_dir.is_dir():
                transcript_file = session_dir / "transcript.json"
                if transcript_file.exists():
                    async with aiofiles.open(transcript_file, 'r') as f:
                        content = await f.read()
                        data = json.loads(content)
                        sessions.append({
                            "session_id": data["session_id"],
                            "created_at": data["created_at"],
                            "message_count": len(data["transcript"])
                        })
        return sorted(sessions, key=lambda x: x["created_at"], reverse=True)

    async def load_session(self, session_id: str) -> Optional[AgentSession]:
        """Load a session from disk"""
        session = AgentSession(session_id, self.storage_path)
        await session.load_transcript()
        return session if session.transcript else None
