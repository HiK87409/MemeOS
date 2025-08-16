import React, { useState, useRef, useEffect } from 'react';
import { FiLink, FiExternalLink, FiArrowLeft } from 'react-icons/fi';
import { createPortal } from 'react-dom';

const BacklinkIndicator = ({ 
  noteId, 
  incomingReferences = [], 
  onNoteClick, 
  textColors = {},
  className = "" 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // 如果没有被引用，不显示指示器
  if (!incomingReferences || incomingReferences.length === 0) {
    return null;
  }

  const toggleMenu = () => {
    if (!showMenu && buttonRef.current) {
      const menuWidth = 200; // 缩小菜单宽度
      const menuHeight = 300; // 缩小菜单最大高度
      
      // 计算菜单位置，在屏幕最上方显示
      let left = (window.innerWidth - menuWidth) / 2;
      let top = 10; // 距离屏幕顶部10px
      
      // 确保菜单不会超出屏幕边界
      if (left < 10) left = 10;
      if (top < 10) top = 10;
      if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
      if (top + menuHeight > window.innerHeight - 10) top = window.innerHeight - menuHeight - 10;
      
      setMenuPosition({
        top: top,
        left: left
      });
    }
    setShowMenu(!showMenu);
  };

  const handleReferenceClick = (referenceNote) => {
    if (onNoteClick) {
      onNoteClick(referenceNote.id);
    }
    setShowMenu(false);
  };

  // 外部点击关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    const handleScroll = () => {
      setShowMenu(false);
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [showMenu]);

  const getEffectiveTextColor = (type, opacity = 1) => {
    const color = textColors[type] || '#3b82f6';
    if (opacity === 1) return color;
    // 简单的透明度处理
    return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
  };

  return (
    <>
      {/* 被引用指示器 */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleMenu();
        }}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors duration-200 ${className}`}
        style={{ 
          backgroundColor: getEffectiveTextColor('link', 0.1),
          color: getEffectiveTextColor('link', 0.8),
          border: `1px solid ${getEffectiveTextColor('link', 0.3)}`
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = getEffectiveTextColor('link', 0.15);
          e.target.style.color = getEffectiveTextColor('link', 1);
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = getEffectiveTextColor('link', 0.1);
          e.target.style.color = getEffectiveTextColor('link', 0.8);
        }}
        title={`被 ${incomingReferences.length} 个笔记引用，点击查看`}
      >
        <span 
          className="emoji-button text-xs"
          style={{
            fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiSymbols, EmojiOne Mozilla, Twemoji Mozilla, Segoe UI Symbol, Noto Emoji',
            fontVariantEmoji: 'emoji',
            textRendering: 'optimizeQuality'
          }}
        >
          🔗
        </span>
        <span className="text-xs font-medium">{incomingReferences.length}</span>
      </button>

      {/* 引用菜单 */}
      {showMenu && createPortal(
        <div 
          ref={menuRef}
          className="fixed rounded-md shadow-lg z-[10001] scrollbar-hide overflow-y-auto smooth-scroll-container scrollbar-smooth"
          style={{ 
            width: '200px',
            maxHeight: '300px',
            backgroundColor: 'var(--theme-elevated)',
            border: '1px solid var(--theme-border)',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`
          }}
        >
          <div className="p-1">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-1">
              引用 ({incomingReferences.length})
            </div>
            {incomingReferences.map((ref, index) => (
              <button
                key={ref.id || index}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleReferenceClick(ref);
                }}
                className="w-full px-1 py-1 text-left text-xs flex items-start gap-1 rounded transition-all duration-150 ease-out hover:bg-theme-elevated"
                style={{ color: 'var(--theme-text)' }}
              >
                <FiExternalLink size={12} className="mt-0.5 flex-shrink-0" style={{ color: getEffectiveTextColor('link', 0.7) }} />
                <div className="flex-1 min-w-0">

                  {ref.content && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {ref.content.substring(0, 40)}...
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BacklinkIndicator;