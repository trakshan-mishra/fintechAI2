# TradeTrack Pro Mobile App

A React Native (Expo) mobile application for TradeTrack Pro - Your All-in-One Financial Command Center.

## Features

### Authentication
- **Google Sign-in** - Quick social login
- **Phone OTP** - Sign up with phone number (+91 Indian numbers)
- **Email OTP** - Sign up with email address
- **Biometric Login** - Face ID / Touch ID support

### Dashboard
- Financial overview with balance, income, expense
- Interactive spending chart
- Quick action buttons (Add, Scan, Invoice, Tax)
- Live crypto price preview
- Pull-to-refresh for latest data

### Transactions
- View all income/expense transactions
- Add new transactions with category selection
- Filter by type and category
- Delete transactions

### Scanner
- Camera-based receipt scanner
- Capture receipts to auto-create transactions
- Category selection with amount input
- Camera flip functionality

### Markets
- **Cryptocurrency** - Live prices from CoinGecko API (INR)
- **Indian Stocks** - NSE/BSE major stocks
- **Commodities** - Oil, Gold, Silver, etc.
- Auto-refresh every 60 seconds

### AI Q&A
- Financial advice powered by Gemini AI
- Categories: SIP, Tax, Investment, Insurance, Retirement, Debt
- Pre-defined quick questions
- Custom question support
- Chat-style interface

### Invoices
- Create GST-compliant invoices
- Add multiple line items
- Auto-calculate GST (18%)
- View invoice history

### Tax Summary
- Income/Expense overview
- Taxable income calculation
- Estimated tax based on Indian slabs
- GST collected from invoices
- Tax-saving tips (80C, 80D, NPS)

### Settings
- Dark/Light theme toggle
- Profile management
- Biometric lock toggle
- Telegram integration
- Paytm import (coming soon)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)

### Installation

```bash
# Navigate to mobile directory
cd /app/mobile

# Install dependencies
npm install
# or
yarn install

# Start the development server
npx expo start
```

### Running on Device

1. Install **Expo Go** app from App Store / Play Store
2. Scan the QR code shown in terminal
3. App will load on your device

### Running on Emulator

```bash
# Android
npx expo start --android

# iOS (macOS only)
npx expo start --ios
```

## Building for Production

### Configure EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure the project
eas build:configure
```

### Build Android APK

```bash
# Development build
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

### Build iOS IPA

```bash
# Development build
eas build --platform ios --profile preview

# Production build (for App Store)
eas build --platform ios --profile production
```

## Project Structure

```
mobile/
├── App.js                 # Root component
├── app.json               # Expo configuration
├── eas.json               # EAS Build configuration
├── package.json           # Dependencies
└── src/
    ├── contexts/
    │   ├── AuthContext.js     # Authentication state
    │   └── ThemeContext.js    # Theme management
    ├── navigation/
    │   └── AppNavigator.js    # Navigation setup
    ├── screens/
    │   ├── AIQnAScreen.js     # AI Q&A chat
    │   ├── DashboardScreen.js # Main dashboard
    │   ├── InvoicesScreen.js  # Invoice management
    │   ├── LoginScreen.js     # Auth screen
    │   ├── MarketsScreen.js   # Market data
    │   ├── ScannerScreen.js   # Receipt scanner
    │   ├── SettingsScreen.js  # App settings
    │   ├── TaxSummaryScreen.js# Tax calculations
    │   └── TransactionsScreen.js # Transactions
    └── utils/
        ├── api.js             # API client
        └── config.js          # Configuration
```

## API Configuration

The app connects to the backend API. Update the API URL in `src/utils/config.js`:

```javascript
export const API_URL = 'https://crypto-tracker-172.preview.emergentagent.com/api';
```

For local development:
```javascript
export const API_URL = 'http://YOUR_IP:8001/api';
```

## Permissions

The app requires the following permissions:
- **Camera** - For receipt scanning
- **Biometric** - For Face ID / Touch ID login
- **Secure Storage** - For storing auth tokens

## Notes

- Market data updates every 60 seconds
- Crypto prices are fetched from CoinGecko (free tier)
- Stock prices are mock data (real API requires subscription)
- OTP system shows demo OTP for testing (configure Firebase/MSG91 for production)

## Publishing to App Stores

### Google Play Store
1. Build production AAB: `eas build --platform android --profile production`
2. Download the AAB file
3. Upload to Google Play Console
4. Fill in store listing details
5. Submit for review

### Apple App Store
1. Build production IPA: `eas build --platform ios --profile production`
2. Submit using EAS: `eas submit --platform ios`
3. Complete App Store Connect setup
4. Submit for review

## Support

Made for Indian users with ❤️

For issues or feature requests, contact the development team.
