#!/bin/bash

echo "🚀 Running TradeTrack App..."

# Start backend

cd backend
uvicorn server:app --reload --port 8001 &
BACKEND_PID=$!

echo "✅ Backend running on http://localhost:8001"

# Start frontend

cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Frontend running on http://localhost:5173"

wait $BACKEND_PID $FRONTEND_PID
