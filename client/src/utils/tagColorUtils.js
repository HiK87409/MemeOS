const TAG_COLORS = [
  { name: '石板色', class: 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100', value: 'slate', hexColor: '#64748B' },
  { name: '翠绿色', class: 'bg-green-200 dark:bg-green-600 text-green-900 dark:text-green-100', value: 'green', hexColor: '#10B981' },
  { name: '玫瑰红', class: 'bg-red-200 dark:bg-red-600 text-red-900 dark:text-red-100', value: 'red', hexColor: '#EF4444' },
  { name: '金黄色', class: 'bg-yellow-200 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100', value: 'yellow', hexColor: '#F59E0B' },
  { name: '紫罗兰', class: 'bg-purple-200 dark:bg-purple-600 text-purple-900 dark:text-purple-100', value: 'purple', hexColor: '#8B5CF6' },
  { name: '樱花粉', class: 'bg-pink-200 dark:bg-pink-600 text-pink-900 dark:text-pink-100', value: 'pink', hexColor: '#EC4899' },
  { name: '橙橘色', class: 'bg-orange-200 dark:bg-orange-600 text-orange-900 dark:text-orange-100', value: 'orange', hexColor: '#F97316' },
  { name: '青绿色', class: 'bg-teal-200 dark:bg-teal-600 text-teal-900 dark:text-teal-100', value: 'teal', hexColor: '#14B8A6' },
  { name: '靛青色', class: 'bg-indigo-200 dark:bg-indigo-600 text-indigo-900 dark:text-indigo-100', value: 'indigo', hexColor: '#6366F1' },
  { name: '薰衣草', class: 'bg-violet-200 dark:bg-violet-600 text-violet-900 dark:text-violet-100', value: 'violet', hexColor: '#7C3AED' }
];

// 获取所有可用颜色（包括预设和自定义）
export const getAllColors = async () => {
  try {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
      // 用户未登录，直接使用本地存储
      const customColors = JSON.parse(localStorage.getItem('customTagColors') || '[]');
      const deletedColors = JSON.parse(localStorage.getItem('deletedTagColors') || '[]');
      const availablePresetColors = TAG_COLORS.filter(c => !deletedColors.includes(c.value));
      const uniqueCustomColors = customColors.filter(custom => 
        !TAG_COLORS.some(preset => preset.value === custom.value || preset.hexColor === custom.hexColor)
      );
      return [...availablePresetColors, ...uniqueCustomColors];
    }

    // 尝试从服务器获取自定义颜色
    const { fetchCustomColors } = await import('../api/notesApi.js');
    const customColors = await fetchCustomColors();
    
    // 合并预设颜色和自定义颜色
    const uniqueCustomColors = customColors.filter(custom => 
      !TAG_COLORS.some(preset => preset.value === custom.value || preset.hexColor === custom.hexColor)
    );
    return [...TAG_COLORS, ...uniqueCustomColors];
  } catch (error) {
    // 只在非认证错误时显示错误信息
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      console.error('从服务器获取自定义颜色失败，使用本地存储:', error);
    }
    // 如果服务器请求失败，回退到本地存储
    const customColors = JSON.parse(localStorage.getItem('customTagColors') || '[]');
    const deletedColors = JSON.parse(localStorage.getItem('deletedTagColors') || '[]');
    const availablePresetColors = TAG_COLORS.filter(c => !deletedColors.includes(c.value));
    const uniqueCustomColors = customColors.filter(custom => 
      !TAG_COLORS.some(preset => preset.value === custom.value || preset.hexColor === custom.hexColor)
    );
    return [...availablePresetColors, ...uniqueCustomColors];
  }
};

// 获取标签颜色值
export const getTagColor = async (tag) => {
  const tagName = typeof tag === 'string' ? tag : tag.name;
  
  try {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
      // 用户未登录，直接使用本地存储
      const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
      const savedColor = savedColors[tagName];
      
      if (savedColor) {
        return savedColor;
      }
      
      // 如果没有保存的颜色，返回默认石板色
      return TAG_COLORS.find(color => color.value === 'slate') || TAG_COLORS[0];
    }

    // 尝试从服务器获取标签颜色
    const { fetchTagColors } = await import('../api/notesApi.js');
    const tagColors = await fetchTagColors();
    const savedColor = tagColors[tagName];
    
    if (savedColor) {
      return savedColor;
    }
    
    // 如果没有保存的颜色，返回默认石板色
    return TAG_COLORS.find(color => color.value === 'slate') || TAG_COLORS[0];
  } catch (error) {
    // 只在非认证错误时显示错误信息
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      console.error('从服务器获取标签颜色失败，使用本地存储:', error);
    }
    // 如果服务器请求失败，回退到本地存储
    const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
    const savedColor = savedColors[tagName];
    
    if (savedColor) {
      return savedColor;
    }
    
    // 如果没有保存的颜色，返回默认蓝色
    return TAG_COLORS.find(color => color.value === 'blue') || TAG_COLORS[0];
  }
};

// 获取标签颜色类名（同步版本，用于向后兼容）
export const getTagColorClass = (tag) => {
  // 尝试从localStorage获取颜色（向后兼容）
  const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
  const tagName = typeof tag === 'string' ? tag : (tag && tag.name);
  const color = savedColors[tagName] || 'slate';
  
  // 确保color是字符串类型
  const colorValue = typeof color === 'string' ? color : (color && color.value) || 'blue';
  
  // 如果是自定义颜色（以#开头）
  if (colorValue && typeof colorValue === 'string' && colorValue.startsWith('#')) {
    return 'text-white';
  }
  
  // 使用预设颜色
  const colorConfig = TAG_COLORS.find(c => c.value === colorValue);
  
  if (colorConfig) {
    return colorConfig.class;
  }
  
  return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300';
};

// 获取标签内联样式（同步版本，用于向后兼容）
export const getTagStyle = (tag) => {
  // 尝试从localStorage获取颜色（向后兼容）
  const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
  const tagName = typeof tag === 'string' ? tag : (tag && tag.name);
  const color = savedColors[tagName] || 'slate';
  
  // 确保color是字符串类型
  const colorValue = typeof color === 'string' ? color : (color && color.value) || 'blue';
  
  // 如果是自定义颜色（以#开头）
  if (colorValue && typeof colorValue === 'string' && colorValue.startsWith('#')) {
    return { 
      backgroundColor: colorValue,
      color: 'white',
      fontWeight: '500'
    };
  }
  
  // 预设颜色不需要内联样式，使用CSS类即可
  return {};
};

// 异步版本的获取标签颜色类名
export const getTagColorClassAsync = async (tag, allColors = null) => {
  try {
    const colors = allColors || await getAllColors();
    const tagName = typeof tag === 'string' ? tag : (tag && tag.name);
    
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
      // 用户未登录，使用本地存储
      const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
      const color = savedColors[tagName] || 'slate';
      
      const colorConfig = colors.find(c => c.value === color);
      
      if (colorConfig) {
        if (colorConfig.hexColor) {
          return 'text-white';
        } else {
          return colorConfig.class;
        }
      }
      
      return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300';
    }
    
    // 尝试从服务器获取标签颜色
    const { fetchTagColors } = await import('../api/notesApi.js');
    const tagColors = await fetchTagColors();
    const color = tagColors[tagName] || 'slate';
    
    const colorConfig = colors.find(c => c.value === color);
    
    if (colorConfig) {
      if (colorConfig.hexColor) {
        return 'text-white';
      } else {
        return colorConfig.class;
      }
    }
    
    return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300';
  } catch (error) {
    // 只在非认证错误时显示错误信息
    if (error.response?.status !== 401 && error.response?.status !== 403) {
      console.error('获取标签颜色类名失败:', error);
    }
    return getTagColorClass(tag); // 回退到同步版本
  }
};

// 异步版本的获取标签内联样式
export const getTagStyleAsync = async (tag, allColors = null) => {
  try {
    const colors = allColors || await getAllColors();
    const tagName = typeof tag === 'string' ? tag : (tag && tag.name);
    
    // 尝试从服务器获取标签颜色
    const { fetchTagColors } = await import('../api/notesApi.js');
    const tagColors = await fetchTagColors();
    const color = tagColors[tagName] || 'blue';
    
    const colorConfig = colors.find(c => c.value === color);
    
    if (colorConfig && colorConfig.hexColor) {
      return { 
        backgroundColor: colorConfig.hexColor,
        color: 'white',
        fontWeight: '500'
      };
    }
    
    return {};
  } catch (error) {
    console.error('获取标签内联样式失败:', error);
    return getTagStyle(tag); // 回退到同步版本
  }
};

// 保存标签颜色
export const saveTagColor = async (tagName, color) => {
  console.log('🔧 saveTagColor函数被调用，参数:', { tagName, color, colorType: typeof color });
  
  if (!tagName) {
    console.warn('saveTagColor: tagName is required');
    return;
  }

  let colorValue, colorType;
  
  // 智能处理颜色参数
  if (typeof color === 'string') {
    colorValue = color;
    colorType = color.startsWith('#') ? 'custom' : 'preset';
    console.log('🔧 处理字符串颜色:', { colorValue, colorType });
  } else if (color && typeof color === 'object') {
    console.log('🔧 处理对象颜色，对象内容:', color);
    console.log('🔧 对象属性检查:', {
      hasValue: color.hasOwnProperty('value'),
      hasHexColor: color.hasOwnProperty('hexColor'),
      value: color.value,
      hexColor: color.hexColor
    });
    
    colorValue = color.value || color.hexColor || color;
    colorType = color.value && color.value.startsWith('#') ? 'custom' : 'preset';
    console.log('🔧 从对象提取的颜色:', { colorValue, colorType });
  } else {
    colorValue = 'blue';
    colorType = 'preset';
    console.log('🔧 使用默认颜色:', { colorValue, colorType });
  }

  console.log(`🔧 最终处理结果: ${tagName} -> ${colorValue} (${colorType})`);

  try {
    // 1. 立即保存到本地存储（确保立即可用）
    const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
    savedColors[tagName] = colorValue;
    localStorage.setItem('tagColors', JSON.stringify(savedColors));
    console.log(`本地存储已更新: ${tagName} -> ${colorValue}`);

    // 2. 检查用户登录状态
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('用户未登录，仅保存到本地存储');
      // 触发本地更新事件
      window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
        detail: { tagName, color: colorValue }
      }));
      return { success: true, source: 'local' };
    }

    // 3. 尝试保存到服务器
    try {
      console.log('🌐 开始调用服务器API，参数:', { tagName, colorValue, colorType });
      const { saveTagColorApi } = await import('../api/notesApi.js');
      const serverResult = await saveTagColorApi(tagName, colorValue, colorType);
      console.log(`🌐 服务器保存成功: ${tagName} -> ${colorValue}`, serverResult);

      // 4. 触发颜色更新事件
      window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
        detail: { tagName, color: colorValue }
      }));

      return { success: true, source: 'server' };
    } catch (serverError) {
      console.error('服务器保存失败，但本地存储已保存:', serverError);
      
      // 即使服务器保存失败，也要触发本地更新事件
      window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
        detail: { tagName, color: colorValue }
      }));

      return { success: true, source: 'local', serverError };
    }

  } catch (error) {
    console.error('保存标签颜色完全失败:', error);
    
    // 尝试再次保存到本地存储
    try {
      const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
      savedColors[tagName] = colorValue;
      localStorage.setItem('tagColors', JSON.stringify(savedColors));
      
      window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
        detail: { tagName, color: colorValue }
      }));

      return { success: false, error, localFallback: true };
    } catch (localError) {
      console.error('本地存储也失败:', localError);
      return { success: false, error, localError };
    }
  }
};
