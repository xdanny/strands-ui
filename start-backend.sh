#!/bin/bash

echo "Starting Strands UI Backend..."

# Create .env if it doesn't exist in backend dir
if [ ! -f "backend/.env" ]; then
    echo "Creating .env file from template..."
    cp backend/.env.example backend/.env
fi

# Install dependencies and run using uv from root
echo "Backend starting on http://localhost:8000"
echo "Using uv to manage dependencies..."
uv run python backend/main.py
