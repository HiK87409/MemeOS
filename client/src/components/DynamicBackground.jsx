import React from 'react';

const DynamicBackground = ({ children, className = '', type = 'bg' }) => {
  // 根据类型确定背景样式，使用CSS变量
  const getBackgroundStyle = () => {
    switch (type) {
      case 'bg':
        return { backgroundColor: 'var(--theme-bg)' };
      case 'surface':
        return { backgroundColor: 'var(--theme-surface)' };
      case 'elevated':
        return { backgroundColor: 'var(--theme-elevated)' };
      default:
        return { backgroundColor: 'var(--theme-bg)' };
    }
  };

  const backgroundStyle = getBackgroundStyle();

  return (
    <div className={className} style={backgroundStyle}>
      {children}
    </div>
  );
};

export default DynamicBackground;