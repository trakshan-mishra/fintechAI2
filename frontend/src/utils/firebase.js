// src/utils/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase config — values read from .env, with hardcoded fallbacks for local dev.
// These are PUBLIC client-side keys (safe to commit).
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || "AIzaSyD8LVvcCFaAl-SjIUqtLB_xF52NCi7oHP4",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || "capsaf-3ae54.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || "capsaf-3ae54",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || "capsaf-3ae54.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1061999838819",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || "1:1061999838819:web:97e4468db09c3dbd351a56",
  measurementId:     process.env.REACT_APP_FIREBASE_MEASUREMENT_ID     || "G-265M3M338Z",
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Auth setup
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection every time
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export default app;