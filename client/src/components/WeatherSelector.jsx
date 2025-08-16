import React, { useState } from 'react';
import { FiCloud } from 'react-icons/fi';
import PortalPopup from './PortalPopup';
import { moodWeatherConfig } from '../config/moodWeatherConfig';

const WeatherSelector = ({ onWeatherSelect, onClose, isOpen, triggerRef }) => {
  return (
    <PortalPopup
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      className="w-80"
    >
      <div 
        className="weather-selector-popup rounded-lg shadow-lg border p-4 bg-theme-surface border-theme-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiCloud size={16} className="text-theme-primary" />
            <span className="font-medium text-theme-text">选择天气</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="hover:opacity-70 transition-opacity text-theme-text-secondary"
          >
            ×
          </button>
        </div>
        
        {/* 天气网格 */}
        <div className="grid grid-cols-6 gap-2">
          {moodWeatherConfig.allWeathers.map((weather, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onWeatherSelect(weather);
              }}
              className="flex flex-col items-center p-2 rounded-lg transition-colors group hover:bg-theme-surface"
              title={weather.description}
            >
              <span 
                className="text-2xl mb-1 transition-colors emoji-button"
                style={{
                  fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiSymbols, EmojiOne Mozilla, Twemoji Mozilla, Segoe UI Symbol, Noto Emoji',
                  fontVariantEmoji: 'emoji',
                  textRendering: 'optimizeQuality'
                }}
              >
                {weather.emoji}
              </span>
              <span className="text-xs text-center leading-tight text-theme-text-secondary">
                {weather.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </PortalPopup>
  );
};

export default WeatherSelector;