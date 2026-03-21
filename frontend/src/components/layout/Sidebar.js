import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  Scan, 
  FileText, 
  Calculator, 
  TrendingUp, 
  Brain, 
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transactions', label: 'Transactions', icon: Receipt },
    { path: '/scanner', label: 'Scanner', icon: Scan },
    { path: '/invoices', label: 'Invoices', icon: FileText },
    { path: '/tax', label: 'Tax Summary', icon: Calculator },
    { path: '/markets', label: 'Markets', icon: TrendingUp },
    { path: '/ai-insights', label: 'AI Chat', icon: Brain },
    { path: '/ai-qna', label: 'AI Q&A', icon: Brain },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-full w-20 lg:w-64 border-r border-border glass-strong z-50 hidden md:flex flex-col" data-testid="sidebar">
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="sidebar-logo">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <span className="hidden lg:block text-xl font-bold tracking-tight">TradeTrack Pro</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        {user && (
          <div className="flex items-center gap-3 p-3 rounded-xl glass mb-3" data-testid="user-profile-card">
            <img 
              src={user.picture || 'https://images.pexels.com/photos/7580937/pexels-photo-7580937.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100'} 
              alt={user.name} 
              className="w-10 h-10 rounded-full object-cover"
              data-testid="user-avatar"
            />
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" data-testid="user-name">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate" data-testid="user-email">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          data-testid="logout-button"
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all font-semibold"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden lg:block">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;