import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Compass, Brain, Settings } from 'lucide-react';

const MobileNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { path: '/discover', icon: Compass, label: 'Discover' },
    { path: '/markets', icon: TrendingUp, label: 'Markets' },
    { path: '/ai-chat', icon: Brain, label: 'AI' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border/50 glass-strong z-50 md:hidden safe-bottom-nav">
      <div className="flex justify-around items-center h-14 safe-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-all min-w-[48px] ${
                isActive(item.path)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
