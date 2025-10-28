"""
UI Hooks Provider for Strands Agent

Captures agent events and streams them to the UI via WebSocket.
Provides visibility into tool calls, thinking logs, and plan mode.
"""

import asyncio
from datetime import datetime
from typing import Optional, Callable, Dict, Any, List
from strands.hooks import HookProvider, HookRegistry
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
    Hook provider that captures agent events and streams them to the UI.

    Captures:
    - Tool calls (before/after with inputs/outputs)
    - Model calls (thinking/reasoning)
    - Messages added to conversation
    - Errors and exceptions
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.callbacks: List[Callable] = []
        self.current_tool_call_id: Optional[str] = None

    def add_callback(self, callback: Callable):
        """Add a callback function to receive events"""
        self.callbacks.append(callback)

    def remove_callback(self, callback: Callable):
        """Remove a callback function"""
        if callback in self.callbacks:
            self.callbacks.remove(callback)

    async def _send_event(self, event: Dict[str, Any]):
        """Send event to all registered callbacks"""
        event["session_id"] = self.session_id
        event["timestamp"] = datetime.now().isoformat()

        # Debug logging
        print(f"[UI Hook] Sending event: {event['type']}")
        if event.get("content"):
            print(f"  Content: {event['content'][:100]}...")

        for callback in self.callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                print(f"Error in UI callback: {e}")

    def register_hooks(self, registry: HookRegistry) -> None:
        """Register all hook callbacks"""
        registry.add_callback(AgentInitializedEvent, self.on_agent_initialized)
        registry.add_callback(BeforeInvocationEvent, self.on_before_invocation)
        registry.add_callback(AfterInvocationEvent, self.on_after_invocation)
        registry.add_callback(MessageAddedEvent, self.on_message_added)
        registry.add_callback(BeforeToolCallEvent, self.on_before_tool_call)
        registry.add_callback(AfterToolCallEvent, self.on_after_tool_call)
        registry.add_callback(BeforeModelCallEvent, self.on_before_model_call)
        registry.add_callback(AfterModelCallEvent, self.on_after_model_call)

    def on_agent_initialized(self, event: AgentInitializedEvent) -> None:
        """Agent has been initialized"""
        asyncio.create_task(self._send_event({
            "type": "agent_initialized",
            "agent_name": event.agent.name if hasattr(event.agent, 'name') else "Agent"
        }))

    def on_before_invocation(self, event: BeforeInvocationEvent) -> None:
        """Agent invocation starting"""
        asyncio.create_task(self._send_event({
            "type": "invocation_start"
        }))

    def on_after_invocation(self, event: AfterInvocationEvent) -> None:
        """Agent invocation completed"""
        asyncio.create_task(self._send_event({
            "type": "invocation_end"
        }))

    def on_message_added(self, event: MessageAddedEvent) -> None:
        """Message added to conversation"""
        message = event.message

        print(f"[UI Hook] Message added - role: {message.get('role')}, content type: {type(message.get('content'))}")

        # Extract role and content
        role = message.get("role", "unknown")
        content = ""

        # Handle different content formats
        msg_content = message.get("content")

        if isinstance(msg_content, str):
            content = msg_content
        elif isinstance(msg_content, list):
            print(f"[UI Hook] Processing {len(msg_content)} content blocks")
            # Handle list of content blocks (text, tool_use, tool_result)
            for i, block in enumerate(msg_content):
                print(f"[UI Hook]   Block {i}: type={type(block)}, is_dict={isinstance(block, dict)}")

                if isinstance(block, dict):
                    print(f"[UI Hook]     Block keys: {list(block.keys())}")
                    block_type = block.get("type")
                    print(f"[UI Hook]     Block type: {block_type}")

                    # Try to extract text from various possible keys
                    if block_type == "text":
                        text = block.get("text", "")
                        print(f"[UI Hook]     Found text via type=text: {text[:50]}...")
                        content += text
                    elif "text" in block:
                        # Direct text key without type
                        text = block["text"]
                        print(f"[UI Hook]     Found text via direct key: {text[:50]}...")
                        content += text
                    elif "content" in block:
                        # Content key
                        text = block["content"]
                        print(f"[UI Hook]     Found text via content key: {text[:50]}...")
                        content += text
                    elif block_type == "tool_use":
                        # Tool use messages are handled separately
                        print(f"[UI Hook]     Skipping tool_use block")
                        continue
                    elif block_type == "tool_result":
                        # Tool result messages are handled separately
                        print(f"[UI Hook]     Skipping tool_result block")
                        continue
                    else:
                        print(f"[UI Hook]     Unknown block structure: {block}")
                elif hasattr(block, 'text'):
                    # Handle ContentBlock objects
                    print(f"[UI Hook]     Block has text attribute: {block.text[:50] if block.text else 'empty'}...")
                    content += str(block.text) if block.text else ""

        print(f"[UI Hook] Final extracted content length: {len(content)}")

        if content.strip():
            print(f"[UI Hook] Sending message event with content: {content[:50]}...")
            asyncio.create_task(self._send_event({
                "type": "message",
                "role": role,
                "content": content
            }))
        else:
            print(f"[UI Hook] Skipping message - no text content found")

    def on_before_tool_call(self, event: BeforeToolCallEvent) -> None:
        """Tool is about to be called"""
        import uuid

        tool_use = event.tool_use
        tool_name = tool_use.get("name", "unknown")
        tool_input = tool_use.get("input", {})
        tool_id = tool_use.get("id", str(uuid.uuid4()))

        self.current_tool_call_id = tool_id

        asyncio.create_task(self._send_event({
            "type": "tool_call_start",
            "tool_id": tool_id,
            "tool_name": tool_name,
            "tool_input": tool_input
        }))

    def on_after_tool_call(self, event: AfterToolCallEvent) -> None:
        """Tool call completed"""
        tool_use = event.tool_use
        tool_id = tool_use.get("id", self.current_tool_call_id)

        # Get result or error
        result = None
        error = None

        if event.exception:
            error = str(event.exception)
        elif event.cancel_message:
            error = event.cancel_message
        elif event.result:
            # Result can be string or dict
            if isinstance(event.result, dict):
                result = event.result.get("content", str(event.result))
            else:
                result = str(event.result)

        asyncio.create_task(self._send_event({
            "type": "tool_call_end",
            "tool_id": tool_id,
            "result": result,
            "error": error
        }))

        self.current_tool_call_id = None

    def on_before_model_call(self, event: BeforeModelCallEvent) -> None:
        """Model is about to be called (thinking)"""
        asyncio.create_task(self._send_event({
            "type": "thinking_start"
        }))

    def on_after_model_call(self, event: AfterModelCallEvent) -> None:
        """Model call completed"""
        # Check if there was an error
        if event.exception:
            asyncio.create_task(self._send_event({
                "type": "error",
                "error": str(event.exception)
            }))
            return

        # Get the response
        if event.stop_response:
            # stop_response is a ModelStopResponse object, not a dict
            message = event.stop_response.message if hasattr(event.stop_response, 'message') else {}
            stop_reason = event.stop_response.stop_reason if hasattr(event.stop_response, 'stop_reason') else None

            # Extract text content from response
            content = ""
            if isinstance(message, dict):
                msg_content = message.get("content", "")
                if isinstance(msg_content, str):
                    content = msg_content
                elif isinstance(msg_content, list):
                    for block in msg_content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            content += block.get("text", "")

            asyncio.create_task(self._send_event({
                "type": "thinking_end",
                "content": content,
                "stop_reason": stop_reason
            }))
