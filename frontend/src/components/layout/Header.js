import React from 'react';
import { Moon, Sun, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/button';

const Header = ({ title, onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between mb-6 gap-3" data-testid="page-header">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onMenuClick && (
          <Button
            onClick={onMenuClick}
            variant="ghost"
            size="icon"
            className="md:hidden rounded-lg shrink-0"
            data-testid="menu-button"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight truncate" data-testid="page-title">
          {title}
        </h1>
      </div>
      <Button
        onClick={toggleTheme}
        variant="outline"
        size="icon"
        className="rounded-full shrink-0"
        data-testid="theme-toggle-button"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" data-testid="sun-icon" />
        ) : (
          <Moon className="w-5 h-5" data-testid="moon-icon" />
        )}
      </Button>
    </header>
  );
};

export default Header;
