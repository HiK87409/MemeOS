import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiX, FiInfo, FiAlertTriangle } from 'react-icons/fi';

const Toast = ({
  message,
  type = 'success',
  duration = 3000,
  position = 'top-right',
  onClose,
  showClose = true
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300); // 动画持续时间
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheck className="text-green-500" size={20} />;
      case 'error':
        return <FiX className="text-red-500" size={20} />;
      case 'warning':
        return <FiAlertTriangle className="text-yellow-500" size={20} />;
      case 'info':
        return <FiInfo className="text-blue-500" size={20} />;
      default:
        return <FiCheck className="text-green-500" size={20} />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return createPortal(
    <div
      className={`fixed z-[9999] ${getPositionClasses()} transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'
      }`}
    >
      <div
        className={`${getBgColor()} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px] flex items-center space-x-3`}
      >
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{message}</p>
        </div>
        {showClose && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={16} />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

// Toast容器组件，用于管理多个Toast
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // 全局方法，供其他组件调用
  useEffect(() => {
    window.showToast = (message, type = 'success', options = {}) => {
      addToast({
        message,
        type,
        duration: options.duration || 3000,
        position: options.position || 'top-right',
        showClose: options.showClose !== false
      });
    };

    return () => {
      delete window.showToast;
    };
  }, []);

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position={toast.position}
          showClose={toast.showClose}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
};

export default Toast;