import React, { createContext, useState, useEffect } from 'react';
import { colorThemes, getThemeColors, applyThemeColors } from '../config/colors';

// 创建主题上下文
export const ThemeContext = createContext();

// 从颜色配置文件获取主题选项
const themeOptions = Object.values(colorThemes);



// 主题上下文提供者组件
export const ThemeProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');

  // 初始化主题设置
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      const savedTheme = localStorage.getItem('selectedTheme');
      
      // 检查documentElement上是否已经有dark类，这可能是index.html脚本设置的
      const hasDarkClass = document.documentElement.classList.contains('dark');
      
      let initialDarkMode;
      if (savedMode !== null) {
        initialDarkMode = JSON.parse(savedMode);
      } else {
        // 如果没有保存的设置，使用系统偏好，但优先考虑index.html脚本已经设置的类
        initialDarkMode = hasDarkClass || window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      const initialTheme = savedTheme || 'default';
      
      console.log('🎨 [ThemeContext] 初始化主题:', { 
        savedMode, 
        hasDarkClass, 
        initialDarkMode, 
        initialTheme 
      });
      
      setDarkMode(initialDarkMode);
      setCurrentTheme(initialTheme);
      setIsInitialized(true);
    } catch (error) {
      console.error('主题初始化失败:', error);
      setDarkMode(false);
      setCurrentTheme('default');
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    // 适用于Tailwind的暗色模式
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // 获取当前主题的颜色配置
    const colors = getThemeColors(currentTheme, darkMode);
    
    // 应用颜色到CSS变量
    applyThemeColors(colors);
    
    // 只在初始化完成后才保存设置，避免初始化时覆盖localStorage
    if (isInitialized) {
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
      localStorage.setItem('selectedTheme', currentTheme);
    }
  }, [darkMode, currentTheme, isInitialized]);

  const toggleDarkMode = () => {
    console.log('🔄 切换主题模式，当前:', darkMode ? '深色' : '浅色');
    setDarkMode(prev => {
      const newMode = !prev;
      console.log('🔄 切换到:', newMode ? '深色' : '浅色');
      return newMode;
    });
  };

  const changeTheme = (themeId) => {
    const theme = themeOptions.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(themeId);
      console.log('🔄 切换主题到:', theme.name);
    }
  };


  // 上下文值
  const value = {
    darkMode,
    toggleDarkMode,
    currentTheme,
    changeTheme,
    themeOptions,
    isInitialized
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;