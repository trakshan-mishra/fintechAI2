// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider } from '../utils/firebase';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import axios from 'axios';

// Strip trailing slash defensively here too
const API_BASE = `${(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ── Check if we already have a valid session token ──────────────────
        const existingToken = localStorage.getItem('session_token');
        if (existingToken) {
          try {
            const res = await axios.get(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${existingToken}` },
            });
            setUser(res.data);
            setLoading(false);
            return;
          } catch {
            localStorage.removeItem('session_token');
          }
        }

        // ── Exchange Firebase ID token for backend session ──────────────────
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await axios.post(`${API_BASE}/auth/google`, { id_token: idToken });
          localStorage.setItem('session_token', res.data.session_token);
          setUser(res.data.user);
        } catch (err) {
          // Backend /auth/google not available yet (old server) or offline.
          // Let the user in using Firebase identity so the app still works.
          console.warn('Backend Google auth unavailable, using Firebase identity:', err?.response?.status);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            photo_url: firebaseUser.photoURL || null,
            auth_method: 'google',
          });
        }
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

  // Always use the stored session token
  const getAuthToken = useCallback(async () => {
    return localStorage.getItem('session_token') || null;
  }, []);

  // Returns full UserCredential so caller can do result?.user?.getIdToken()
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  };

  // Called after OTP verify — store session and set user
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