// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider } from '../utils/firebase';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import axios from 'axios';

const API_BASE = `${(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ── Google login: sync with Worker using Firebase ID token ─────────
        try {
          const idToken = await firebaseUser.getIdToken();
          await axios.post(`${API_BASE}/auth/sync`, {}, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
        } catch (err) {
          console.warn('Auth sync failed (non-fatal):', err?.response?.status);
        }
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          picture: firebaseUser.photoURL || null,
          auth_method: 'google',
        });
      } else {
        // ── No Firebase user — check for OTP session token ──────────────────
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

  // Returns Firebase ID token (Google) or session token (OTP)
  const getAuthToken = useCallback(async () => {
    // Google users: get fresh Firebase ID token
    if (auth.currentUser) {
      try { return await auth.currentUser.getIdToken(); } catch {}
    }
    // OTP users: return stored session token
    return localStorage.getItem('session_token') || null;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  };

  // Called after OTP verify — store session token
  const login = (sessionToken, userData) => {
    localStorage.setItem('session_token', sessionToken);
    setUser(userData);
  };

  const logout = async () => {
    try { await firebaseSignOut(auth); } catch {}
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
