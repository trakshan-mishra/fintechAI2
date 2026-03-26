// src/utils/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD8LVvcCFaAl-SjIUqtLB_xF52NCi7oHP4",
  authDomain: "capsaf-3ae54.firebaseapp.com",
  projectId: "capsaf-3ae54",
  storageBucket: "capsaf-3ae54.firebasestorage.app",
  messagingSenderId: "1061999838819",
  appId: "1:1061999838819:web:97e4468db09c3dbd351a56",
  measurementId: "G-265M3M338Z"
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Auth setup
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Optional: force account selection every time
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export default app;