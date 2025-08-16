import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

// 自定义钩子，用于访问主题上下文
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};