import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState(systemTheme || 'light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const colors = theme === 'dark' ? {
    background: '#020408',
    card: 'rgba(18, 18, 23, 0.95)',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    primary: '#818CF8',
    success: '#34D399',
    danger: '#F87171',
    border: 'rgba(255, 255, 255, 0.1)'
  } : {
    background: '#F0F2F5',
    card: 'rgba(255, 255, 255, 0.95)',
    text: '#0F172A',
    textSecondary: '#64748B',
    primary: '#6366F1',
    success: '#10B981',
    danger: '#EF4444',
    border: 'rgba(0, 0, 0, 0.1)'
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);