#!/bin/bash

echo "Starting Strands UI Frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the dev server
echo "Frontend starting on http://localhost:3000"
npm run dev
