#!/bin/bash

echo "🚀 Running TradeTrack App..."

# =========================

# BACKEND

# =========================

cd backend || exit

# Activate venv

source venv/bin/activate

# Run backend

uvicorn server:app --reload --port 8001 &
BACKEND_PID=$!

echo "✅ Backend running on http://localhost:8001"

# =========================

# FRONTEND

# =========================

cd ../frontend || exit

npm start &
FRONTEND_PID=$!

echo "✅ Frontend running on http://localhost:3000"

wait $BACKEND_PID $FRONTEND_PID
