#!/bin/bash

echo "=========================================="
echo "Testing Local Model Setup"
echo "=========================================="
echo ""

# Test LM Studio endpoint
echo "1. Testing LM Studio (http://localhost:1234)..."
if curl -s http://localhost:1234/v1/models > /dev/null 2>&1; then
    echo "   ✅ LM Studio is running!"
    echo "   Available models:"
    curl -s http://localhost:1234/v1/models | python3 -m json.tool | grep '"id"' | head -5
else
    echo "   ❌ LM Studio not detected on port 1234"
fi
echo ""

# Test Ollama endpoint
echo "2. Testing Ollama (http://localhost:11434)..."
if curl -s http://localhost:11434/v1/models > /dev/null 2>&1; then
    echo "   ✅ Ollama is running!"
    echo "   Available models:"
    curl -s http://localhost:11434/v1/models | python3 -m json.tool | grep '"id"' | head -5
else
    echo "   ❌ Ollama not detected on port 11434"
fi
echo ""

# Test uv installation
echo "3. Testing uv installation..."
if command -v uv &> /dev/null; then
    echo "   ✅ uv is installed"
    uv --version
    echo "   You can run: uvx strands 'your query'"
else
    echo "   ❌ uv not found"
    echo "   Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi
echo ""

# Test Python example agent
echo "4. Testing example agent..."
if [ -f "example-agent.py" ]; then
    echo "   ✅ Example agent file exists"
    echo "   Try running: python example-agent.py 'Hello!'"
else
    echo "   ❌ Example agent file not found"
fi
echo ""

echo "=========================================="
echo "Setup Summary"
echo "=========================================="
echo ""
echo "To test your local model with Strands:"
echo ""
echo "Option 1: Interactive chat"
echo "  $ uv run example-agent-interactive.py"
echo ""
echo "Option 2: Single query"
echo "  $ uv run example-agent.py 'Your question here'"
echo ""
echo "Option 3: Use Strands CLI directly"
echo "  $ uvx strands 'Your question here'"
echo ""
echo "Option 4: Use with the web UI"
echo "  $ ./start-all.sh"
echo "  Then create a new session in the browser"
echo ""
echo "Configuration:"
echo "  Edit example-agent*.py to set your model name and endpoint"
echo "  Default LM Studio: http://localhost:1234/v1"
echo "  Default Ollama: http://localhost:11434/v1"
echo ""
