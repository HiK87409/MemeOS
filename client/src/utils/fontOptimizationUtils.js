/**
 * 字体优化工具类
 * 提供字体大小计算、样式生成等实用功能
 */

export class FontOptimizationUtils {
  /**
   * 设备类型枚举
   */
  static DEVICE_TYPES = {
    MOBILE_SMALL: 'mobile-small',
    MOBILE: 'mobile',
    TABLET: 'tablet',
    DESKTOP: 'desktop',
    LARGE_DESKTOP: 'large-desktop',
  };

  /**
   * 字体大小系数
   */
  static FONT_SIZE_COEFFICIENTS = {
    [this.DEVICE_TYPES.MOBILE_SMALL]: 0.75,
    [this.DEVICE_TYPES.MOBILE]: 0.875,
    [this.DEVICE_TYPES.TABLET]: 0.938,
    [this.DEVICE_TYPES.DESKTOP]: 1.0,
    [this.DEVICE_TYPES.LARGE_DESKTOP]: 1.125,
  };

  /**
   * 行高系数
   */
  static LINE_HEIGHT_COEFFICIENTS = {
    [this.DEVICE_TYPES.MOBILE_SMALL]: 0.875,
    [this.DEVICE_TYPES.MOBILE]: 0.938,
    [this.DEVICE_TYPES.TABLET]: 0.969,
    [this.DEVICE_TYPES.DESKTOP]: 1.0,
    [this.DEVICE_TYPES.LARGE_DESKTOP]: 1.031,
  };

  /**
   * 检测设备类型
   * @param {number} width - 屏幕宽度
   * @returns {string} 设备类型
   */
  static detectDeviceType(width) {
    if (width <= 400) {
      return this.DEVICE_TYPES.MOBILE_SMALL;
    } else if (width <= 768) {
      return this.DEVICE_TYPES.MOBILE;
    } else if (width >= 769 && width <= 1024) {
      return this.DEVICE_TYPES.TABLET;
    } else if (width >= 1920) {
      return this.DEVICE_TYPES.LARGE_DESKTOP;
    } else {
      return this.DEVICE_TYPES.DESKTOP;
    }
  }

  /**
   * 计算响应式字体大小
   * @param {number} baseSize - 基础字体大小
   * @param {string} deviceType - 设备类型
   * @returns {number} 响应式字体大小
   */
  static calculateFontSize(baseSize, deviceType = this.DEVICE_TYPES.DESKTOP) {
    const coefficient = this.FONT_SIZE_COEFFICIENTS[deviceType] || 1.0;
    return Math.round(baseSize * coefficient);
  }

  /**
   * 计算响应式行高
   * @param {number} baseLineHeight - 基础行高
   * @param {string} deviceType - 设备类型
   * @returns {number} 响应式行高
   */
  static calculateLineHeight(baseLineHeight, deviceType = this.DEVICE_TYPES.DESKTOP) {
    const coefficient = this.LINE_HEIGHT_COEFFICIENTS[deviceType] || 1.0;
    const calculatedLineHeight = baseLineHeight * coefficient;
    
    // 确保行高在合理范围内
    return Math.max(Math.min(calculatedLineHeight, 1.8), 1.2);
  }

  /**
   * 生成响应式字体样式
   * @param {Object} options - 样式选项
   * @returns {Object} 响应式字体样式对象
   */
  static generateResponsiveFontStyle(options = {}) {
    const {
      baseSize = 16,
      baseLineHeight = 1.6,
      weight = 'normal',
      family = 'inherit',
      deviceType = this.DEVICE_TYPES.DESKTOP,
    } = options;

    return {
      fontSize: `${this.calculateFontSize(baseSize, deviceType)}px`,
      lineHeight: this.calculateLineHeight(baseLineHeight, deviceType),
      fontWeight: weight,
      fontFamily: family,
    };
  }

  /**
   * 生成CSS媒体查询规则
   * @param {string} property - CSS属性名
   * @param {string|number} desktopValue - 桌面端值
   * @returns {string} CSS媒体查询规则
   */
  static generateMediaQuery(property, desktopValue) {
    const rules = [];
    
    // 移动设备 (≤768px)
    const mobileValue = typeof desktopValue === 'number' 
      ? desktopValue * 0.875 
      : desktopValue;
    rules.push(`@media (max-width: 768px) { ${property}: ${mobileValue}; }`);
    
    // 特别小的手机设备 (≤400px)
    const mobileSmallValue = typeof desktopValue === 'number' 
      ? desktopValue * 0.75 
      : desktopValue;
    rules.push(`@media (max-width: 400px) { ${property}: ${mobileSmallValue}; }`);
    
    // 平板设备 (769px - 1024px)
    const tabletValue = typeof desktopValue === 'number' 
      ? desktopValue * 0.938 
      : desktopValue;
    rules.push(`@media (min-width: 769px) and (max-width: 1024px) { ${property}: ${tabletValue}; }`);
    
    // 大屏幕设备 (≥1920px)
    const largeDesktopValue = typeof desktopValue === 'number' 
      ? desktopValue * 1.125 
      : desktopValue;
    rules.push(`@media (min-width: 1920px) { ${property}: ${largeDesktopValue}; }`);
    
    return rules.join('\n');
  }

  /**
   * 获取预设字体大小
   * @param {string} sizeName - 字体大小名称
   * @param {string} deviceType - 设备类型
   * @returns {number} 字体大小
   */
  static getPresetFontSize(sizeName, deviceType = this.DEVICE_TYPES.DESKTOP) {
    const presetSizes = {
      'xs': 10,
      'sm': 12,
      'base': 16,
      'lg': 18,
      'xl': 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
      '6xl': 60,
    };

    const baseSize = presetSizes[sizeName] || 16;
    return this.calculateFontSize(baseSize, deviceType);
  }

  /**
   * 获取预设行高
   * @param {string} lineHeightName - 行高名称
   * @param {string} deviceType - 设备类型
   * @returns {number} 行高
   */
  static getPresetLineHeight(lineHeightName, deviceType = this.DEVICE_TYPES.DESKTOP) {
    const presetLineHeights = {
      'tight': 1.25,
      'snug': 1.375,
      'normal': 1.5,
      'relaxed': 1.625,
      'loose': 2,
    };

    const baseLineHeight = presetLineHeights[lineHeightName] || 1.6;
    return this.calculateLineHeight(baseLineHeight, deviceType);
  }

  /**
   * 生成响应式文本类名
   * @param {string} baseClass - 基础类名
   * @returns {string} 响应式文本类名
   */
  static generateResponsiveTextClass(baseClass) {
    return `text-responsive-${baseClass}`;
  }

  /**
   * 生成响应式行高类名
   * @returns {string} 响应式行高类名
   */
  static generateResponsiveLineHeightClass() {
    return 'leading-responsive';
  }

  /**
   * 检查是否为移动设备
   * @param {string} deviceType - 设备类型
   * @returns {boolean}
   */
  static isMobileDevice(deviceType) {
    return deviceType === this.DEVICE_TYPES.MOBILE || 
           deviceType === this.DEVICE_TYPES.MOBILE_SMALL;
  }

  /**
   * 检查是否为平板设备
   * @param {string} deviceType - 设备类型
   * @returns {boolean}
   */
  static isTabletDevice(deviceType) {
    return deviceType === this.DEVICE_TYPES.TABLET;
  }

  /**
   * 检查是否为桌面设备
   * @param {string} deviceType - 设备类型
   * @returns {boolean}
   */
  static isDesktopDevice(deviceType) {
    return deviceType === this.DEVICE_TYPES.DESKTOP || 
           deviceType === this.DEVICE_TYPES.LARGE_DESKTOP;
  }

  /**
   * 获取最佳阅读宽度
   * @param {string} deviceType - 设备类型
   * @returns {number} 最佳阅读宽度（字符数）
   */
  static getOptimalReadingWidth(deviceType = this.DEVICE_TYPES.DESKTOP) {
    const widths = {
      [this.DEVICE_TYPES.MOBILE_SMALL]: 55,
      [this.DEVICE_TYPES.MOBILE]: 60,
      [this.DEVICE_TYPES.TABLET]: 62,
      [this.DEVICE_TYPES.DESKTOP]: 65,
      [this.DEVICE_TYPES.LARGE_DESKTOP]: 70,
    };
    
    return widths[deviceType] || 65;
  }

  /**
   * 计算字体缩放比例
   * @param {string} fromDevice - 源设备类型
   * @param {string} toDevice - 目标设备类型
   * @param {number} fontSize - 字体大小
   * @returns {number} 缩放后的字体大小
   */
  static calculateFontScaling(fromDevice, toDevice, fontSize) {
    const fromCoefficient = this.FONT_SIZE_COEFFICIENTS[fromDevice] || 1.0;
    const toCoefficient = this.FONT_SIZE_COEFFICIENTS[toDevice] || 1.0;
    
    const baseSize = fontSize / fromCoefficient;
    return Math.round(baseSize * toCoefficient);
  }
}

export default FontOptimizationUtils;