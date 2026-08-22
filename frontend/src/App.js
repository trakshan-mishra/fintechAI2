// src/App.js
import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

// Lazy-load all pages — only loads what's needed (reduces initial bundle from 1.6MB)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SignupLogin = lazy(() => import('./pages/SignupLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Invoices = lazy(() => import('./pages/Invoices'));
const TaxSummary = lazy(() => import('./pages/TaxSummary'));
const Markets = lazy(() => import('./pages/Markets'));
const Discover = lazy(() => import('./pages/Discover'));
const CoinDetail = lazy(() => import('./pages/CoinDetail'));
const AssetDetail = lazy(() => import('./pages/AssetDetail'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const AIChat = lazy(() => import('./pages/AIChat'));
const Settings = lazy(() => import('./pages/Settings'));
const TradingDashboard = lazy(() => import('./pages/TradingDashboard'));

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="min-h-screen w-full overflow-x-hidden bg-background">
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/sign-in" element={<SignupLogin />} />
                <Route path="/sign-up" element={<SignupLogin />} />

                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/ai-chat" element={<AIChat />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/trading" element={<TradingDashboard />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/tax" element={<TaxSummary />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/markets/coin/:coinId" element={<CoinDetail />} />
                <Route path="/markets/asset/:symbol" element={<AssetDetail />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>

            <Toaster position="top-right" />
          </BrowserRouter>
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
