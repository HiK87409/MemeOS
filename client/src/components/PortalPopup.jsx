import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

// 动画类名（已禁用）
const ANIMATION_CLASSES = {
  enter: '',
  exit: '',
  duration: ''
};

const PortalPopup = ({ 
  children, 
  isOpen, 
  triggerRef, 
  onClose,
  className = '',
  offset = { x: 0, y: 8 },
  position = 'bottom-left', // bottom-left, bottom-right, top-left, top-right, center
  disableOutsideClick = false // 禁用点击外部关闭功能
}) => {
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const updatePosition = () => {
        const triggerRect = triggerRef.current?.getBoundingClientRect();
        if (!triggerRect) return;
        
        const popupRect = popupRef.current?.getBoundingClientRect() || { width: 0, height: 0 };
        
        let top, left;
        
        switch (position) {
          case 'bottom-left':
            top = triggerRect.bottom + offset.y;
            left = triggerRect.left + offset.x;
            break;
          case 'bottom-right':
            top = triggerRect.bottom + offset.y;
            left = triggerRect.right - popupRect.width + offset.x;
            break;
          case 'top-left':
            top = triggerRect.top - popupRect.height - offset.y;
            left = triggerRect.left + offset.x;
            break;
          case 'top-right':
            top = triggerRect.top - popupRect.height - offset.y;
            left = triggerRect.right - popupRect.width + offset.x;
            break;
          case 'center':
            top = (window.innerHeight - popupRect.height) / 2;
            left = window.innerWidth - popupRect.width - 20;
            break;
          default:
            top = triggerRect.bottom + offset.y;
            left = triggerRect.left + offset.x;
        }
        
        // 边界检测
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 水平边界检测
        if (left + popupRect.width > viewportWidth) {
          left = viewportWidth - popupRect.width - 10;
        }
        if (left < 10) {
          left = 10;
        }
        
        // 垂直边界检测
        if (top + popupRect.height > viewportHeight) {
          top = triggerRect.top - popupRect.height - offset.y;
        }
        if (top < 10) {
          top = triggerRect.bottom + offset.y;
        }
        
        // 只有位置真正改变时才更新
        setPopupPosition(prev => {
          if (Math.abs(prev.top - top) > 1 || Math.abs(prev.left - left) > 1) {
            return { top, left };
          }
          return prev;
        });
      };
      
      // 使用 setTimeout 延迟初始位置计算，避免在渲染过程中更新状态
      const timeoutId = setTimeout(updatePosition, 0);
      
      // 监听窗口大小变化和滚动
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, triggerRef, offset.x, offset.y, position]);

  // 处理显示状态
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      // 立即移除DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen || !onClose || disableOutsideClick) return;

    const handleClickOutside = (event) => {
      // 检查点击是否在弹窗外部
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    // 延迟添加事件监听器，避免立即触发
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef, disableOutsideClick]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      ref={popupRef}
      data-portal-popup="true"
      className={`fixed z-[9999] ${ANIMATION_CLASSES.duration} ${isAnimating ? ANIMATION_CLASSES.enter : ANIMATION_CLASSES.exit} ${className}`}
      style={{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
        transformOrigin: 'var(--tw-transform-origin, center)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

export default PortalPopup;