// src/App.js
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { loadBinanceSymbols } from "./utils/binance";
import './App.css';
import TradingDashboard from './pages/TradingDashboard';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Scanner from './pages/Scanner';
import Invoices from './pages/Invoices';
import TaxSummary from './pages/TaxSummary';
import Markets from './pages/Markets';
import CoinDetail from './pages/CoinDetail';
import AssetDetail from './pages/AssetDetail';
import Portfolio from './pages/Portfolio';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';
import SignupLogin from './pages/SignupLogin';

function App() {
  useEffect(() => {
    loadBinanceSymbols();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            {/* Firebase-based auth — single page handles signup + login */}
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
            <Route path="/markets/coin/:coinId" element={<CoinDetail />} />
            <Route path="/markets/asset/:symbol" element={<AssetDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;