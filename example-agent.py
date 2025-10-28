#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "strands-agents-builder",
#   "openai",
#   "websockets",
# ]
# ///
"""
Example Strands Agent with UI Integration

This example shows how to add UI visualization to your Strands agent by adding
UIHooks. The agent runs independently, and the UI displays events in real-time.

Usage:
    # 1. Start the UI (WebSocket server + frontend):
    cd frontend && npm run start:all

    # 2. Create a session in the UI and copy the session ID

    # 3. Run your agent with that session ID:
    uv run example-agent.py --session-id <SESSION_ID> "Your question"

    # 4. Watch the UI update in real-time!
"""

import sys
import argparse
from strands import Agent
from strands.models.openai import OpenAIModel

# Import UI hooks
from ui_hooks import UIHooks

def create_agent(session_id: str):
    """Create agent with UI hooks for the given session ID"""

    # Configure the model to use your local OpenAI-compatible endpoint
    model = OpenAIModel(
        client_args={
            # Your local API endpoint
            # Default Ollama: http://localhost:11434/v1
            # Default LM Studio: http://localhost:1234/v1
            "base_url": "http://localhost:11434/v1",

            # API key (usually not needed for local servers, but required field)
            "api_key": "not-needed",
        },

        # The model name from your Ollama/LM Studio
        model_id="openai/gpt-oss-20b",

        # Model parameters
        params={
            "temperature": 0.7,
            "max_tokens": 2000,
        }
    )

    # Create the agent with UI hooks enabled
    agent = Agent(
        model=model,

        # Add UI hooks - connects to the UI session!
        hooks=[UIHooks(
            session_id=session_id,
            websocket_url="ws://localhost:8000"  # UI WebSocket server
        )],

        # Optional: Add tools/functions for the agent to use
        # tools=[...],

        # Optional: System instructions
        system_prompt="""You are a helpful AI assistant running locally.
Be concise and friendly in your responses."""
    )

    return agent


def main():
    """Run the agent with a query"""
    parser = argparse.ArgumentParser(description="Run Strands agent with UI visualization")
    parser.add_argument("--session-id", required=True, help="Session ID from the UI")
    parser.add_argument("query", nargs="+", help="Your question for the agent")

    args = parser.parse_args()

    session_id = args.session_id
    query = " ".join(args.query)

    print(f"\n🤖 Query: {query}")
    print(f"📊 Session ID: {session_id}")
    print(f"🌐 UI: http://localhost:3000")
    print("\n💭 Thinking...\n")

    # Create agent with the UI session ID
    agent = create_agent(session_id)

    # Invoke the agent
    response = agent(query)

    print("✅ Response:")
    print(response)
    print()
    print(f"💡 View this conversation in the UI at http://localhost:3000")


if __name__ == "__main__":
    main()
