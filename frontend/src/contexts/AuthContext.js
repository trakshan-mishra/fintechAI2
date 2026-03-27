// src/contexts/AuthContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider } from '../utils/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import axios from 'axios';

// ✅ FIXED API BASE (WORKS EVERYWHERE)
const API_BASE = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : "https://fintechai2.onrender.com/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 AUTH LISTENER (SAFE VERSION)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken();

          try {
            // ✅ TRY BACKEND SYNC (OPTIONAL)
            const res = await axios.post(
              `${API_BASE}/auth/firebase-sync`,
              {
                email: firebaseUser.email,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                picture: firebaseUser.photoURL,
              },
              {
                headers: { Authorization: `Bearer ${idToken}` },
              }
            );

            setUser(res.data.user);

          } catch (err) {
            console.log("⚠️ Sync failed → fallback user");

            // ✅ FALLBACK USER (IMPORTANT)
            setUser({
              user_id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              picture: firebaseUser.photoURL || null,
            });
          }

        } else {
          // OTP fallback
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

      } catch (e) {
        console.error("Auth crash prevented:", e);
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 TOKEN GETTER
  const getAuthToken = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      return await firebaseUser.getIdToken();
    }
    return localStorage.getItem('session_token') || null;
  }, []);

  // 🔥 GOOGLE LOGIN
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  // 🔥 OTP LOGIN
  const login = (sessionToken, userData) => {
    localStorage.setItem('session_token', sessionToken);
    setUser(userData);
  };

  // 🔥 LOGOUT
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    localStorage.removeItem('session_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, getAuthToken, signInWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};