# TradeTrack Pro - Full-Stack Fintech Dashboard

> Production-ready financial management platform with AI insights, market data, and comprehensive tools tailored for Indian users.

## 🚀 Features

### Core Functionality
- ✅ **Income/Expense Tracking** - Categorized transactions with filtering & analytics
- ✅ **Receipt Scanner** - Camera/upload + OCR with camera flip for automatic data extraction
- ✅ **Paytm Import** - Bulk CSV import for transactions
- ✅ **GST Invoice Management** - Create invoices with automatic 18% GST calculations
- ✅ **Tax Summary** - Indian tax slabs, deductions, estimated tax calculator
- ✅ **AI Financial Advisor** - Chat with Gemini 3 Flash for personalized advice
- ✅ **Market Dashboard** - Real-time Crypto, Indian Stocks (NSE/BSE), Commodities (Oil, Gold, etc.)
- ✅ **AI Crypto Predictions** - Scrollable market analysis and trading recommendations
- ✅ **Telegram Notifications** - Transaction alerts and test notifications
- ✅ **Google OAuth + Biometric Auth** - Secure WebAuthn-based biometric login
- ✅ **Prominent Logout** - Visible sign out button in sidebar
- ✅ **Multi-Platform** - Web (desktop/mobile) + Native Android/iOS apps

### Technical Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, Framer Motion, Recharts
- **Backend**: FastAPI, MongoDB (Motor), Python 3.11
- **Mobile**: React Native (Expo) for Android & iOS
- **AI**: Gemini 3 Flash (Emergent LLM Integration)
- **Auth**: Emergent Google OAuth + WebAuthn API
- **APIs**: CoinGecko, Telegram Bot API

---

## 📦 Installation

### Prerequisites
- Node.js 18+ and Yarn
- Python 3.11+
- MongoDB
- Git

### Local Development Setup

#### 1. Clone the Repository
\`\`\`bash
git clone <your-repo-url>
cd tradetrack-pro
\`\`\`

#### 2. Backend Setup
\`\`\`bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add:
# - MONGO_URL=mongodb://localhost:27017
# - DB_NAME=tradetrack_db
# - GEMINI_API_KEY=<your-key>
# - TELEGRAM_BOT_TOKEN=<optional>

# Run backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
\`\`\`

#### 3. Frontend Setup
\`\`\`bash
cd ../frontend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Edit .env and set:
# REACT_APP_BACKEND_URL=http://localhost:8001

# Run frontend
yarn start
\`\`\`

#### 4. Mobile App Setup (Optional)
\`\`\`bash
cd ../mobile

# Install dependencies
yarn install

# Run on Android
yarn android

# Run on iOS (Mac only)
yarn ios

# Or use Expo Go
yarn start
\`\`\`

---

## 🔧 Local Code Updates

### Updating Backend
1. Modify files in `/app/backend/`
2. Hot reload is enabled (changes apply automatically)
3. For .env changes: \`sudo supervisorctl restart backend\`
4. For new dependencies: 
   \`\`\`bash
   pip install <package> && pip freeze > requirements.txt
   sudo supervisorctl restart backend
   \`\`\`

### Updating Frontend
1. Modify files in `/app/frontend/src/`
2. Hot reload enabled (browser auto-refreshes)
3. For package.json changes: 
   \`\`\`bash
   yarn add <package>
   # No restart needed
   \`\`\`

### Common File Locations
- **Pages**: `/app/frontend/src/pages/`
- **Components**: `/app/frontend/src/components/`
- **API Routes**: `/app/backend/server.py`
- **Styles**: `/app/frontend/src/index.css`

---

## 📱 Mobile App Structure

The mobile app code is generated separately. Create `/app/mobile` directory with:

\`\`\`bash
mkdir -p /app/mobile
cd /app/mobile
npx create-expo-app@latest . --template blank
\`\`\`

Then add the mobile app files provided in the deployment package.

---

## 🗂️ Full Source Code Structure

\`\`\`
/app/
├── backend/
│   ├── server.py                    # Main FastAPI app with all endpoints
│   ├── requirements.txt              # Python dependencies
│   └── .env                          # Backend configuration
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.js        # Landing with Google login
│   │   │   ├── AuthCallback.js       # OAuth callback handler  
│   │   │   ├── Dashboard.js          # Main dashboard with stats
│   │   │   ├── Transactions.js       # Transaction management
│   │   │   ├── Scanner.js            # Receipt scanner with flip
│   │   │   ├── Invoices.js           # GST invoice creator
│   │   │   ├── TaxSummary.js         # Tax calculations
│   │   │   ├── Markets.js            # Crypto/Stock/Commodities
│   │   │   ├── AIInsights.js         # AI chat & insights
│   │   │   └── Settings.js           # Settings with biometric
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.js      # Main layout wrapper
│   │   │   │   ├── Sidebar.js        # Desktop sidebar with logout
│   │   │   │   ├── MobileNav.js      # Mobile bottom nav
│   │   │   │   └── Header.js         # Page header with theme
│   │   │   └── ui/                   # Shadcn components
│   │   ├── contexts/
│   │   │   ├── AuthContext.js        # Auth state management
│   │   │   └── ThemeContext.js       # Theme management
│   │   ├── utils/
│   │   │   └── api.js                # API client
│   │   ├── App.js                    # Main app router
│   │   ├── App.css                   # App styles
│   │   └── index.css                 # Global styles & theme
│   ├── public/
│   ├── package.json
│   └── .env
├── mobile/                           # React Native app (see below)
├── README.md                         # This file
├── start.sh                          # Quick start script
└── auth_testing.md                   # Auth testing guide
\`\`\`

---

## 🎯 Key Features Implementation

### 1. Google OAuth Login
- Click "Sign In" or "Get Started Free" → Redirects to Emergent Auth
- Auto-redirects to dashboard after authentication
- Session stored in localStorage

### 2. Biometric Authentication
- Go to Settings → Enable biometric toggle
- Uses WebAuthn API (works on web browsers)
- Requires device with fingerprint/face ID

### 3. Camera Flip in Scanner
- Open Scanner page → Click "Use Camera"
- Click camera icon button in top-right to flip between front/back camera
- Capture and process receipts with OCR

### 4. Scrollable AI Predictions
- Go to Markets → Crypto tab
- Click "AI Prediction" on any coin
- Modal opens with scrollable content

### 5. Logout
- Prominent red "Sign Out" button at bottom of sidebar
- Also available on mobile nav menu

### 6. Telegram Notifications
- Settings → Telegram section
- Get Chat ID from @userinfobot
- Connect and send test notification

---

## 📊 API Documentation

API docs available at: \`http://localhost:8001/docs\`

### Key Endpoints
- **Auth**: \`/api/auth/*\`
- **Transactions**: \`/api/transactions/*\`
- **Markets**: \`/api/markets/*\`
- **AI**: \`/api/ai/*\`
- **Telegram**: \`/api/telegram/*\`

---

## 🔑 Environment Variables

### Backend (.env)
\`\`\`env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
GEMINI_API_KEY=sk-emergent-1684bFf693396049e0
COINGECKO_API_KEY=free
ALPHA_VANTAGE_API_KEY=demo
TELEGRAM_BOT_TOKEN=
\`\`\`

### Frontend (.env)
\`\`\`env
REACT_APP_BACKEND_URL=https://crypto-tracker-172.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
\`\`\`

---

## 🌐 Deployment

### Current Deployment
- **Live URL**: https://crypto-tracker-172.preview.emergentagent.com
- **Platform**: Emergent Cloud
- **Auto-deploy**: Enabled

### Mobile Deployment
See mobile app package for Play Store & App Store deployment instructions.

---

## 🆘 Troubleshooting

### Backend not starting
\`\`\`bash
tail -n 50 /var/log/supervisor/backend.err.log
sudo supervisorctl restart backend
\`\`\`

### Frontend not loading
\`\`\`bash
tail -n 50 /var/log/supervisor/frontend.err.log
sudo supervisorctl restart frontend
\`\`\`

### MongoDB connection issues
\`\`\`bash
sudo supervisorctl restart mongodb
mongosh  # Test connection
\`\`\`

---

## 📞 Support

- **Live App**: https://crypto-tracker-172.preview.emergentagent.com
- **Documentation**: /app/README.md
- **Auth Testing**: /app/auth_testing.md

---

Made with ❤️ for Indian users | Powered by Gemini 3 Flash AI
