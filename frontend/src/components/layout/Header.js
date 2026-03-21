import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/button';

const Header = ({ title }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between mb-8" data-testid="page-header">
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight" data-testid="page-title">
        {title}
      </h1>
      <Button
        onClick={toggleTheme}
        variant="outline"
        size="icon"
        className="rounded-full"
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