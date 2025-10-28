#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "strands-agents-builder",
#   "openai",
# ]
# ///
"""
Simple Strands agent using Ollama/LM Studio OpenAI-compatible endpoint

This example shows how to configure a Strands agent to use a local
OpenAI-compatible API server like Ollama or LM Studio.

Usage:
    uv run example-agent.py "Your question here"
"""

import sys
from strands import Agent
from strands.models.openai import OpenAIModel

# Configure the model to use your local OpenAI-compatible endpoint
model = OpenAIModel(
    client_args={
        # Your local API endpoint
        # Default Ollama: http://localhost:11434/v1
        # Default LM Studio: http://localhost:1234/v1
        "base_url": "http://localhost:11434/v1",  # Change to your endpoint

        # API key (usually not needed for local servers, but required field)
        # You can use any dummy value for local servers
        "api_key": "not-needed",
    },

    # The model name from your Ollama/LM Studio
    # Common examples: "llama3", "mistral", "phi3", "qwen", "openai/gpt-oss-20b"
    model_id="openai/gpt-oss-20b",  # Change this to your model name

    # Model parameters
    params={
        # Temperature for response randomness (0.0 to 1.0)
        "temperature": 0.7,

        # Maximum tokens in response
        "max_tokens": 2000,
    }
)

# Create the agent with the configured model
agent = Agent(
    model=model,

    # Optional: Add tools/functions for the agent to use
    # tools=[...],

    # Optional: System instructions
    system_prompt="""You are a helpful AI assistant running locally.
Be concise and friendly in your responses."""
)


def main():
    """Run the agent with a query"""
    if len(sys.argv) < 2:
        print("Usage: python example-agent.py 'Your question here'")
        print("\nExample queries:")
        print("  python example-agent.py 'What is Python?'")
        print("  python example-agent.py 'Write a hello world function'")
        sys.exit(1)

    query = " ".join(sys.argv[1:])

    print(f"\n🤖 Query: {query}\n")
    print("💭 Thinking...\n")

    # Invoke the agent
    response = agent(query)

    print("✅ Response:")
    print(response)
    print()


if __name__ == "__main__":
    main()
