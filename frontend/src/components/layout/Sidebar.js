import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, Receipt, Scan, FileText, Calculator, 
  TrendingUp, Brain, Settings, LogOut, Sparkles, 
  BarChart3, Compass, X
} from 'lucide-react';

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/discover', label: 'Discover', icon: Compass, highlight: true },
    { path: '/trading', label: 'Trading Dashboard', icon: Sparkles },
    { path: '/transactions', label: 'Transactions', icon: Receipt },
    { path: '/scanner', label: 'Scanner', icon: Scan },
    { path: '/invoices', label: 'Invoices', icon: FileText },
    { path: '/tax', label: 'Tax Summary', icon: Calculator },
    { path: '/markets', label: 'Markets', icon: TrendingUp },
    { path: '/portfolio', label: 'Portfolio', icon: BarChart3 },
    { path: '/ai-chat', label: 'AI Chat', icon: Brain },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-background/95 backdrop-blur-xl border-r border-border/50 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Close */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">TradeTrack<span className="text-primary">Pro</span></span>
            </div>
            <button onClick={onClose} className="md:hidden p-1.5 rounded-lg hover:bg-accent transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.highlight && !isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">AI</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User */}
          {user && (
            <div className="p-4 border-t border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">{user.email?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || user.email?.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <LogOut className="w-4 h-4" /><span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
