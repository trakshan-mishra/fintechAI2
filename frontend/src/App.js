import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Scanner from './pages/Scanner';
import Invoices from './pages/Invoices';
import TaxSummary from './pages/TaxSummary';
import Markets from './pages/Markets';
import AIInsights from './pages/AIInsights';
import AIQNA from './pages/AIQNA';
import Settings from './pages/Settings';

const CLERK_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!CLERK_KEY) {
  throw new Error('Missing REACT_APP_CLERK_PUBLISHABLE_KEY in .env');
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Clerk hosted sign-in / sign-up pages */}
      <Route
        path="/sign-in/*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <SignIn routing="path" path="/sign-in" afterSignInUrl="/dashboard" />
          </div>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <SignUp routing="path" path="/sign-up" afterSignUpUrl="/dashboard" />
          </div>
        }
      />

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/scanner" element={<Scanner />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/tax" element={<TaxSummary />} />
      <Route path="/markets" element={<Markets />} />
      <Route path="/ai-insights" element={<AIInsights />} />
      <Route path="/ai-qna" element={<AIQNA />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AppRouter />
            <Toaster position="top-right" />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;