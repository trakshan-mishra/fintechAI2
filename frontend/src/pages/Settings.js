import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { User, Moon, Sun, Info } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/sign-in');
    }
  }, [user, loading, navigate]);

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
            <div>
              <p className="font-bold text-lg" data-testid="profile-name">{user?.name}</p>
              <p className="text-sm text-muted-foreground" data-testid="profile-email">{user?.email}</p>
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

        {/* About */}
        <Card className="glass" data-testid="about-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              About TradeTrack Pro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Built for</span>
                <span className="font-semibold">Indian investors</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data sources</span>
                <span className="font-semibold">CoinGecko · Binance · Yahoo Finance</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-semibold">Indian Rupee (₹)</span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-muted-foreground leading-relaxed">
                  Track markets, manage your portfolio, scan receipts, and get AI-powered
                  insights — all in one place. Real-time prices for crypto, stocks, and
                  commodities, with GST invoicing and tax tools built for Indian users.
                </p>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Not SEBI-registered. AI analysis is for information only and is not financial advice.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
