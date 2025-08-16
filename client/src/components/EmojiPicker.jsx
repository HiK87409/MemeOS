import React, { useState } from 'react';
import { FiSmile } from 'react-icons/fi';
import PortalPopup from './PortalPopup';

const EmojiPicker = ({ onEmojiSelect, onClose, isOpen, triggerRef }) => {
  const [selectedCategory, setSelectedCategory] = useState('smileys');

  const emojiCategories = {
    smileys: {
      name: '笑脸',
      icon: '😀',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳']
    },
    emotions: {
      name: '情感',
      icon: '❤️',
      emojis: ['😥', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲']
    },
    gestures: {
      name: '手势',
      icon: '👍',
      emojis: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵']
    },
    objects: {
      name: '物品',
      icon: '🎯',
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐']
    },
    nature: {
      name: '自然',
      icon: '🌿',
      emojis: ['🌱', '🌿', '🍀', '🍃', '🌾', '🌵', '🌲', '🌳', '🌴', '🌸', '🌺', '🌻', '🌹', '🥀', '🌷', '💐', '🌼', '🌙', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '⭐']
    }
  };

  return (
    <PortalPopup
      isOpen={isOpen}
      triggerRef={triggerRef}
      className="rounded-lg shadow-lg w-80"
      style={{
        backgroundColor: 'var(--theme-surface)'
      }}
      position="bottom-left"
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">选择表情</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>
        
        {/* 分类选择 */}
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {Object.entries(emojiCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCategory(key);
              }}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded whitespace-nowrap transition-all duration-200 ${
                selectedCategory === key
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-theme-elevated text-gray-600 dark:text-gray-300 hover:bg-theme-border'
              }`}
              title={category.name}
            >
              <span 
                className="emoji-button text-sm"
                style={{
            fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiSymbols, EmojiOne Mozilla, Twemoji Mozilla, Segoe UI Symbol, Noto Emoji',
            fontVariantEmoji: 'emoji',
            textRendering: 'optimizeQuality'
          }}
              >
                {category.icon}
              </span>
              <span className="hidden sm:inline">{category.name}</span>
            </button>
          ))}
        </div>
        
        {/* 表情网格 */}
        <div 
          className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-hide smooth-scroll-container scrollbar-smooth rounded-lg p-2"
          style={{
            backgroundColor: 'var(--theme-surface)'
          }}
        >
          {emojiCategories[selectedCategory].emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onEmojiSelect(emoji);
              }}
              className="p-2 text-lg hover:bg-theme-elevated rounded transition-colors emoji-button"
              title={emoji}
              style={{
                fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiSymbols, EmojiOne Mozilla, Twemoji Mozilla, Segoe UI Symbol, Noto Emoji',
                fontVariantEmoji: 'emoji',
                textRendering: 'optimizeQuality'
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </PortalPopup>
  );
};

export default EmojiPicker;