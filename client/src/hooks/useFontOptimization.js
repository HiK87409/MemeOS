import { useState, useEffect } from 'react';

/**
 * 字体优化钩子
 * 提供设备类型检测和字体大小计算功能
 */
export const useFontOptimization = () => {
  const [deviceType, setDeviceType] = useState('desktop');
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.6);

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      
      if (width <= 400) {
        setDeviceType('mobile-small');
        setFontSize(12);
        setLineHeight(1.4);
      } else if (width <= 768) {
        setDeviceType('mobile');
        setFontSize(14);
        setLineHeight(1.5);
      } else if (width >= 769 && width <= 1024) {
        setDeviceType('tablet');
        setFontSize(15);
        setLineHeight(1.55);
      } else if (width >= 1920) {
        setDeviceType('large-desktop');
        setFontSize(18);
        setLineHeight(1.65);
      } else {
        setDeviceType('desktop');
        setFontSize(16);
        setLineHeight(1.6);
      }
    };

    // 初始检测
    detectDevice();

    // 监听窗口大小变化
    window.addEventListener('resize', detectDevice);

    // 清理监听器
    return () => {
      window.removeEventListener('resize', detectDevice);
    };
  }, []);

  /**
   * 计算响应式字体大小
   * @param {number} baseSize - 基础字体大小（桌面端）
   * @returns {number} 响应式字体大小
   */
  const calculateResponsiveFontSize = (baseSize) => {
    switch (deviceType) {
      case 'mobile-small':
        return baseSize * 0.75;
      case 'mobile':
        return baseSize * 0.875;
      case 'tablet':
        return baseSize * 0.938;
      case 'large-desktop':
        return baseSize * 1.125;
      default:
        return baseSize;
    }
  };

  /**
   * 计算响应式行高
   * @param {number} baseLineHeight - 基础行高（桌面端）
   * @returns {number} 响应式行高
   */
  const calculateResponsiveLineHeight = (baseLineHeight) => {
    switch (deviceType) {
      case 'mobile-small':
        return Math.max(baseLineHeight * 0.875, 1.2);
      case 'mobile':
        return Math.max(baseLineHeight * 0.938, 1.3);
      case 'tablet':
        return Math.max(baseLineHeight * 0.969, 1.35);
      case 'large-desktop':
        return Math.min(baseLineHeight * 1.031, 1.8);
      default:
        return baseLineHeight;
    }
  };

  /**
   * 获取响应式字体样式
   * @param {Object} options - 字体样式选项
   * @returns {Object} 响应式字体样式对象
   */
  const getResponsiveFontStyle = (options = {}) => {
    const {
      baseSize = 16,
      baseLineHeight = 1.6,
      weight = 'normal',
      family = 'inherit',
    } = options;

    return {
      fontSize: `${calculateResponsiveFontSize(baseSize)}px`,
      lineHeight: calculateResponsiveLineHeight(baseLineHeight),
      fontWeight: weight,
      fontFamily: family,
    };
  };

  /**
   * 获取设备特定的CSS类名
   * @param {string} baseClass - 基础CSS类名
   * @returns {string} 设备特定的CSS类名
   */
  const getDeviceClass = (baseClass) => {
    const deviceClasses = {
      'mobile-small': `${baseClass}-mobile-small`,
      'mobile': `${baseClass}-mobile`,
      'tablet': `${baseClass}-tablet`,
      'desktop': `${baseClass}-desktop`,
      'large-desktop': `${baseClass}-large-desktop`,
    };
    
    return deviceClasses[deviceType] || baseClass;
  };

  /**
   * 检查是否为移动设备
   * @returns {boolean}
   */
  const isMobile = () => {
    return deviceType === 'mobile' || deviceType === 'mobile-small';
  };

  /**
   * 检查是否为平板设备
   * @returns {boolean}
   */
  const isTablet = () => {
    return deviceType === 'tablet';
  };

  /**
   * 检查是否为桌面设备
   * @returns {boolean}
   */
  const isDesktop = () => {
    return deviceType === 'desktop' || deviceType === 'large-desktop';
  };

  return {
    deviceType,
    fontSize,
    lineHeight,
    calculateResponsiveFontSize,
    calculateResponsiveLineHeight,
    getResponsiveFontStyle,
    getDeviceClass,
    isMobile,
    isTablet,
    isDesktop,
  };
};

export default useFontOptimization;