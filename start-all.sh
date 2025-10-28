#!/bin/bash

# Start both backend and frontend
echo "Starting Strands UI (Backend + Frontend)..."

# Start backend in background
./start-backend.sh &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
./start-frontend.sh &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "Strands UI is starting..."
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
