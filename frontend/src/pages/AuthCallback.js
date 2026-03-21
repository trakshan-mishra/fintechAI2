import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          navigate('/sign-in');
          return;
        }

        // Exchange session_id for session_token
        const response = await api.createSession(sessionId);
        const { user, session_token } = response.data;

        // Store session and user data
        login(session_token, user);

        // Clear hash and redirect to dashboard
        window.history.replaceState(null, '', '/dashboard');
        navigate('/dashboard', { replace: true, state: { user } });
      } catch (error) {
        console.error('Session exchange failed:', error);
        navigate('/sign-in');
      }
    };

    processSession();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" data-testid="auth-loading-spinner" />
        <p className="text-lg text-muted-foreground" data-testid="auth-processing-text">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;