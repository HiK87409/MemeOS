/**
 * 颜色配置文件
 * 统一管理应用中的所有颜色主题
 * 
 * 使用说明：
 * - 修改颜色时只需要在这个文件中修改
 * - 所有颜色都有详细的中文注释说明用途
 * - 支持浅色和深色两种模式
 */

// 颜色主题配置
export const colorThemes = { 
  // 默认主题 
  default: { 
    id: 'default', 
    name: '深度质感', 
    icon: '🎨', 
    description: '深度质感，层次分明的专业主题', 
    
    // 深色模式颜色配置 - 深邃夜空主题 
    dark: { 
      // === 背景颜色 === 
      bg: '#141415',           // 页面主背景 - 深灰色 
      surface: '#1a1a1b',      // 卡片/组件背景 - 比背景浅 
      elevated: '#1f1f1f',     // 悬浮/弹出组件背景 - 更浅的灰色 
      
      // === 文字颜色 === 
      text: '#f1f5f9',         // 主要文字 - 浅色文字 
      textSecondary: '#cbd5e1', // 次要文字 - 柔和的浅灰色 
      textMuted: '#94a3b8',    // 静音文字 - 温和的中灰色 
      
      // === 边框颜色 === 
      border: '#475569',       // 边框颜色 - 深石板色 
      
      // === 主色调 === 
      primary: '#3b82f6',      // 主要按钮、链接 - 经典蓝色 
      primaryHover: '#2563eb', // 主要按钮悬停 - 深蓝色 
      
      // === 次要色调 === 
      secondary: '#3b82f6',    // 次要按钮 - 蓝色
      secondaryHover: '#2563eb', // 次要按钮悬停 - 深蓝色 
      
      // === 强调色 === 
      accent: '#8b5cf6',       // 强调色 - 紫色 
      
      // === 状态颜色 === 
      success: '#10b981',      // 成功状态 - 翠绿色 
      warning: '#f59e0b',      // 警告状态 - 琥珀色 
      error: '#ef4444',        // 错误状态 - 红色 
      info: '#06b6d4'          // 信息状态 - 青色 
    }, 
    
    // 浅色模式颜色配置 - 深度质感主题 
    light: { 
      // === 背景颜色 === 
      bg: '#f8fafc',           // 页面主背景 - 极浅的蓝灰色 
      surface: '#e2e8f0',      // 卡片/组件背景 - 深一些的浅灰色（满足用户需求） 
      elevated: '#f1f5f9',     // 悬浮/弹出组件背景 - 更浅的灰色 
      
      // === 文字颜色 === 
      text: '#0f172a',         // 主要文字 - 深邃的深色 
      textSecondary: '#334155', // 次要文字 - 深石板色 
      textMuted: '#64748b',    // 静音文字 - 中等石板色 
      
      // === 边框颜色 === 
      border: '#cbd5e1',       // 边框颜色 - 中等浅灰色 
      
      // === 主色调 === 
      primary: '#3b82f6',      // 主要按钮、链接 - 经典蓝色 
      primaryHover: '#2563eb', // 主要按钮悬停 - 深蓝色 
      
      // === 次要色调 === 
      secondary: '#3b82f6',    // 次要按钮 - 蓝色
      secondaryHover: '#2563eb', // 次要按钮悬停 - 深蓝色 
      
      // === 强调色 === 
      accent: '#8b5cf6',       // 强调色 - 紫色 
      
      // === 状态颜色 === 
      success: '#10b981',      // 成功状态 - 翠绿色 
      warning: '#f59e0b',      // 警告状态 - 琥珀色 
      error: '#ef4444',        // 错误状态 - 红色 
      info: '#06b6d4'          // 信息状态 - 青色 
    } 
  } 
};

// 快速颜色预设（常用颜色的快捷方式）
export const colorPresets = {
  // 黑白色系
  black: '#000000',          // 纯黑色
  white: '#ffffff',          // 纯白色
  
  // 灰色系
  gray50: '#f9fafb',         // 极浅灰
  gray100: '#f3f4f6',        // 很浅灰
  gray200: '#e5e7eb',        // 浅灰
  gray300: '#d1d5db',        // 中浅灰
  gray400: '#9ca3af',        // 中灰
  gray500: '#6b7280',        // 深中灰
  gray600: '#4b5563',        // 深灰
  gray700: '#374151',        // 很深灰
  gray800: '#1f2937',        // 极深灰
  gray900: '#111827',        // 接近黑色
  
  // 蓝色系
  blue50: '#eff6ff',         // 极浅蓝
  blue500: '#3b82f6',        // 标准蓝
  blue600: '#2563eb',        // 深蓝
  
  // 紫色系
  purple50: '#faf5ff',       // 极浅紫
  purple500: '#8b5cf6',      // 标准紫
  purple600: '#7c3aed',      // 深紫
  
  // 状态色系
  green500: '#10b981',       // 成功绿
  yellow500: '#f59e0b',      // 警告黄
  red500: '#ef4444',         // 错误红
};

// 颜色使用说明
export const colorUsageGuide = {
  bg: '页面的主要背景色，影响整个应用的基调',
  surface: '卡片、面板、组件的背景色，是内容的主要载体',
  elevated: '悬浮元素、弹窗、下拉菜单的背景色，通常比surface更亮',
  text: '主要文字颜色，用于标题、正文等重要内容',
  textSecondary: '次要文字颜色，用于副标题、说明文字',
  textMuted: '静音文字颜色，用于提示、占位符等不重要的文字',
  border: '边框颜色，用于分割线、组件边框',
  primary: '主要操作色，用于重要按钮、链接、选中状态',
  primaryHover: '主要操作色的悬停状态',
  secondary: '次要操作色，用于普通按钮、次要操作',
  accent: '强调色，用于特殊标记、徽章、高亮',
  success: '成功状态色，用于成功提示、完成状态',
  warning: '警告状态色，用于警告提示、注意事项',
  error: '错误状态色，用于错误提示、危险操作',
  info: '信息状态色，用于信息提示、帮助说明'
};

// 导出默认主题
export const defaultTheme = colorThemes.default;

// 获取指定主题的颜色
export const getThemeColors = (themeId = 'default', isDark = false) => {
  const theme = colorThemes[themeId];
  if (!theme) {
    console.warn(`主题 "${themeId}" 不存在，使用默认主题`);
    return colorThemes.default[isDark ? 'dark' : 'light'];
  }
  return theme[isDark ? 'dark' : 'light'];
};

// 应用颜色到CSS变量
export const applyThemeColors = (colors) => {
  const root = document.documentElement;
  
  // 设置所有CSS变量
  root.style.setProperty('--theme-bg', colors.bg);
  root.style.setProperty('--theme-surface', colors.surface);
  root.style.setProperty('--theme-elevated', colors.elevated);
  root.style.setProperty('--theme-text', colors.text);
  root.style.setProperty('--theme-text-secondary', colors.textSecondary);
  root.style.setProperty('--theme-text-muted', colors.textMuted);
  root.style.setProperty('--theme-border', colors.border);
  root.style.setProperty('--theme-primary', colors.primary);
  root.style.setProperty('--theme-primary-hover', colors.primaryHover);
  root.style.setProperty('--theme-secondary', colors.secondary);
  root.style.setProperty('--theme-secondary-hover', colors.secondaryHover);
  root.style.setProperty('--theme-accent', colors.accent);
  root.style.setProperty('--theme-success', colors.success);
  root.style.setProperty('--theme-warning', colors.warning);
  root.style.setProperty('--theme-error', colors.error);
  root.style.setProperty('--theme-info', colors.info);
  
  // 设置基础样式
  document.body.style.color = colors.text;
  document.body.style.background = colors.bg;
};