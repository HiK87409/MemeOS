import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

// 动画类名（已禁用）
const ANIMATION_CLASSES = {
  backdropEnter: '',
  backdropExit: '',
  dialogEnter: '',
  dialogExit: '',
  duration: ''
};

const ConfirmDialog = ({ 
  isOpen, 
  onCancel, 
  onConfirm, 
  title = '确认操作', 
  message, 
  confirmText = '确认', 
  cancelText = '取消',
  type = 'warning' // warning, danger, info
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

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

  if (!shouldRender) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-red-500',
          confirmBg: 'bg-red-500 hover:bg-red-600',
          borderColor: 'border-red-200'
        };
      case 'info':
        return {
          iconColor: 'text-blue-500',
          confirmBg: 'bg-blue-500 hover:bg-blue-600',
          borderColor: 'border-blue-200'
        };
      default: // warning
        return {
          iconColor: 'text-yellow-500',
          confirmBg: 'bg-yellow-500 hover:bg-yellow-600',
          borderColor: 'border-yellow-200'
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    onConfirm();
    onCancel();
  };

  const handleCancel = () => {
    onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className={`absolute inset-0 bg-black bg-opacity-50 ${ANIMATION_CLASSES.duration} ${isAnimating ? ANIMATION_CLASSES.backdropEnter : ANIMATION_CLASSES.backdropExit}`}
        onClick={handleCancel}
      />
      
      {/* 弹窗内容 */}
      <div 
        className={`relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 ${styles.borderColor} ${ANIMATION_CLASSES.duration} ${isAnimating ? ANIMATION_CLASSES.dialogEnter : ANIMATION_CLASSES.dialogExit}`}
        style={{ 
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          transformOrigin: 'center'
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleCancel}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-theme-elevated transition-colors"
          style={{ color: 'var(--theme-text-secondary)' }}
        >
          <FiX size={18} />
        </button>

        {/* 头部 */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full bg-opacity-10 ${styles.iconColor}`}>
              <FiAlertTriangle size={24} className={styles.iconColor} />
            </div>
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--theme-text)' }}
            >
              {title}
            </h3>
          </div>
          
          <div 
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            {message}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 pt-2 border-t" style={{ borderColor: 'var(--theme-border)' }}>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm rounded-md border transition-colors"
            style={{ 
              color: 'var(--theme-text-secondary)',
              borderColor: 'var(--theme-border)',
              backgroundColor: 'var(--theme-elevated)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'var(--theme-hover)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'var(--theme-elevated)';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm text-white rounded-md transition-colors ${styles.confirmBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;