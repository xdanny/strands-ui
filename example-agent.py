#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "strands-agents-builder",
#   "openai",
#   "websockets",
# ]
# ///
"""
Example: Integrating Strands UI with Your Agent

This example demonstrates how to add UI visualization to any Strands agent project.
The agent code can live anywhere - you just copy ui_hooks.py and add UIHooks.

Setup:
    # 1. Start the Strands UI (once, leave it running):
    cd /path/to/strands-ui
    npm start

    # 2. In YOUR agent project (anywhere):
    # Copy ui_hooks.py to your project
    # Add UIHooks to your agent (see code below)

Usage:
    # Run your agent (this example script):
    uv run example-agent.py --session-id <SESSION_ID> "Your question"

    # The session ID can be:
    # - From UI: Create a session at http://localhost:3000 and copy the ID
    # - Generated: Use any UUID (agent will create a new session)

    # View results at http://localhost:3000

Benefits:
    - Works from any project directory
    - No need to run agent from strands-ui repo
    - Multiple agents can connect to one UI instance
    - Full session persistence across restarts
"""

import sys
import argparse
from strands import Agent
from strands.models.openai import OpenAIModel

# Import UI hooks
from ui_hooks import UIHooks

def create_agent(session_id: str):
    """Create agent with UI hooks and session persistence for the given session ID"""

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

    # Create the agent with UI hooks and session persistence enabled
    agent = Agent(
        model=model,

        # Enable session persistence - saves to strands_sessions/
        # This allows the agent to maintain context across restarts
        session_id=session_id,

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
    print(f"💾 Session will be saved to: strands_sessions/session_{session_id}/")
    print("\n💭 Thinking...\n")

    # Create agent with the UI session ID and session persistence
    agent = create_agent(session_id)

    # Invoke the agent (response is saved to disk automatically)
    response = agent(query)

    print("✅ Response:")
    print(response)
    print()
    print(f"💡 View this conversation in the UI at http://localhost:3000")
    print(f"📂 Session data persisted to strands_sessions/session_{session_id}/")
    print(f"🔄 Run again with same session ID to continue the conversation!")


if __name__ == "__main__":
    main()
