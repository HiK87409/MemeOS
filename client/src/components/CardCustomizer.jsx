import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheck, FiRefreshCw, FiSettings, FiPlus, FiTrash2, FiShuffle } from 'react-icons/fi';
import { useTheme } from '../hooks/useTheme';
import { API_BASE_URL } from '../config/env';
import InputDialog from './InputDialog';

const CardCustomizer = ({ 
  isOpen, 
  onClose, 
  position, 
  noteId, 
  currentSettings = {},
  onApply,
  onApplyToAll,
  onResetThisCard,
  onResetAllToDefault
}) => {
  const { darkMode, isInitialized } = useTheme();
  // 固定的默认颜色，不随主题变化
  const getDefaultColors = () => {
    return {
      borderWidth: 1,
      borderColor: '',
      shadowSize: 'sm',
      backgroundColor: '',
      backgroundGradient: false,
      gradientColors: ['', ''], // 包含两个空字符串的数组，避免undefined值
      borderRadius: 8,
      maxLines: 6,
      // 为所有字体颜色设置默认值，避免undefined导致的React警告
      mainTextColor: '',
      secondaryTextColor: '',
      linkTextColor: '#3b82f6', // 默认链接文本颜色为蓝色
      buttonTextColor: '',
      referenceTextColor: '',
      textColor: ''
    };
  };

  const [settings, setSettings] = useState(() => {
    return {
      ...getDefaultColors(),
      ...currentSettings
    };
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [savedColorSchemes, setSavedColorSchemes] = useState([]);
  const [generatedGradients, setGeneratedGradients] = useState([]);
  const [isResetting, setIsResetting] = useState(false);
  const [showInputDialog, setShowInputDialog] = useState(false);

  useEffect(() => {
    // 如果正在重置，不要覆盖设置
    if (isResetting) {
      return;
    }
    
    // 只在设置面板首次打开时更新设置，避免覆盖用户的修改
    if (isOpen) {
      console.log('🔧 [CardCustomizer] 设置面板打开，加载最新配置:', currentSettings);
      
      // 确保所有字段都有值，但保留用户自定义的颜色设置
      const defaultColors = getDefaultColors();
      const mergedSettings = { ...defaultColors };
      
      // 只合并currentSettings中存在的非空值，优先保留用户自定义颜色
      Object.keys(currentSettings || {}).forEach(key => {
        // 如果用户设置了自定义颜色（非空字符串），则使用用户设置
        if (currentSettings[key] !== '' && currentSettings[key] !== undefined && currentSettings[key] !== null) {
          mergedSettings[key] = currentSettings[key];
        }
      });
      
      setSettings(mergedSettings);
      console.log('🔧 [CardCustomizer] 设置已更新:', mergedSettings);
    }
  }, [isOpen, isResetting]); // 移除currentSettings依赖，避免用户修改时被重置

  // 加载保存的配置方案
  const loadColorSchemes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('未找到认证令牌，跳过加载配置方案');
        setSavedColorSchemes([]);
        return;
      }

      // 不再按主题模式过滤，加载所有配置方案
      const response = await fetch(`${API_BASE_URL}/notes/color-schemes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const schemes = await response.json();
        setSavedColorSchemes(schemes || []);
        console.log('配置方案加载成功:', schemes);
      } else {
        const errorData = await response.text();
        console.error('加载配置方案失败:', response.status, errorData);
        
        // 移除认证错误处理，避免登录初期误判导致配置方案被清空
      }
    } catch (error) {
      console.error('加载配置方案失败:', error);
      setSavedColorSchemes([]);
    }
  };

  useEffect(() => {
    // 只有在主题已经初始化后才加载配色方案
    if (isInitialized) {
      loadColorSchemes();
    }
  }, [isInitialized]);

  // 在设置面板打开时重新加载配置方案，避免缓存
  useEffect(() => {
    if (isOpen && isInitialized) {
      console.log('🔧 [CardCustomizer] 设置面板打开，重新加载配置方案');
      loadColorSchemes();
    }
  }, [isOpen, isInitialized]); // 这个useEffect只加载保存的配置方案列表，不会影响当前设置

  // 监听主题变化，在深浅色切换时重新加载颜色配置
  useEffect(() => {
    if (isInitialized && isOpen) {
      console.log('🔧 [CardCustomizer] 主题切换，重新加载颜色配置');
      loadColorSchemes();
      
      // 移除自动生成渐变色，避免刷新时显示默认渐变
      // generateSmartGradient();
      
      // 更新当前颜色设置以适应新主题，但保留用户自定义的颜色
      setSettings(prev => {
        const newSettings = { ...prev };
        // 移除所有默认颜色设置，让用户完全自定义
        // 不再设置任何默认的borderColor、backgroundColor或gradientColors
        return newSettings;
      });
    }
  }, [darkMode, isInitialized, isOpen]);

  const shadowOptions = [
    { value: 'none', label: '无阴影', class: 'shadow-none', style: 'none' },
    { value: 'sm', label: '小阴影', class: 'shadow-sm', style: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
    { value: 'md', label: '中阴影', class: 'shadow-md', style: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
    { value: 'lg', label: '大阴影', class: 'shadow-lg', style: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' },
    { value: 'xl', label: '超大阴影', class: 'shadow-xl', style: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
    { value: '2xl', label: '巨大阴影', class: 'shadow-2xl', style: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }
  ];

  const presetColors = [
    '#ffffff', '#f9fafb', '#f3f4f6', '#e5e7eb',
    '#fef2f2', '#fef7f0', '#fffbeb', '#f0fdf4',
    '#ecfdf5', '#f0fdfa', '#ecfeff', '#f0f9ff',
    '#eff6ff', '#f5f3ff', '#faf5ff', '#fdf4ff'
  ];

  const gradientPresets = [
    // 移除默认渐变预设，让用户自己选择颜色
    // ['#ffffff', '#f9fafb'],
    // ['#fef2f2', '#fef7f0'],
    // ['#fffbeb', '#f0fdf4'],
    // ['#ecfdf5', '#f0fdfa'],
    // ['#ecfeff', '#f0f9ff'],
    // ['#eff6ff', '#f5f3ff'],
    // ['#faf5ff', '#fdf4ff'],
    // ['#e0e7ff', '#c7d2fe']
  ];

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleGradientColorChange = (index, color) => {
    // 确保gradientColors始终是一个包含两个元素的数组
    const currentColors = settings.gradientColors && settings.gradientColors.length >= 2 
      ? [...settings.gradientColors] 
      : ['', ''];
    
    const newColors = [...currentColors];
    newColors[index] = color;
    setSettings(prev => ({
      ...prev,
      gradientColors: newColors
    }));
  };



  // 生成智能渐变 - 生成6种不同的渐变配色供选择
  const generateSmartGradient = () => {
    const lightGradients = [
      ['#ffecd2', '#fcb69f'], // 温暖橙色
      ['#a8edea', '#fed6e3'], // 薄荷粉色
      ['#d299c2', '#fef9d7'], // 紫色到黄色
      ['#89f7fe', '#66a6ff'], // 蓝色渐变
      ['#fdbb2d', '#22c1c3'], // 金色到青色
      ['#ff9a9e', '#fecfef'], // 粉色渐变
      ['#a8e6cf', '#dcedc1'], // 绿色渐变
      ['#ffd3a5', '#fd9853'], // 橙色渐变
      ['#667eea', '#764ba2'], // 紫蓝渐变
      ['#f093fb', '#f5576c'], // 粉红渐变
      ['#4facfe', '#00f2fe'], // 蓝青渐变
      ['#43e97b', '#38f9d7'], // 绿青渐变
      ['#fa709a', '#fee140'], // 粉黄渐变
      ['#a8caba', '#5d4e75'], // 绿紫渐变
      ['#ff6b6b', '#feca57'], // 红橙渐变
      ['#48cae4', '#023e8a']  // 蓝色渐变
    ];

    const darkGradients = [
      ['#2c3e50', '#34495e'], // 深蓝灰
      ['#232526', '#414345'], // 深灰
      ['#1e3c72', '#2a5298'], // 深蓝
      ['#4b6cb7', '#182848'], // 蓝色到深蓝
      ['#360033', '#0b8793'], // 紫色到青色
      ['#2c5364', '#203a43'], // 深青色
      ['#0f0c29', '#302b63'], // 深紫色
      ['#24243e', '#302b63'], // 深紫灰
      ['#1a1a2e', '#16213e'], // 深蓝紫
      ['#0f3460', '#0e4b99'], // 深蓝
      ['#2d1b69', '#11998e'], // 紫青渐变
      ['#8360c3', '#2ebf91'], // 紫绿渐变
      ['#ee0979', '#ff6a00'], // 红橙渐变
      ['#134e5e', '#71b280'], // 深青绿
      ['#667db6', '#0082c8'], // 蓝色渐变
      ['#2193b0', '#6dd5ed']  // 青蓝渐变
    ];

    const gradients = darkMode ? darkGradients : lightGradients;
    
    // 随机选择6种不同的渐变
    const shuffled = [...gradients].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 6);
    
    setGeneratedGradients(selected);
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const resetToDefault = () => {
    console.log('🔄 [CardCustomizer] 开始重置到默认设置');
    setIsResetting(true);
    
    // 使用动态获取的默认设置
    const currentDefaults = getDefaultColors();
    setSettings(currentDefaults);
    console.log('🔄 [CardCustomizer] 默认设置已应用:', currentDefaults);
    
    // 重置完成后清除标志
    setTimeout(() => {
      setIsResetting(false);
      console.log('🔄 [CardCustomizer] 重置完成');
    }, 300);
  };

  // 保存当前配色方案
  const saveCurrentColorScheme = async () => {
    if (savedColorSchemes.length >= 10) {
      // 使用自定义提示而不是alert
      return;
    }

    setShowInputDialog(true);
  };

  const handleSaveScheme = async (schemeName) => {
    if (!schemeName) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('未找到认证令牌，无法保存配置方案');
      return;
    }

    const scheme = {
      name: schemeName,
      borderColor: settings.borderColor,
      backgroundColor: settings.backgroundColor,
      backgroundGradient: settings.backgroundGradient,
      gradientColors: [...settings.gradientColors],
      shadowSize: settings.shadowSize,
      borderRadius: settings.borderRadius,
      borderWidth: settings.borderWidth,
      // 分开的字体颜色设置
      mainTextColor: settings.mainTextColor,
      secondaryTextColor: settings.secondaryTextColor,
      linkTextColor: settings.linkTextColor,
      buttonTextColor: settings.buttonTextColor,
      // 保持向后兼容
      textColor: settings.textColor
    };

    try {
      const themeMode = darkMode ? 'dark' : 'light';
      const response = await fetch(`${API_BASE_URL}/notes/color-schemes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: schemeName,
          schemeData: scheme,
          theme_mode: themeMode
        })
      });

      if (response.ok) {
        console.log('配置方案保存成功');
        // 重新加载配置方案列表
        loadColorSchemes();
      } else {
        const errorData = await response.text();
        let errorMessage = '保存配色方案失败';
        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          // 如果不是JSON格式，使用默认错误消息
        }
        console.error('保存配色方案失败:', response.status, errorMessage);
      }
    } catch (error) {
      console.error('保存配置方案失败:', error);
    }
  };

  // 应用配置方案
  const applyColorScheme = (scheme) => {
    console.log('应用配色方案:', scheme);
    
    // 从settings字段中获取实际的配置数据
    const schemeSettings = scheme.settings || scheme;
    
    // 根据当前主题调整颜色配置
    const adjustedSettings = { ...schemeSettings };
    
    // 如果配置方案的主题模式与当前主题不同，进行颜色适配
    if (scheme.theme_mode && scheme.theme_mode !== (darkMode ? 'dark' : 'light')) {
      // 从深色主题切换到浅色主题
      if (scheme.theme_mode === 'dark' && !darkMode) {
        if (adjustedSettings.borderColor === '#374151') adjustedSettings.borderColor = '#e5e7eb';
        if (adjustedSettings.backgroundColor === '#1f2937') adjustedSettings.backgroundColor = '#ffffff';
        // 移除硬编码的渐变色设置，保持用户自定义的渐变色或空数组
        // if (adjustedSettings.gradientColors && adjustedSettings.gradientColors[0] === '#1f2937' && adjustedSettings.gradientColors[1] === '#374151') {
        //   adjustedSettings.gradientColors = ['#ffffff', '#f9fafb'];
        // }
      }
      // 从浅色主题切换到深色主题
      else if (scheme.theme_mode === 'light' && darkMode) {
        if (adjustedSettings.borderColor === '#e5e7eb') adjustedSettings.borderColor = '#374151';
        if (adjustedSettings.backgroundColor === '#ffffff') adjustedSettings.backgroundColor = '#1f2937';
        // 移除硬编码的渐变色设置，保持用户自定义的渐变色或空数组
        // if (adjustedSettings.gradientColors && adjustedSettings.gradientColors[0] === '#ffffff' && adjustedSettings.gradientColors[1] === '#f9fafb') {
        //   adjustedSettings.gradientColors = ['#1f2937', '#374151'];
        // }
      }
    }
    
    setSettings(prev => ({
      ...prev,
      borderColor: adjustedSettings.borderColor,
      backgroundColor: adjustedSettings.backgroundColor,
      backgroundGradient: adjustedSettings.backgroundGradient,
      gradientColors: Array.isArray(adjustedSettings.gradientColors) ? [...adjustedSettings.gradientColors] : [], // 移除默认渐变色，使用空数组
      shadowSize: adjustedSettings.shadowSize,
      borderRadius: adjustedSettings.borderRadius,
      borderWidth: adjustedSettings.borderWidth,
      // 分开的字体颜色设置（向后兼容）
      mainTextColor: adjustedSettings.mainTextColor || adjustedSettings.textColor,
      secondaryTextColor: adjustedSettings.secondaryTextColor || adjustedSettings.textColor,
      linkTextColor: adjustedSettings.linkTextColor || adjustedSettings.textColor,
      buttonTextColor: adjustedSettings.buttonTextColor || adjustedSettings.textColor,
      referenceTextColor: adjustedSettings.referenceTextColor || adjustedSettings.textColor,
      // 保持向后兼容
      textColor: adjustedSettings.textColor
    }));
  };

  // 删除配置方案
  const handleDeleteScheme = async (schemeId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('未找到认证令牌，无法删除配置方案');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/notes/color-schemes/${schemeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('配置方案删除成功');
        // 重新加载配置方案列表
        await loadColorSchemes();
      } else {
        const errorData = await response.text();
        console.error('删除配置方案失败:', response.status, errorData);
      }
    } catch (error) {
      console.error('删除配置方案失败:', error);
    }
  };

  const getPreviewStyle = () => {
    const shadowOption = shadowOptions.find(s => s.value === settings.shadowSize);
    const style = {
      borderWidth: `${settings.borderWidth}px`,
      borderColor: settings.borderColor,
      borderStyle: 'solid',
      borderRadius: `${settings.borderRadius}px`,
      boxShadow: shadowOption?.style === 'none' ? 'none' : shadowOption?.style || '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      color: settings.mainTextColor || settings.textColor
    };

    if (settings.backgroundGradient) {
      style.background = `linear-gradient(135deg, ${settings.gradientColors[0]}, ${settings.gradientColors[1]})`;
    } else {
      style.backgroundColor = settings.backgroundColor;
    }

    return style;
  };

  // 禁用背景滚动
  useEffect(() => {
    if (isOpen) {
      // 禁用背景滚动
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      
      // 恢复滚动时的位置
      const scrollY = window.scrollY;
      
      return () => {
        // 恢复背景滚动
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <style>
        {`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          body {
            overflow: hidden;
          }
        `}
      </style>
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        onTouchMove={(e) => {
          // 防止背景滑动穿透
          e.preventDefault();
        }}
        style={{
          touchAction: 'none'
        }}
      />
      
      {/* 设置面板 - 基于卡片居中 */}
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto scrollbar-hide smooth-scroll-container scrollbar-smooth pointer-events-auto"
        style={{
          backgroundColor: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        onTouchStart={(e) => {
          // 阻止触摸事件冒泡到父元素
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          // 阻止触摸移动事件冒泡到父元素
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          // 阻止触摸结束事件冒泡到父元素
          e.stopPropagation();
        }}
      >
        {/* 预览区域 - 固定在顶部，包含关闭按钮 */}
        <div className="sticky top-0 z-10 p-4 border-b relative" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}>
          {/* 关闭按钮 - 位于预览容器右上方 */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-theme-elevated transition-colors z-20"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <FiX size={18} />
          </button>
          
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
            预览效果
          </div>
          <div 
            className="p-3 h-24 overflow-hidden"
            style={getPreviewStyle()}
          >
            <div className="text-sm font-medium mb-1" style={{ color: settings.mainTextColor || settings.textColor }}>
              示例笔记标题
            </div>
            <div className="text-xs leading-relaxed" style={{ color: settings.secondaryTextColor || settings.textColor }}>
              这是一个示例笔记内容，用于预览卡片样式效果。
            </div>
            {/* 底部标签区域预览 */}
            <div className="mt-2 flex justify-end">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 border" style={{ color: settings.linkTextColor || settings.textColor }}>示例</span>
            </div>
          </div>
        </div>

        {/* 设置选项 - 紧凑布局 */}
        <div className="p-3 space-y-3">
          {/* 边框颜色和纯色背景 */}
          <div className="grid grid-cols-2 gap-1">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center">
                <input
                  type="color"
                  value={settings.borderColor}
                  onChange={(e) => handleSettingChange('borderColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                  style={{ borderColor: 'var(--theme-border)' }}
                />
              </div>
              <label className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text)' }}>
                边框
              </label>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                  style={{ borderColor: 'var(--theme-border)' }}
                />
              </div>
              <label className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text)' }}>
                背景
              </label>
            </div>
          </div>

          {/* 阴影大小数字显示 */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
              阴影大小
            </label>
            <div className="grid grid-cols-6 gap-1">
              {shadowOptions.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => handleSettingChange('shadowSize', option.value)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    settings.shadowSize === option.value 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'border-gray-300 hover:bg-theme-elevated'
                  }`}
                  style={{
                    backgroundColor: settings.shadowSize === option.value ? '#3b82f6' : 'var(--theme-surface)',
                    borderColor: settings.shadowSize === option.value ? '#3b82f6' : 'var(--theme-border)',
                    color: settings.shadowSize === option.value ? 'white' : 'var(--theme-text)'
                  }}
                  title={option.label}
                >
                  {index}
                </button>
              ))}
            </div>
          </div>

          {/* 边框宽度、圆角大小、默认显示行数 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                边框宽度
              </label>
              <input
                type="range"
                min="0"
                max="5"
                value={settings.borderWidth}
                onChange={(e) => handleSettingChange('borderWidth', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-center mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                {settings.borderWidth}px
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                圆角大小
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={settings.borderRadius}
                onChange={(e) => handleSettingChange('borderRadius', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-center mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                {settings.borderRadius}px
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                显示行数
              </label>
              <input
                type="range"
                min="3"
                max="10"
                value={settings.maxLines}
                onChange={(e) => handleSettingChange('maxLines', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-center mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                {settings.maxLines}行
              </div>
            </div>
          </div>



          {/* 渐变背景设置 - 始终展开 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>
                渐变背景
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={settings.backgroundGradient}
                  onChange={(e) => handleSettingChange('backgroundGradient', e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>启用</span>
              </label>
            </div>
            
            {/* 渐变背景内容始终展开 */}
            <div>
              {/* 智能渐变和手动设置的布局 */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                {/* 左侧：智能渐变 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>智能配色</span>
                    <button
                      onClick={generateSmartGradient}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:from-purple-600 hover:to-pink-600 transition-colors duration-200"
                      title={`生成${darkMode ? '深色系' : '浅色系'}随机渐变`}
                    >
                      <FiShuffle size={10} />
                      生成
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {generatedGradients.map((gradient, index) => {
                      const isSelected = settings.gradientColors[0] === gradient[0] && settings.gradientColors[1] === gradient[1];
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            // 自动启用渐变背景并应用颜色
                            handleSettingChange('backgroundGradient', true);
                            handleSettingChange('gradientColors', gradient);
                          }}
                          className={`h-8 rounded border transition-colors relative ${
                            isSelected ? 'border-blue-500 border-2' : 'border-gray-300'
                          }`}
                          style={{ 
                            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` 
                          }}
                          title={`${gradient[0]} → ${gradient[1]} - 点击应用渐变背景`}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md">
                                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* 右侧：手动设置 */}
                <div>
                  <span className="text-xs font-medium mb-2 block" style={{ color: 'var(--theme-text)' }}>手动设置</span>
                  <div className="flex justify-center gap-2">
                    <div className="flex flex-col items-center">
                      <input
                        type="color"
                        value={settings.gradientColors[0] || '#ffffff'}
                        onChange={(e) => handleGradientColorChange(0, e.target.value)}
                        className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                        style={{ borderColor: 'var(--theme-border)' }}
                      />
                      <span className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>起始</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <input
                        type="color"
                        value={settings.gradientColors[1] || '#ffffff'}
                        onChange={(e) => handleGradientColorChange(1, e.target.value)}
                        className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                        style={{ borderColor: 'var(--theme-border)' }}
                      />
                      <span className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>结束</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 字体颜色设置 */}
          <div className="space-y-2">
            
            {/* 所有文本颜色选择器放在一行 */}
            <div className="grid grid-cols-5 gap-1">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center">
                  <input
                    type="color"
                    value={settings.mainTextColor}
                    onChange={(e) => handleSettingChange('mainTextColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                    style={{ borderColor: 'var(--theme-border)' }}
                  />
                </div>
                <label className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  主要
                </label>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center">
                  <input
                    type="color"
                    value={settings.secondaryTextColor}
                    onChange={(e) => handleSettingChange('secondaryTextColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                    style={{ borderColor: 'var(--theme-border)' }}
                  />
                </div>
                <label className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  次要
                </label>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center">
                  <input
                    type="color"
                    value={settings.linkTextColor}
                    onChange={(e) => handleSettingChange('linkTextColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                    style={{ borderColor: 'var(--theme-border)' }}
                  />
                </div>
                <label className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  链接
                </label>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center">
                  <input
                    type="color"
                    value={settings.buttonTextColor}
                    onChange={(e) => handleSettingChange('buttonTextColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                    style={{ borderColor: 'var(--theme-border)' }}
                  />
                </div>
                <label className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  按钮
                </label>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center">
                  <input
                    type="color"
                    value={settings.referenceTextColor}
                    onChange={(e) => handleSettingChange('referenceTextColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                    style={{ borderColor: 'var(--theme-border)' }}
                  />
                </div>
                <label className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  引用
                </label>
              </div>
            </div>

            {/* 快速颜色选择 */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                快速选择
              </label>
              <div className="grid grid-cols-8 gap-1">
                {[
                  '#000000', '#374151', '#6b7280', '#9ca3af',
                  '#dc2626', '#ea580c', '#d97706', '#65a30d',
                  '#059669', '#0891b2', '#2563eb', '#7c3aed',
                  '#c026d3', '#e11d48', '#be123c', '#7f1d1d'
                ].map(color => {
                  const isSelected = settings.mainTextColor === color;
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        // 点击时应用到所有文本颜色
                        handleSettingChange('mainTextColor', color);
                        handleSettingChange('secondaryTextColor', color);
                        handleSettingChange('linkTextColor', color);
                        handleSettingChange('buttonTextColor', color);
                        handleSettingChange('referenceTextColor', color);
                        handleSettingChange('textColor', color); // 保持向后兼容
                      }}
                      className={`w-5 h-5 rounded border transition-colors relative ${
                        isSelected ? 'border-blue-500 border-2' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`应用 ${color} 到所有文本`}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <svg className="w-2 h-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>



          {/* 配置方案保存 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                配置方案
              </label>
              <button
                onClick={saveCurrentColorScheme}
                disabled={savedColorSchemes.length >= 10}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  savedColorSchemes.length >= 10 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                title={savedColorSchemes.length >= 10 ? '最多保存10个配置方案' : '保存当前配置'}
              >
                <FiPlus size={12} />
                保存配置
              </button>
            </div>
            
            {savedColorSchemes.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto scrollbar-hide smooth-scroll-container scrollbar-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {savedColorSchemes.map(scheme => {
                  // 从settings字段中获取实际的配置数据，兼容旧格式
                  const schemeSettings = scheme.settings || scheme;
                  
                  // 判断当前设置是否与此配色方案匹配
                  const isCurrentScheme = 
                    settings.backgroundColor === schemeSettings.backgroundColor &&
                    settings.backgroundGradient === schemeSettings.backgroundGradient &&
                    settings.gradientColors[0] === schemeSettings.gradientColors[0] &&
                    settings.gradientColors[1] === schemeSettings.gradientColors[1] &&
                    settings.borderColor === schemeSettings.borderColor &&
                    settings.borderWidth === schemeSettings.borderWidth &&
                    settings.mainTextColor === schemeSettings.mainTextColor &&
                    settings.secondaryTextColor === schemeSettings.secondaryTextColor;
                  
                  return (
                    <div key={scheme.id} className="relative group">
                      {/* 配色预览按钮 */}
                      <button
                        onClick={() => applyColorScheme(scheme)}
                        className={`w-full h-8 rounded border transition-colors relative ${
                          isCurrentScheme ? 'border-blue-500 border-2' : 'border-gray-300'
                        }`}
                        style={{
                          backgroundColor: schemeSettings.backgroundGradient 
                            ? undefined 
                            : schemeSettings.backgroundColor,
                          background: schemeSettings.backgroundGradient 
                            ? `linear-gradient(135deg, ${schemeSettings.gradientColors[0]}, ${schemeSettings.gradientColors[1]})` 
                            : undefined,
                        }}
                        title={`${scheme.name} - 点击应用此配置`}
                      >
                        {/* 对勾标识 */}
                        {isCurrentScheme && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md">
                              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                      
                      {/* 删除按钮 - 悬停时显示 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScheme(scheme.id);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                        title={`删除配置方案: ${scheme.name}`}
                      >
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* 配色名称 - 悬停时显示 */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {scheme.name}
                        {scheme.theme_mode && (
                          <span className={scheme.theme_mode === 'dark' ? 'text-gray-300 ml-1' : 'text-yellow-300 ml-1'}>
                            ({scheme.theme_mode === 'dark' ? '深色' : '浅色'}主题)
                          </span>
                        )}
                        {isCurrentScheme && <span className="text-blue-300 ml-1">(当前)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {savedColorSchemes.length === 0 && (
              <div 
                className="text-xs text-center py-4 border-2 border-dashed rounded"
                style={{ 
                  color: 'var(--theme-text-secondary)',
                  borderColor: 'var(--theme-border)'
                }}
              >
                暂无保存的配置方案
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 [CardCustomizer] 点击"恢复此卡片"按钮');
                if (onResetThisCard) {
                  // 直接调用回调函数，确认弹窗在NoteCard中处理
                  onResetThisCard();
                } else {
                  // 否则只重置本地状态，也需要确认
                  console.log('🔄 [CardCustomizer] isResetting状态:', isResetting);
                  resetToDefault();
                }
              }}
              disabled={isResetting}
              className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
                isResetting 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-theme-elevated cursor-pointer'
              }`}
              style={{ 
                color: isResetting ? '#9ca3af' : 'var(--theme-text-secondary)',
                pointerEvents: isResetting ? 'none' : 'auto'
              }}
            >
              <FiRefreshCw size={12} className={isResetting ? 'animate-spin' : ''} />
              {isResetting ? '恢复中' : '恢复此卡片'}
            </button>
            
            {onResetAllToDefault && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔄 [CardCustomizer] 点击"全部恢复默认"按钮');
                  onResetAllToDefault();
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer"
                title="删除所有笔记的个性化设置，恢复到默认状态"
              >
                <FiTrash2 size={12} />
                全部恢复默认
              </button>
            )}
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={() => {
                console.log('🎨 [CardCustomizer] 点击"应用到此卡片"按钮, settings:', settings);
                onApply(settings);
              }}
              className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
            >
              <FiCheck size={12} />
              应用到此卡片
            </button>
            <button
              onClick={() => {
                console.log('🌍 [CardCustomizer] 点击"应用到全部"按钮, settings:', settings);
                onApplyToAll(settings);
              }}
              className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
            >
              <FiCheck size={12} />
              应用到全部
            </button>
          </div>
        </div>
      </div>
      </div>
      
      {/* 输入对话框 */}
      <InputDialog
        isOpen={showInputDialog}
        onClose={() => setShowInputDialog(false)}
        onConfirm={handleSaveScheme}
        title="保存配置方案"
        placeholder="请输入配置方案名称"
        maxLength={20}
      />
    </>,
    document.body
  );
};

export default CardCustomizer;