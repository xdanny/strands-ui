"""
Example Agent Configuration

This demonstrates how to create a reusable Strands agent that can be used
with or without the UI. Your agent logic stays separate from the UI integration.

Usage:
    # Without UI
    agent = create_my_agent()
    response = agent("What's the weather?")

    # With UI (from agent_server.py)
    agent = create_my_agent(ui_hooks=UIHooks(...))
    response = agent("What's the weather?")
"""

from strands import Agent, tool
from strands.models.openai import OpenAIModel
from typing import Optional


# Define your tools
@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city.

    Args:
        city: Name of the city

    Returns:
        Weather information as a string
    """
    # In a real implementation, you'd call a weather API
    return f"Weather in {city}: Sunny, 72°F (22°C)"


@tool
def search_docs(query: str) -> str:
    """Search through documentation.

    Args:
        query: Search query

    Returns:
        Relevant documentation snippets
    """
    # In a real implementation, you'd search your docs database
    return f"Found documentation about '{query}':\n- Getting started guide\n- API reference\n- Best practices"


@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression.

    Args:
        expression: Math expression to evaluate (e.g., "2 + 2")

    Returns:
        Result of the calculation
    """
    try:
        # Note: eval is used here for demo purposes only
        # In production, use a proper math parser
        result = eval(expression, {"__builtins__": {}})
        return f"{expression} = {result}"
    except Exception as e:
        return f"Error calculating '{expression}': {str(e)}"


def create_my_agent(session_id=None, ui_hooks=None) -> Agent:
    """
    Create your custom agent with optional session persistence and UI hooks.

    This function encapsulates all your agent configuration:
    - Model selection and parameters
    - Tools available to the agent
    - System prompt
    - Optional session persistence
    - Optional UI hooks for visualization

    Args:
        session_id: Optional session ID for persistence (stores in strands_sessions/)
        ui_hooks: Optional UIHooks instance for UI visualization

    Returns:
        Configured Agent instance
    """

    # Configure the model

    # Option 1: Ollama (requires ollama serve to be running)
    model = OpenAIModel(
        client_args={
            "base_url": "http://localhost:11434/v1",
            "api_key": "not-needed",
        },
        model_id="qwen2.5-coder:latest",  # or any model you have pulled
        params={
            "temperature": 0.7,
            "max_tokens": 2000,
        }
    )

    # Option 2: OpenAI (uncomment to use)
    # import os
    # model = OpenAIModel(
    #     client_args={
    #         "api_key": os.getenv("OPENAI_API_KEY"),
    #     },
    #     model_id="gpt-4o-mini",
    #     params={
    #         "temperature": 0.7,
    #         "max_tokens": 2000,
    #     }
    # )

    # Option 3: LM Studio (requires LM Studio to be running)
    # model = OpenAIModel(
    #     client_args={
    #         "base_url": "http://localhost:1234/v1",
    #         "api_key": "not-needed",
    #     },
    #     model_id="local-model",
    #     params={
    #         "temperature": 0.7,
    #         "max_tokens": 2000,
    #     }
    # )

    # Prepare hooks list
    hooks = [ui_hooks] if ui_hooks else []
    print(f"[Agent] Creating agent with {len(hooks)} hooks")
    if hooks:
        print(f"[Agent] Hook types: {[type(h).__name__ for h in hooks]}")

    if session_id:
        print(f"[Agent] Using session persistence: {session_id}")

    # Create and return the agent
    agent = Agent(
        model=model,

        # Add session persistence if session_id is provided
        session_id=session_id,

        # Add all your tools
        tools=[
            get_weather,
            search_docs,
            calculate,
        ],

        # Add UI hooks if provided
        hooks=hooks,

        # Your system prompt
        system_prompt="""You are a helpful AI assistant with access to several tools:

- get_weather: Get current weather for any city
- search_docs: Search through documentation
- calculate: Perform mathematical calculations

Be concise and friendly. When you need information, use the appropriate tool."""
    )

    return agent


# Allow running this agent standalone
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: uv run my_agent.py 'Your question here'")
        print("\nExample:")
        print("  uv run my_agent.py 'What is the weather in Tokyo?'")
        print("  uv run my_agent.py 'Calculate 25 * 4'")
        sys.exit(1)

    query = " ".join(sys.argv[1:])

    print(f"\n🤖 Query: {query}")
    print("💭 Thinking...\n")

    # Create agent without UI
    agent = create_my_agent()

    # Get response
    response = agent(query)

    print("✅ Response:")
    print(response)
    print()
