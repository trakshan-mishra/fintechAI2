import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { setTokenGetter } from '../utils/api';

const AuthContext = createContext();
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { getToken, signOut } = useClerkAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const syncUser = async () => {
      try {
        const token = await getToken();
        
        // Try to get existing user
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(response.data);
          setLoading(false);
          return;
        } catch (e) {
          // 404 = not in DB yet, continue to sync
          // Any other error = also try sync
        }

        // Create user in our DB
        try {
          const response = await axios.post(
            `${API}/auth/clerk-sync`,
            {
              clerk_user_id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              name: clerkUser.fullName || clerkUser.firstName || 'User',
              picture: clerkUser.imageUrl || null,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUser(response.data.user);
        } catch (syncError) {
          console.error('Sync failed:', syncError?.response?.data || syncError.message);
          // Even if backend sync fails, set a minimal user object
          // so the app doesn't loop — Clerk user IS authenticated
          setUser({
            user_id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || 'User',
            picture: clerkUser.imageUrl || null,
          });
        }
      } catch (err) {
        console.error('Auth error:', err);
        // Fallback: use Clerk user directly so app doesn't loop
        setUser({
          user_id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || 'User',
          picture: clerkUser.imageUrl || null,
        });
      } finally {
        setLoading(false);
      }
    };

    syncUser();
  }, [clerkUser, clerkLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const getAuthToken = () => getToken();

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, getAuthToken, clerkUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};