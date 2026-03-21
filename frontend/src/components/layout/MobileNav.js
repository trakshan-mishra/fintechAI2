import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  Brain, 
  Settings
} from 'lucide-react';

const MobileNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard },
    { path: '/transactions', icon: Receipt },
    { path: '/markets', icon: TrendingUp },
    { path: '/ai-insights', icon: Brain },
    { path: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border glass-strong z-50 md:hidden" data-testid="mobile-nav">
      <nav className="flex justify-around p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`mobile-nav-${item.path.substring(1)}`}
              className={`flex items-center justify-center p-3 rounded-xl transition-all ${
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-6 h-6" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNav;