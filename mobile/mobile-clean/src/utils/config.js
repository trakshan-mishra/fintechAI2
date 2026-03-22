import Constants from 'expo-constants';

// ─── Set your backend URL here ────────────────────────────────────────────────
//
// For LOCAL DEVELOPMENT on a real device:
//   Replace with your computer's local IP address (find it with `ipconfig` / `ifconfig`)
//   e.g. 'http://192.168.1.42:8001/api'
//
// For PRODUCTION (deployed backend):
//   e.g. 'https://your-backend.railway.app/api'
//
const PRODUCTION_URL = 'https://your-backend.railway.app/api'; // ← replace this
const LOCAL_IP_URL   = 'http://192.168.1.6:8081/api';          // ← replace x with your IP

// Auto-switch: uses local IP in dev, production URL in release builds
const isDev = __DEV__;
export const API_URL = isDev ? LOCAL_IP_URL : PRODUCTION_URL;

// App-wide constants
export const APP_NAME    = 'TradeTrack Pro';
export const APP_VERSION = '1.0.0';