import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

// 动画类名（已禁用）
const ANIMATION_CLASSES = {
  backdropEnter: '',
  backdropExit: '',
  dialogEnter: '',
  dialogExit: '',
  duration: ''
};

const InputDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '输入', 
  placeholder = '请输入...', 
  defaultValue = '',
  maxLength = 50 
}) => {
  const [value, setValue] = useState(defaultValue || '');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue || '');
      // 延迟聚焦，确保对话框已完全渲染
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedValue = value.trim();
    if (trimmedValue) {
      onConfirm(trimmedValue);
      onClose();
    }
  };

  const handleCancel = () => {
    setValue('');
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className={`absolute inset-0 bg-black bg-opacity-50 ${ANIMATION_CLASSES.duration} ${isAnimating ? ANIMATION_CLASSES.backdropEnter : ANIMATION_CLASSES.backdropExit}`}
        onClick={handleCancel}
      />
      
      {/* 对话框 */}
      <div 
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 ${ANIMATION_CLASSES.duration} ${isAnimating ? ANIMATION_CLASSES.dialogEnter : ANIMATION_CLASSES.dialogExit}`}
        style={{
          backgroundColor: 'var(--theme-elevated)',
          border: '1px solid var(--theme-border)',
          transformOrigin: 'center'
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
            {title}
          </h3>
          <button
            onClick={handleCancel}
            className="p-1 rounded-md hover:bg-theme-elevated transition-colors"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* 内容 */}
        <form onSubmit={handleSubmit} className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-0 dark:bg-gray-700 dark:text-white"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          />
          
          {/* 字符计数 */}
          <div className="text-xs mt-1 text-right" style={{ color: 'var(--theme-text-secondary)' }}>
            {value.length}/{maxLength}
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-theme-elevated transition-colors"
              style={{
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text-secondary)'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              确定
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default InputDialog;