import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { User, Moon, Sun, Bell, Smartphone, Info, Send } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [telegramChatId, setTelegramChatId] = useState('');
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/sign-in');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      if (window.PublicKeyCredential) {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const handleConnectTelegram = async () => {
    if (!telegramChatId.trim()) {
      toast.error('Please enter a valid Chat ID');
      return;
    }

    try {
      await api.connectTelegram(parseInt(telegramChatId));
      setIsTelegramConnected(true);
      toast.success('Telegram connected successfully!');
    } catch (error) {
      console.error('Telegram connect error:', error);
      toast.error('Failed to connect Telegram');
    }
  };

  const handleTestNotification = async () => {
    try {
      await api.sendTelegramNotification('🔔 Test notification from TradeTrack Pro! Your Telegram bot is working correctly.');
      toast.success('Test notification sent! Check your Telegram.');
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test notification. Make sure Telegram is connected.');
    }
  };

  const handleEnableBiometric = async () => {
    if (!biometricAvailable) {
      toast.error('Biometric authentication is not available on this device');
      return;
    }

    try {
      // Generate challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'TradeTrack Pro',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(user.user_id),
            name: user.email,
            displayName: user.name
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000
        }
      });

      if (credential) {
        setBiometricEnabled(true);
        // Store credential ID in localStorage for future authentication
        localStorage.setItem('biometric_credential_id', credential.id);
        toast.success('Biometric authentication enabled successfully!');
      }
    } catch (error) {
      console.error('Biometric enable error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled');
      } else {
        toast.error('Failed to enable biometric authentication');
      }
    }
  };

  const handleDisableBiometric = () => {
    setBiometricEnabled(false);
    localStorage.removeItem('biometric_credential_id');
    toast.success('Biometric authentication disabled');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <AppLayout>
      <Header title="Settings" />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Settings */}
        <Card className="glass" data-testid="profile-settings-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={user?.picture || 'https://images.pexels.com/photos/7580937/pexels-photo-7580937.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=150&w=150'}
                alt={user?.name}
                className="w-20 h-20 rounded-full object-cover"
                data-testid="profile-picture"
              />
              <div className="flex-1">
                <p className="font-bold text-lg" data-testid="profile-name">{user?.name}</p>
                <p className="text-sm text-muted-foreground" data-testid="profile-email">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="glass" data-testid="appearance-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="theme-toggle" className="text-base font-semibold">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                data-testid="theme-switch"
              />
            </div>
          </CardContent>
        </Card>

        {/* Telegram Bot */}
        <Card className="glass" data-testid="telegram-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Telegram Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isTelegramConnected ? (
              <>
                <div className="p-4 rounded-xl glass-strong">
                  <h4 className="font-semibold mb-3">How to connect your Telegram:</h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Open Telegram and search for <code className="px-2 py-1 rounded bg-primary/10">@userinfobot</code></li>
                    <li>Send <code className="px-2 py-1 rounded bg-primary/10">/start</code> to get your Chat ID</li>
                    <li>Copy your Chat ID and paste it below</li>
                    <li>Click "Connect Telegram" to link your account</li>
                  </ol>
                </div>
                <div>
                  <Label htmlFor="telegram-id">Telegram Chat ID</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="telegram-id"
                      placeholder="Enter your Telegram Chat ID"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      data-testid="telegram-chat-id-input"
                    />
                    <Button onClick={handleConnectTelegram} data-testid="connect-telegram-button">
                      Connect
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <Bell className="w-5 h-5" />
                    <span className="font-semibold">Telegram Connected!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Chat ID: {telegramChatId}
                  </p>
                </div>
                <Button
                  onClick={handleTestNotification}
                  variant="outline"
                  className="w-full glass-strong"
                  data-testid="test-notification-button"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Notification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Biometric Authentication */}
        <Card className="glass" data-testid="biometric-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Biometric Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            {biometricAvailable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Enable Biometric Login</Label>
                    <p className="text-sm text-muted-foreground">
                      Use fingerprint or face recognition for secure login
                    </p>
                  </div>
                  <Switch
                    checked={biometricEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleEnableBiometric();
                      } else {
                        handleDisableBiometric();
                      }
                    }}
                    data-testid="biometric-switch"
                  />
                </div>
                {biometricEnabled && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Smartphone className="w-5 h-5" />
                      <span className="font-semibold">Biometric authentication is active</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl glass-strong flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Biometric authentication not available</p>
                  <p className="text-muted-foreground">
                    Your device or browser doesn't support biometric authentication. 
                    Please ensure you're using a modern browser (Chrome, Safari, Edge) 
                    and your device has fingerprint or face recognition hardware.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* About */}
        <Card className="glass" data-testid="about-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              About TradeTrack Pro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono font-semibold">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-semibold">Production Ready</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Made for</span>
                <span className="font-semibold">Indian Users</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Model</span>
                <span className="font-semibold">Gemini 3 Flash</span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-muted-foreground leading-relaxed">
                  All-in-one fintech dashboard with AI-powered insights, real-time market data (Crypto, Stocks, Commodities), 
                  comprehensive financial management, GST invoicing, tax calculations, receipt scanning with OCR, 
                  and Telegram notifications - specifically designed for Indian users and businesses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
