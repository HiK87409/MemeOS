import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 动态定位Hook
 * 用于监听目标元素的位置和尺寸变化，并计算相对于该元素的动态位置
 * @param {string} targetSelector - 目标元素的选择器
 * @param {Object} options - 配置选项
 * @param {number} options.offsetX - X轴偏移量
 * @param {number} options.offsetY - Y轴偏移量
 * @param {string} options.position - 相对位置 ('bottom-right', 'bottom-left', 'top-right', 'top-left')
 * @returns {Object} - 包含位置信息和ref的对象
 */
export const useDynamicPosition = (targetSelector, options = {}) => {
  const {
    offsetX = -20,
    offsetY = -20,
    position = 'bottom-right'
  } = options;
  
  const [positionInfo, setPositionInfo] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isVisible: false
  });
  
  const observerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  
  // 计算相对位置
  const calculatePosition = useCallback((targetRect) => {
    let x = 0;
    let y = 0;
    
    switch (position) {
      case 'bottom-right':
        x = targetRect.right + offsetX;
        y = targetRect.bottom + offsetY;
        break;
      case 'bottom-left':
        x = targetRect.left + offsetX;
        y = targetRect.bottom + offsetY;
        break;
      case 'top-right':
        x = targetRect.right + offsetX;
        y = targetRect.top + offsetY;
        break;
      case 'top-left':
        x = targetRect.left + offsetX;
        y = targetRect.top + offsetY;
        break;
      default:
        x = targetRect.right + offsetX;
        y = targetRect.bottom + offsetY;
    }
    
    // 确保不会超出视窗边界
    x = Math.max(10, Math.min(window.innerWidth - 60, x));
    y = Math.max(10, Math.min(window.innerHeight - 60, y));
    
    return { x, y };
  }, [offsetX, offsetY, position]);
  
  // 更新位置信息
  const updatePosition = useCallback(() => {
    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) {
      setPositionInfo(prev => ({ ...prev, isVisible: false }));
      return;
    }
    
    const rect = targetElement.getBoundingClientRect();
    const { x, y } = calculatePosition(rect);
    
    setPositionInfo({
      x,
      y,
      width: rect.width,
      height: rect.height,
      isVisible: true
    });
  }, [targetSelector, calculatePosition]);
  
  useEffect(() => {
    // 初始化位置
    updatePosition();
    
    // 设置IntersectionObserver监听元素可见性
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            updatePosition();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );
    
    // 设置ResizeObserver监听元素尺寸变化
    resizeObserverRef.current = new ResizeObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.target) {
            updatePosition();
          }
        });
      }
    );
    
    // 开始监听目标元素
    const targetElement = document.querySelector(targetSelector);
    if (targetElement) {
      observerRef.current.observe(targetElement);
      resizeObserverRef.current.observe(targetElement);
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });
    
    // 定期更新位置（处理动态内容变化）
    const intervalId = setInterval(updatePosition, 1000);
    
    return () => {
      // 清理监听器
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearInterval(intervalId);
    };
  }, [targetSelector, updatePosition]);
  
  return {
    position: positionInfo,
    updatePosition,
    isVisible: positionInfo.isVisible
  };
};

/**
 * 智能定位Hook
 * 自动选择最佳定位策略，根据屏幕尺寸和内容布局动态调整
 * @param {string} containerSelector - 容器元素选择器
 * @param {Object} options - 配置选项
 * @returns {Object} - 包含样式和位置信息的对象
 */
export const useSmartPosition = (containerSelector, options = {}) => {
  const {
    defaultPosition = 'bottom-right',
    mobilePosition = 'bottom-right',
    desktopPosition = 'bottom-right',
    breakpoint = 1024
  } = options;
  
  const [currentPosition, setCurrentPosition] = useState(defaultPosition);
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  
  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < breakpoint;
      setIsMobile(mobile);
      setCurrentPosition(mobile ? mobilePosition : desktopPosition);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // 初始化
    
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint, mobilePosition, desktopPosition]);
  
  // 使用动态定位
  const { position, isVisible } = useDynamicPosition(containerSelector, {
    position: currentPosition,
    offsetX: isMobile ? -16 : -20,
    offsetY: isMobile ? -16 : -20
  });
  
  // 生成CSS样式
  const getStyle = () => {
    if (!isVisible) {
      return {
        position: 'fixed',
        bottom: '2rem',
        right: '1rem',
        zIndex: 99999
      };
    }
    
    // 验证位置值，确保不是NaN
    const safeX = isNaN(position.x) ? 0 : position.x;
    const safeY = isNaN(position.y) ? 0 : position.y;
    
    return {
      position: 'fixed',
      left: `${safeX}px`,
      top: `${safeY}px`,
      zIndex: 99999,
      transform: 'translate(-50%, -50%)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  };
  
  return {
    style: getStyle(),
    position,
    isVisible,
    isMobile,
    currentPosition
  };
};

export default useDynamicPosition;