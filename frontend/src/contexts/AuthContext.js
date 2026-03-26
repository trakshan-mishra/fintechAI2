// src/contexts/AuthContext.js
// Replaces Clerk — uses Firebase Auth for Google sign-in + custom OTP session tokens
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider } from '../utils/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Firebase user listener ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync Firebase user to our MongoDB
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await axios.post(
            `${API_BASE}/auth/firebase-sync`,
            {
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              picture: firebaseUser.photoURL,
            },
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
          setUser(res.data.user);
        } catch (err) {
          console.error('Firebase sync failed:', err);
          // Still set a basic user object so the UI isn't locked out
          setUser({
            user_id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            picture: firebaseUser.photoURL || null,
          });
        }
      } else {
        // Check for OTP session token (non-Google auth)
        const sessionToken = localStorage.getItem('session_token');
        if (sessionToken) {
          try {
            const res = await axios.get(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${sessionToken}` },
            });
            setUser(res.data);
          } catch {
            localStorage.removeItem('session_token');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Get auth token (Firebase ID token or OTP session token) ───────────────
  const getAuthToken = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      return await firebaseUser.getIdToken();
    }
    return localStorage.getItem('session_token') || null;
  }, []);

  // ── Google sign-in ─────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  // ── OTP login (called by SignupLogin after backend verify) ─────────────────
  const login = (sessionToken, userData) => {
    localStorage.setItem('session_token', sessionToken);
    setUser(userData);
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    localStorage.removeItem('session_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getAuthToken, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};