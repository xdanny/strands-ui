"""
UI Hooks Provider for Strands Agent

Captures agent events and streams them to the UI WebSocket server.
This hook provider should be added to your Strands agent to enable UI visualization.

Usage:
    from ui_hooks import UIHooks

    agent = Agent(
        model=your_model,
        hooks=[UIHooks(session_id="your-session-id", websocket_url="ws://localhost:8000")]
    )

Installation:
    pip install websockets
"""

import asyncio
import websockets
import json
from datetime import datetime
from typing import Optional, Dict, Any
from strands.hooks import HookProvider
from strands.hooks.events import (
    AgentInitializedEvent,
    BeforeInvocationEvent,
    AfterInvocationEvent,
    MessageAddedEvent,
    BeforeToolCallEvent,
    AfterToolCallEvent,
    BeforeModelCallEvent,
    AfterModelCallEvent,
)


class UIHooks(HookProvider):
    """
    Hook provider that captures agent events and streams them to the UI via WebSocket.

    Captures:
    - Tool calls (before/after with inputs/outputs)
    - Model calls (thinking/reasoning)
    - Messages added to conversation
    - Invocations (agent turns)
    """

    def __init__(self, session_id: str, websocket_url: str = "ws://localhost:8000"):
        print(f"[UI Hooks] 🎯 Initializing UIHooks for session {session_id}")
        self.session_id = session_id
        self.websocket_url = f"{websocket_url}/ws/{session_id}"
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.current_tool_call_id: Optional[str] = None
        self._connect_task: Optional[asyncio.Task] = None
        print(f"[UI Hooks] 🔗 Will connect to: {self.websocket_url}")

    def register_hooks(self, registry, **kwargs):
        """Register all hook callbacks with the agent's hook registry."""
        from strands.hooks import HookRegistry
        print(f"[UI Hooks] 📝 Registering hooks with agent")
        registry.add_callback(AgentInitializedEvent, self.on_agent_initialized)
        registry.add_callback(BeforeInvocationEvent, self.on_before_invocation)
        registry.add_callback(AfterInvocationEvent, self.on_after_invocation)
        registry.add_callback(MessageAddedEvent, self.on_message_added)
        registry.add_callback(BeforeToolCallEvent, self.on_before_tool_call)
        registry.add_callback(AfterToolCallEvent, self.on_after_tool_call)
        registry.add_callback(BeforeModelCallEvent, self.on_before_model_call)
        registry.add_callback(AfterModelCallEvent, self.on_after_model_call)
        print(f"[UI Hooks] ✅ All hooks registered")

    async def _ensure_connected(self):
        """Ensure WebSocket connection is established"""
        # Check if we need to connect (websocket is None or connection is closed)
        need_connect = self.websocket is None
        if self.websocket is not None:
            try:
                # Check if connection is still open by checking the state
                need_connect = self.websocket.close_code is not None
            except:
                need_connect = True

        if need_connect:
            try:
                print(f"[UI Hooks] Attempting to connect to WebSocket server: {self.websocket_url}")
                self.websocket = await websockets.connect(self.websocket_url)
                print(f"[UI Hooks] ✅ Successfully connected to WebSocket server")
            except Exception as e:
                print(f"[UI Hooks] ❌ Failed to connect to WebSocket server: {e}")
                import traceback
                traceback.print_exc()
                self.websocket = None

    def _send_event_sync(self, event: Dict[str, Any]):
        """Send event to WebSocket server (sync wrapper)"""
        try:
            # Try to get the current running loop
            try:
                loop = asyncio.get_running_loop()
                # If we're already in an async context, create a task but don't await
                # This schedules it to run but doesn't block
                task = asyncio.create_task(self._send_event_async(event))
            except RuntimeError:
                # No running loop - create one and run synchronously
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(self._send_event_async(event))
                finally:
                    # Don't close the loop if it might be reused
                    pass
        except Exception as e:
            print(f"[UI Hooks] Error in sync wrapper: {e}")
            import traceback
            traceback.print_exc()

    async def _send_event_async(self, event: Dict[str, Any]):
        """Send event to WebSocket server (async implementation)"""
        event["session_id"] = self.session_id
        event["timestamp"] = datetime.now().isoformat()

        print(f"[UI Hook] Sending event: {event['type']}")

        await self._ensure_connected()

        if self.websocket:
            try:
                # Check if connection is open
                if self.websocket.close_code is None:
                    await self.websocket.send(json.dumps(event))
                else:
                    print(f"[UI Hooks] WebSocket closed, event dropped: {event['type']}")
                    self.websocket = None
            except Exception as e:
                print(f"[UI Hooks] Error sending event: {e}")
                self.websocket = None
        else:
            print(f"[UI Hooks] WebSocket not connected, event dropped: {event['type']}")

    def on_agent_initialized(self, event: AgentInitializedEvent):
        """Agent initialization"""
        self._send_event_sync({
            "type": "agent_initialized",
            "data": {}
        })

    def on_before_invocation(self, event: BeforeInvocationEvent):
        """Agent invocation starting"""
        self._send_event_sync({
            "type": "invocation_start",
            "data": {}
        })

    def on_after_invocation(self, event: AfterInvocationEvent):
        """Agent invocation completed"""
        self._send_event_sync({
            "type": "invocation_end",
            "data": {}
        })

    def on_message_added(self, event: MessageAddedEvent):
        """Message added to conversation"""
        message = event.message

        # Extract role
        role = message.get("role", "unknown")

        # Extract content from message content blocks
        content = ""
        msg_content = message.get("content")

        if isinstance(msg_content, str):
            content = msg_content
        elif isinstance(msg_content, list):
            for block in msg_content:
                if isinstance(block, dict):
                    # Try standard format first
                    if block.get("type") == "text":
                        content += block.get("text", "")
                    # Fallback for blocks without type
                    elif "text" in block:
                        content += block["text"]
                elif isinstance(block, str):
                    content += block

        if not content.strip():
            print(f"[UI Hook] Skipping message - no text content")
            return

        # Determine event type based on role
        event_type = "user_input" if role == "user" else "message"

        self._send_event_sync({
            "type": event_type,
            "role": role,
            "content": content,
            "data": {
                "content": content,
                "role": role
            }
        })

    def on_before_tool_call(self, event: BeforeToolCallEvent):
        """Tool call starting"""
        self.current_tool_call_id = str(id(event))

        self._send_event_sync({
            "type": "tool_call_start",
            "tool_id": self.current_tool_call_id,
            "tool_name": event.tool_use["name"],
            "tool_input": event.tool_use.get("input", {}),
            "data": {
                "tool_name": event.tool_use["name"],
                "tool_input": event.tool_use.get("input", {})
            }
        })

    def on_after_tool_call(self, event: AfterToolCallEvent):
        """Tool call completed"""
        result = None
        error = None

        if hasattr(event, 'result') and event.result:
            # Extract text content from result object
            if isinstance(event.result, dict):
                # Try to get content from the result structure
                content = event.result.get('content')
                if isinstance(content, list) and len(content) > 0:
                    # Get text from first content block
                    if isinstance(content[0], dict):
                        result = content[0].get('text', str(event.result))
                    else:
                        result = str(content[0])
                elif isinstance(content, str):
                    result = content
                else:
                    result = str(event.result)
            else:
                result = str(event.result)

        if hasattr(event, 'error'):
            error = str(event.error) if event.error else None

        self._send_event_sync({
            "type": "tool_call_end",
            "tool_id": self.current_tool_call_id,
            "result": result,
            "error": error,
            "data": {
                "result": result,
                "error": error
            }
        })

    def on_before_model_call(self, event: BeforeModelCallEvent):
        """Model call starting (thinking)"""
        self._send_event_sync({
            "type": "thinking_start",
            "data": {}
        })

    def on_after_model_call(self, event: AfterModelCallEvent):
        """Model call completed"""
        self._send_event_sync({
            "type": "thinking_end",
            "data": {}
        })

    async def close(self):
        """Close WebSocket connection"""
        if self.websocket:
            try:
                if self.websocket.close_code is None:
                    await self.websocket.close()
                    print(f"[UI Hooks] WebSocket connection closed")
            except:
                pass
