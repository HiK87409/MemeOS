import React, { useState } from 'react';
import { FiHeart } from 'react-icons/fi';
import PortalPopup from './PortalPopup';
import { moodWeatherConfig } from '../config/moodWeatherConfig';

const MoodSelector = ({ onMoodSelect, onClose, isOpen, triggerRef }) => {
  return (
    <PortalPopup
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      className="w-80"
    >
      <div 
        className="mood-selector-popup rounded-lg shadow-lg border p-4"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiHeart size={16} style={{ color: 'var(--theme-primary)' }} />
            <span className="font-medium" style={{ color: 'var(--theme-text)' }}>选择心情</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{ color: 'var(--theme-text-secondary)' }}
            className="hover:opacity-70 transition-opacity"
          >
            ×
          </button>
        </div>
        
        {/* 心情网格 */}
        <div className="grid grid-cols-6 gap-2">
          {moodWeatherConfig.allMoods.map((mood, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onMoodSelect(mood);
              }}
              className="flex flex-col items-center p-2 rounded-lg transition-colors group"
              style={{
                ':hover': {
                  backgroundColor: 'var(--theme-hover)'
                }
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--theme-hover)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
              title={mood.description}
            >
              <span 
                className="text-2xl mb-1 transition-colors emoji-button"
                style={{
                  fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiSymbols, EmojiOne Mozilla, Twemoji Mozilla, Segoe UI Symbol, Noto Emoji',
                  fontVariantEmoji: 'emoji',
                  textRendering: 'optimizeQuality'
                }}
              >
                {mood.emoji}
              </span>
              <span className="text-xs text-center leading-tight" style={{ color: 'var(--theme-text-secondary)' }}>
                {mood.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </PortalPopup>
  );
};

export default MoodSelector;