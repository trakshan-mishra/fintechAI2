#!/bin/bash

echo "🚀 Starting TradeTrack Pro - Fintech Dashboard"
echo "=============================================="
echo ""

# Check if services are running
echo "📊 Checking service status..."
sudo supervisorctl status

echo ""
echo "✅ Services are running!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: https://crypto-tracker-172.preview.emergentagent.com"
echo "   Backend API: https://crypto-tracker-172.preview.emergentagent.com/api"
echo ""
echo "📱 Features available:"
echo "   - Income/Expense Tracker"
echo "   - Document Scanner with OCR"
echo "   - GST Invoice Management"
echo "   - Tax Summarization"
echo "   - AI Financial Insights (Gemini 3 Flash)"
echo "   - Crypto & Stock Market Data"
echo "   - Google OAuth Login"
echo "   - Telegram Bot Integration"
echo ""
echo "💡 Quick commands:"
echo "   View backend logs: tail -f /var/log/supervisor/backend.*.log"
echo "   View frontend logs: tail -f /var/log/supervisor/frontend.*.log"
echo "   Restart services: sudo supervisorctl restart all"
echo ""
echo "=============================================="
