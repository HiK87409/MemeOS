/**
 * Configuration Manager for managing card settings, tag colors, and app configuration
 * Uses localStorage for persistence
 */

// Default global card settings
const DEFAULT_GLOBAL_SETTINGS = {
  cardStyle: 'default',
  backgroundColor: '',
  textColor: '',
  borderColor: '',
  borderWidth: '1',
  borderRadius: '8',
  padding: '16',
  margin: '8',
  shadow: 'true',
  fontSize: '16',
  fontFamily: 'default',
  showTags: 'true',
  showDate: 'true',
  showMood: 'true',
  showWeather: 'true',
  animation: 'true'
};

// Default individual card settings
const DEFAULT_CARD_SETTINGS = {
  cardStyle: 'default',
  backgroundColor: '',
  textColor: '',
  borderColor: '',
  borderWidth: '1',
  borderRadius: '8',
  padding: '16',
  margin: '8',
  shadow: 'true',
  fontSize: '16',
  fontFamily: 'default',
  showTags: 'true',
  showDate: 'true',
  showMood: 'true',
  showWeather: 'true',
  animation: 'true'
};

// Default tag colors
const DEFAULT_TAG_COLORS = {
  'work': '#3B82F6',
  'personal': '#10B981',
  'important': '#EF4444',
  'ideas': '#F59E0B',
  'todo': '#8B5CF6',
  'completed': '#059669'
};

class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from localStorage
   */
  loadConfig() {
    try {
      const savedConfig = localStorage.getItem('memeos_config');
      return savedConfig ? JSON.parse(savedConfig) : {};
    } catch (error) {
      console.error('Error loading config:', error);
      return {};
    }
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig(config = this.config) {
    try {
      localStorage.setItem('memeos_config', JSON.stringify(config));
      this.config = config;
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get tag colors
   */
  getTagColors() {
    return this.config.tagColors || DEFAULT_TAG_COLORS;
  }

  /**
   * Save tag colors
   */
  saveTagColors(tagColors) {
    this.config.tagColors = tagColors;
    return this.saveConfig();
  }

  /**
   * Get card settings for a specific note and theme
   */
  getCardSettings(themeMode, noteId) {
    const key = `card_settings_${themeMode}`;
    const cardSettings = this.config[key] || {};
    
    if (noteId) {
      return cardSettings[noteId] || { ...DEFAULT_CARD_SETTINGS };
    }
    
    return cardSettings;
  }

  /**
   * Save card settings for a specific note and theme
   */
  saveCardSettings(themeMode, settings, noteId) {
    const key = `card_settings_${themeMode}`;
    if (!this.config[key]) {
      this.config[key] = {};
    }
    
    this.config[key][noteId] = settings;
    return this.saveConfig();
  }

  /**
   * Get global card settings for a theme
   */
  getGlobalCardSettings(themeMode) {
    const key = `global_settings_${themeMode}`;
    return this.config[key] || { ...DEFAULT_GLOBAL_SETTINGS };
  }

  /**
   * Save global card settings for a theme
   */
  saveGlobalCardSettings(settings, themeMode) {
    const key = `global_settings_${themeMode}`;
    this.config[key] = settings;
    return this.saveConfig();
  }

  /**
   * Delete card settings for a specific note
   */
  deleteCardSettings(noteId) {
    // Delete from both light and dark theme settings
    const themes = ['light', 'dark'];
    let deleted = false;
    
    themes.forEach(theme => {
      const key = `card_settings_${theme}`;
      if (this.config[key] && this.config[key][noteId]) {
        delete this.config[key][noteId];
        deleted = true;
      }
    });
    
    if (deleted) {
      return this.saveConfig();
    }
    
    return true;
  }

  /**
   * Reset all card settings to default
   */
  resetAllCardSettings() {
    // Remove all card settings for both themes
    delete this.config.card_settings_light;
    delete this.config.card_settings_dark;
    
    // Reset global settings to default
    this.config.global_settings_light = { ...DEFAULT_GLOBAL_SETTINGS };
    this.config.global_settings_dark = { ...DEFAULT_GLOBAL_SETTINGS };
    
    return this.saveConfig();
  }

  /**
   * Get all card settings for a theme
   */
  getAllCardSettings(themeMode) {
    const key = `card_settings_${themeMode}`;
    return this.config[key] || {};
  }

  /**
   * Fetch global card settings (async wrapper for getGlobalCardSettings)
   */
  async fetchGlobalCardSettings(themeMode) {
    return this.getGlobalCardSettings(themeMode);
  }

  /**
   * Export configuration
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configString) {
    try {
      const importedConfig = JSON.parse(configString);
      this.config = { ...this.config, ...importedConfig };
      return this.saveConfig();
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  }

  /**
   * Clear all configuration
   */
  clearAllConfig() {
    this.config = {};
    return this.saveConfig();
  }
}

// Create singleton instance
const configManager = new ConfigManager();

export default configManager;