import React, { useState, useEffect, useRef } from 'react';
import { FiTag, FiX, FiStar } from 'react-icons/fi';
import { fetchAllTags, deleteTag as deleteTagApi } from '../api/notesApi';
import { getAllColors, getTagColorClass, getTagStyle, saveTagColor } from '../utils/tagColorUtils';
import { commonColors, getDefaultColor } from '../utils/commonColors';
import localConfigManager from '../utils/localConfigManager';

const TagSelector = ({ selectedTags = [], onTagsChange, className = '', autoOpen = false }) => {
  const [availableTags, setAvailableTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredTags, setFilteredTags] = useState([]);
  const [favoriteTags, setFavoriteTags] = useState([]);
  const [tagFavoriteStatus, setTagFavoriteStatus] = useState({});
  // 从localStorage读取上次选择的颜色，如果没有则默认为蓝色
  // 这个颜色只用于新创建的标签，不影响已存在的标签
  const [selectedColor, setSelectedColor] = useState(() => {
    return localStorage.getItem('lastSelectedTagColor') || 'blue';
  });
  const [tempCustomColor, setTempCustomColor] = useState('#3B82F6'); // 临时自定义颜色
  const [showColorPicker, setShowColorPicker] = useState(false);
  // 使用共享的常用配色
  const allColors = [...commonColors];
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  const [tagColorMap, setTagColorMap] = useState({}); // 存储标签颜色映射
  const [colorDataLoaded, setColorDataLoaded] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const colorPickerRef = useRef(null);

  // 获取标签颜色的辅助函数
  const getTagColorFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 无论是否有颜色映射，都统一返回白色文字样式
    // 背景色通过getTagStyleFromState函数的内联样式设置
    return 'text-white border border-theme-border';
  };

  // 获取标签样式的辅助函数
  const getTagStyleFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 如果是十六进制颜色值，直接使用
    if (colorValue && colorValue.startsWith('#')) {
      return {
        backgroundColor: colorValue,
        color: '#ffffff'
      };
    }
    
    // 预设颜色，需要从commonColors中查找对应的十六进制值
    const presetColor = commonColors.find(c => c.value === colorValue);
    if (presetColor) {
      return {
        backgroundColor: presetColor.hexColor,
        color: '#ffffff'
      };
    }
    
    // 如果找不到对应的预设颜色，使用默认颜色
    return {
      backgroundColor: '#3B82F6', // 默认天蓝色
      color: '#ffffff'
    };
  };

  // 加载颜色数据和标签颜色映射
  useEffect(() => {
    const loadColorsAndTagColors = async () => {
      setIsLoadingColors(true);
      try {
        // 并行加载颜色数据和标签颜色映射
        const [colors, tagColors] = await Promise.all([
          getAllColors(),
          (async () => {
            try {
              const { fetchTagColors } = await import('../api/notesApi.js');
              return await fetchTagColors();
            } catch (error) {
              console.error('加载标签颜色映射失败:', error);
              // 如果服务器请求失败，使用本地存储作为备份
              return JSON.parse(localStorage.getItem('tagColors') || '{}');
            }
          })()
        ]);
        
        // 服务器数据优先，同时更新本地存储
        if (Object.keys(tagColors).length > 0) {
          localStorage.setItem('tagColors', JSON.stringify(tagColors));
        }
        
        setTagColorMap(tagColors);
        setColorDataLoaded(true);
      } catch (error) {
        console.error('加载颜色失败:', error);
        // 如果加载失败，使用默认颜色（allColors已从commonColors初始化）
        // 尝试使用本地存储的数据
        const localColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
        setTagColorMap(localColors);
        setColorDataLoaded(true);
      } finally {
        setIsLoadingColors(false);
      }
    };
    
    loadColorsAndTagColors();
  }, []);

  // 监听标签颜色更新事件
  useEffect(() => {
    const handleTagColorsUpdated = async (event) => {
      const { tagName, color } = event.detail || {};
      
      // 如果有具体的标签颜色更新，立即应用
      if (tagName && color) {
        setTagColorMap(prev => ({
          ...prev,
          [tagName]: color
        }));
        
        // 更新本地存储
        try {
          const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
          savedColors[tagName] = color;
          localStorage.setItem('tagColors', JSON.stringify(savedColors));
        } catch (error) {
          console.error('更新本地存储失败:', error);
        }
      }
      
      // 延迟同步服务器数据，避免立即覆盖刚设置的颜色
      setTimeout(async () => {
        try {
          const { fetchTagColors } = await import('../api/notesApi.js');
          const updatedTagColors = await fetchTagColors();
          
          console.log('🔄 TagSelector延迟同步服务器颜色数据:', updatedTagColors);
          
          // 合并服务器数据和本地状态，优先保留本地最新的更改
          setTagColorMap(prev => {
            const currentLocalColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
            const mergedColors = {
              ...updatedTagColors,
              ...currentLocalColors, // 保留本地颜色
              ...prev, // 保留当前状态
              ...(tagName && color ? { [tagName]: color } : {}) // 确保当前标签颜色不丢失
            };
            console.log('🔄 TagSelector合并后的颜色状态:', mergedColors);
            return mergedColors;
          });
          
          // 保存到本地存储时也要确保不丢失本地颜色
          const currentLocalColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
          const finalColors = {
            ...updatedTagColors,
            ...currentLocalColors, // 保留所有本地颜色
            ...(tagName && color ? { [tagName]: color } : {}) // 确保当前标签颜色不丢失
          };
          localStorage.setItem('tagColors', JSON.stringify(finalColors));
          console.log('🔄 TagSelector最终保存到本地存储的颜色:', finalColors);
        } catch (error) {
          console.error('同步标签颜色失败:', error);
          // 如果同步失败，至少更新当前标签的颜色
          if (tagName && color) {
            setTagColorMap(prev => ({
              ...prev,
              [tagName]: color
            }));
          }
        }
      }, 500); // 延迟500ms同步
    };

    window.addEventListener('tagColorsUpdated', handleTagColorsUpdated);
    return () => {
      window.removeEventListener('tagColorsUpdated', handleTagColorsUpdated);
    };
  }, []);

  // 监听selectedColor变化，保存到localStorage
  // 注意：这个颜色只用于新创建的标签，不触发全局事件以避免影响其他组件
  useEffect(() => {
    if (selectedColor) {
      localStorage.setItem('lastSelectedTagColor', selectedColor);
    }
  }, [selectedColor]);

  // 收藏功能相关逻辑
  useEffect(() => {
    // 加载收藏列表
    const loadFavoriteTags = () => {
      try {
        const savedFavorites = localStorage.getItem('memeos_favorite_tags');
        const favorites = savedFavorites ? JSON.parse(savedFavorites) : [];
        setFavoriteTags(favorites);
        
        // 更新标签收藏状态映射
        const statusMap = {};
        favorites.forEach(tagName => {
          statusMap[tagName] = true;
        });
        setTagFavoriteStatus(statusMap);
      } catch (error) {
        console.error('加载收藏列表失败:', error);
        setFavoriteTags([]);
        setTagFavoriteStatus({});
      }
    };

    // 初始加载
    loadFavoriteTags();

    // 监听收藏列表更新事件
    const handleFavoriteTagsUpdated = async (event) => {
      const { favoriteTags: updatedFavorites } = event.detail || {};
      console.log('TagSelector收到收藏列表更新事件:', updatedFavorites);
      
      if (updatedFavorites) {
        setFavoriteTags(updatedFavorites);
        
        // 更新标签收藏状态映射
        const statusMap = {};
        updatedFavorites.forEach(tagName => {
          statusMap[tagName] = true;
        });
        setTagFavoriteStatus(statusMap);
        
        // 强制重新加载标签数据确保同步
        try {
          await localConfigManager.loadFromDatabase();
          const updatedTags = localConfigManager.getTags();
          setAvailableTags(updatedTags || []);
        } catch (error) {
          console.error('重新加载标签数据失败:', error);
        }
      }
    };

    // 添加全局事件监听器
    window.addEventListener('favoriteTagsUpdated', handleFavoriteTagsUpdated);

    // 清理函数
    return () => {
      window.removeEventListener('favoriteTagsUpdated', handleFavoriteTagsUpdated);
    };
  }, []);

  // 切换标签收藏状态
  const toggleTagFavorite = async (tagName) => {
    try {
      // 获取当前标签对象
      const allTags = localConfigManager.getTags();
      const findTagByName = (tags, targetName) => {
        return tags.find(tag => tag.name === targetName);
      };
      
      const tag = findTagByName(allTags, tagName);
      if (!tag) {
        console.error('未找到标签:', tagName);
        return;
      }
      
      // 更新标签的收藏状态
      const newFavoriteStatus = !tagFavoriteStatus[tagName];
      // 不在这里更新本地配置管理器，让TagManager.jsx负责统一更新
      // 避免重复更新导致的状态冲突
      
      // 更新收藏状态映射（只更新本地状态，不重新加载整个数据）
      const newStatusMap = { ...tagFavoriteStatus };
      if (newFavoriteStatus) {
        newStatusMap[tagName] = true;
      } else {
        delete newStatusMap[tagName];
      }
      setTagFavoriteStatus(newStatusMap);
      
      // 更新收藏列表（只更新本地状态）
      let updatedFavorites = [...favoriteTags];
      if (newFavoriteStatus) {
        if (!updatedFavorites.includes(tagName)) {
          updatedFavorites.push(tagName);
        }
      } else {
        updatedFavorites = updatedFavorites.filter(t => t !== tagName);
      }
      
      // 保存收藏列表到localStorage
      localStorage.setItem('memeos_favorite_tags', JSON.stringify(updatedFavorites));
      setFavoriteTags(updatedFavorites);
      
      // 触发收藏列表更新事件（让其他组件同步）
      window.dispatchEvent(new CustomEvent('favoriteTagsUpdated', {
        detail: { favoriteTags: updatedFavorites }
      }));
      
      console.log(`TagSelector: 标签 ${tagName} 收藏状态已切换: ${newFavoriteStatus ? '已收藏' : '未收藏'}`);
    } catch (error) {
      console.error('切换标签收藏状态失败:', error);
    }
  };

  // 自动打开下拉菜单
  useEffect(() => {
    if (autoOpen) {
      setIsDropdownOpen(true);
    }
  }, [autoOpen]);

  // 获取所有标签
  useEffect(() => {
    const loadTags = async () => {
      if (!isDropdownOpen) return;
      
      try {
        const tags = await fetchAllTags();
        setAvailableTags(tags || []);
      } catch (error) {
        console.error('加载标签失败:', error);
        setAvailableTags([]);
      }
    };
    
    loadTags();
  }, [isDropdownOpen]);

  // 过滤标签
  useEffect(() => {
    if (inputValue.trim() === '') {
      // 如果输入为空，显示所有标签
      const allTags = availableTags.map(tag => {
        if (typeof tag === 'string') {
          return { name: tag, count: 0 };
        }
        return tag;
      }).filter(tag => tag && tag.name);
      
      setFilteredTags(allTags);
    } else {
      // 根据输入过滤标签
      const filtered = availableTags.map(tag => {
        if (typeof tag === 'string') {
          return { name: tag, count: 0 };
        }
        return tag;
      }).filter(tag => 
        tag && tag.name && tag.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      
      setFilteredTags(filtered);
    }
  }, [inputValue, availableTags]);

  // 点击外部关闭下拉菜单和颜色选择器
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 关闭下拉菜单
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      
      // 关闭颜色选择器
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  // 添加标签
  const addTag = (tag) => {
    if (!tag) return;
    
    // 检查是否已存在
    const tagName = typeof tag === 'string' ? tag : (tag.name || '');
    if (!tagName) return;
    
    const exists = selectedTags.some(t => 
      (typeof t === 'string' ? t : (t && t.name)) === tagName
    );
    
    if (!exists) {
      const newTags = [...selectedTags, tag];
      onTagsChange(newTags);
    }
    
    setInputValue('');
    setIsDropdownOpen(false);
  };

  // 创建新标签
  const createNewTag = async () => {
    if (!inputValue.trim()) return;
    
    const tagName = inputValue.trim();
    
    // 检查是否已存在于选中标签中
    const existsInSelected = selectedTags.some(tag => 
      (typeof tag === 'string' ? tag : (tag && tag.name)) === tagName
    );
    
    // 检查是否已存在于所有可用标签中（防止重复创建）
    const existsInAvailable = availableTags.some(tag => {
      const existingTagName = typeof tag === 'string' ? tag : (tag && tag.name);
      return existingTagName === tagName;
    });
    
    if (existsInSelected || existsInAvailable) {
      // 如果标签已存在，显示提示并重置输入
      console.log(`标签 "${tagName}" 已存在，不允许重复创建`);
      setInputValue('');
      setIsDropdownOpen(false);
      return;
    }
    
    try {
      // 首先尝试创建标签到服务器
      try {
        const { createTag: createTagApi } = await import('../api/notesApi.js');
        const currentSelectedColor = selectedColor || 'slate';
        await createTagApi(tagName, currentSelectedColor);
      } catch (createError) {
        // 如果标签已存在于服务器，忽略错误继续
        if (createError.response?.status !== 409) {
          console.error('创建标签到服务器失败:', createError);
        }
      }
      
      // 确保selectedColor有值，如果没有则使用默认石板色
      const currentSelectedColor = selectedColor || 'slate';
      
      // 立即保存颜色到本地存储（确保立即可用）
      const currentTagColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
      currentTagColors[tagName] = currentSelectedColor;
      localStorage.setItem('tagColors', JSON.stringify(currentTagColors));
      
      // 更新本地标签颜色映射状态
      setTagColorMap(prev => {
        const newMap = {
          ...prev,
          [tagName]: currentSelectedColor
        };
        return newMap;
      });
      
      // 异步保存到服务器（不阻塞UI）
      (async () => {
        try {
          // 获取选中的颜色对象
          const selectedColorObj = allColors.find(c => c.value === currentSelectedColor) || 
                                   { value: currentSelectedColor, name: '自定义颜色', hexColor: currentSelectedColor };
          
          // 保存标签颜色到服务器
          await saveTagColor(tagName, selectedColorObj);
          
          console.log(`标签 "${tagName}" 的颜色 "${currentSelectedColor}" 已保存到服务器`);
        } catch (saveError) {
          console.error('保存标签颜色到服务器失败:', saveError);
        }
      })();
      
      // 触发全局事件，通知其他组件更新标签颜色
      window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
        detail: { tagName, color: currentSelectedColor }
      }));
      
      // 触发标签列表更新事件，通知TagManager等组件更新标签列表
      window.dispatchEvent(new CustomEvent('tagsUpdated', {
        detail: { action: 'add', tagName, tag: { name: tagName, color: currentSelectedColor } }
      }));
      
      // 重新加载可用标签列表以包含新创建的标签
      try {
        const tags = await fetchAllTags();
        setAvailableTags(tags || []);
      } catch (loadError) {
        console.error('重新加载标签列表失败:', loadError);
      }
      
      addTag(tagName);
      
      console.log(`创建标签 "${tagName}"，颜色: ${currentSelectedColor}`);
    } catch (error) {
      // 409错误（标签已存在）时静默处理，其他错误才显示错误信息
      if (error.response?.status !== 409) {
        console.error('创建标签失败:', error);
      }
      // 即使保存颜色失败，也要添加标签，但仍要保存颜色到本地
      const currentSelectedColor = selectedColor || 'blue';
      const currentTagColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
      currentTagColors[tagName] = currentSelectedColor;
      localStorage.setItem('tagColors', JSON.stringify(currentTagColors));
      
      setTagColorMap(prev => ({
        ...prev,
        [tagName]: currentSelectedColor
      }));
      
      addTag(tagName);
    }
    
    // 关闭颜色选择器，但保持选择的颜色
    setShowColorPicker(false);
  };

  // 移除标签
  const removeTag = (tagToRemove) => {
    if (!tagToRemove) return;
    
    const newTags = selectedTags.filter(tag => 
      (typeof tag === 'string' ? tag : (tag && tag.name)) !== 
      (typeof tagToRemove === 'string' ? tagToRemove : (tagToRemove && tagToRemove.name))
    );
    onTagsChange(newTags);
  };

  // 删除标签（从服务器完全删除）
  const deleteTag = async (tagToDelete) => {
    if (!tagToDelete) return;
    
    const tagName = typeof tagToDelete === 'string' ? tagToDelete : (tagToDelete && tagToDelete.name);
    if (!tagName) return;
    
    try {
      // 检查用户是否已登录
      const token = localStorage.getItem('token');
      if (!user) {
        // 使用自定义提示替代alert
        return;
      }
      
      // 调用后端API删除标签
      await deleteTagApi(tagName);
      
      // 从localStorage中删除标签颜色配置
      const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
      delete savedColors[tagName];
      localStorage.setItem('tagColors', JSON.stringify(savedColors));
      
      // 从收藏列表中移除标签
      try {
        const savedFavorites = localStorage.getItem('memeos_favorite_tags');
        const favorites = savedFavorites ? JSON.parse(savedFavorites) : [];
        if (favorites.includes(tagName)) {
          const updatedFavorites = favorites.filter(t => t !== tagName);
          localStorage.setItem('memeos_favorite_tags', JSON.stringify(updatedFavorites));
          setFavoriteTags(updatedFavorites);
          
          // 更新收藏状态映射
          const newStatusMap = { ...tagFavoriteStatus };
          delete newStatusMap[tagName];
          setTagFavoriteStatus(newStatusMap);
          
          // 触发收藏列表更新事件
          window.dispatchEvent(new CustomEvent('favoriteTagsUpdated', {
            detail: { favoriteTags: updatedFavorites }
          }));
          
          console.log(`已从收藏列表中移除标签: ${tagName}`);
        }
      } catch (error) {
        console.error('从收藏列表移除标签失败:', error);
      }
      
      // 从已选标签中移除
      removeTag(tagToDelete);
      
      // 重新加载标签列表
      const tags = await fetchAllTags();
      setAvailableTags(tags || []);
    } catch (error) {
      console.error('删除标签失败:', error);
      
      let errorMessage = '删除标签失败';
      if (error.response?.status === 401) {
        errorMessage = '请先登录';
      } else if (error.response?.status === 403) {
        errorMessage = '没有权限删除该标签';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (!error.response) {
        errorMessage = '网络连接失败，请检查网络连接';
      }
      
      // 使用自定义提示替代alert
    }
  };

  // 处理输入变化
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsDropdownOpen(true);
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createNewTag();
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // 保存自定义颜色
  const saveCustomColor = async (hexColor) => {
    try {
      // 检查是否已存在相同颜色
      const existingColor = allColors.find(c => c.hexColor === hexColor);
      if (existingColor) {
        return; // 已存在，不重复添加
      }
      
      // 创建新的自定义颜色对象
      const newColor = {
        value: hexColor,
        name: `自定义颜色`,
        hexColor: hexColor,
        class: ''
      };
      
      // 保存到服务器（通过保存一个临时标签颜色来添加自定义颜色）
      const { saveTagColorApi } = await import('../api/notesApi.js');
      await saveTagColorApi('__temp_custom_color__', hexColor, 'custom');
      
      // 更新本地状态
      setAllColors(prev => [...prev, newColor]);
    } catch (error) {
      console.error('保存自定义颜色失败:', error);
      // 如果服务器保存失败，回退到本地存储
      const customColors = JSON.parse(localStorage.getItem('customTagColors') || '[]');
      
      // 检查是否已存在相同颜色
      const existingIndex = customColors.findIndex(c => c.hexColor === hexColor);
      if (existingIndex !== -1) {
        return; // 已存在，不重复添加
      }
      
      // 限制最多10个自定义颜色
      if (customColors.length >= 10) {
        customColors.shift(); // 移除最旧的颜色
      }
      
      // 添加新颜色
      const newColor = {
        value: hexColor,
        name: `自定义颜色`,
        hexColor: hexColor,
        class: ''
      };
      
      customColors.push(newColor);
      localStorage.setItem('customTagColors', JSON.stringify(customColors));
      
      // 更新本地状态
      setAllColors(prev => [...prev, newColor]);
    }
  };

  // 删除自定义颜色
  const deleteCustomColor = async (colorValue) => {
    try {
      // 从服务器删除自定义颜色
      const { deleteCustomColorApi } = await import('../api/notesApi.js');
      await deleteCustomColorApi(colorValue);
      
      // 更新本地状态
      setAllColors(prev => prev.filter(c => c.value !== colorValue));
    } catch (error) {
      console.error('删除自定义颜色失败:', error);
      // 如果服务器删除失败，回退到本地存储
      const customColors = JSON.parse(localStorage.getItem('customTagColors') || '[]');
      const filteredColors = customColors.filter(c => c.value !== colorValue);
      localStorage.setItem('customTagColors', JSON.stringify(filteredColors));
      
      // 更新本地状态
      setAllColors(prev => prev.filter(c => c.value !== colorValue));
    }
    
    // 如果删除的是当前选择的颜色，切换到默认颜色
    if (selectedColor === colorValue) {
      setSelectedColor('blue');
      localStorage.setItem('lastSelectedTagColor', 'blue');
    }
    
    // 强制重新渲染组件
    setShowColorPicker(false);
    setTimeout(() => setShowColorPicker(true), 0);
  };

  return (
    <div className={`tag-selector relative w-full ${className}`}>
      {/* 标签选择按钮 - 只在非autoOpen模式下显示 */}
      {!autoOpen && (
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex flex-col items-center justify-center w-full h-full p-1 rounded text-xs text-theme-text-secondary bg-theme-hover hover:bg-theme-hover/80 border border-theme-border transition-colors"
        >
          <FiTag className="h-2.5 w-2.5 mb-0.5" />
          <span className="text-xs leading-none">标签</span>
        </button>
      )}

      {/* 标签下拉菜单 */}
      {isDropdownOpen && (
        <div 
          ref={dropdownRef}
          className={`${autoOpen ? 'relative' : 'absolute top-full left-0 mt-1'} bg-theme-surface rounded-lg shadow-lg border border-theme-border z-20 w-full max-h-80`}
        >
          {/* 已选标签区域 */}
          {selectedTags.length > 0 && (
            <div className="p-2 border-b border-theme-border">
              <div className="text-xs text-theme-text-muted mb-1">已选标签:</div>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag, index) => {
                  const tagName = typeof tag === 'string' ? tag : (tag && tag.name) || '';
                  if (!tagName) return null;
                  return (
                    <div 
                      key={index} 
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${getTagColorFromState(tagName)}`}
                      style={getTagStyleFromState(tagName)}
                    >
                      #{tagName}
                      {tagFavoriteStatus[tagName] && (
                        <FiStar 
                          className="ml-1 text-yellow-400" 
                          size={10} 
                          title="已收藏"
                        />
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                        className="ml-1 text-current hover:text-red-500 transition-colors"
                      >
                        <FiX size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 标签输入区域 */}
          <div className="p-2 border-b border-theme-border">
            <div className="relative border rounded-md focus-within:ring-2 focus-within:ring-theme-primary focus-within:border-theme-primary bg-theme-surface border-theme-border">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder=""
                className="w-full p-1.5 pr-7 bg-transparent text-xs text-theme-text placeholder-theme-text-muted focus:outline-none"
              />
              
              {/* 颜色选择器 - 点击输入框时显示，绝对定位在输入框内部右侧 */}
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowColorPicker(!showColorPicker);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-0.5 rounded-full hover:bg-theme-hover transition-colors select-none"
                  title="选择标签颜色"
                  style={{ userSelect: 'none' }}
                >
                  <span 
                    className="inline-block w-4 h-4 rounded-full border-2 border-white shadow-sm select-none"
                    style={{ 
                      backgroundColor: allColors.find(c => c.value === selectedColor)?.hexColor || '#3b82f6',
                      userSelect: 'none'
                    }}
                    title={`当前颜色: ${allColors.find(c => c.value === selectedColor)?.name || '天蓝色'}`}
                  ></span>
                </button>
                

              </div>
            </div>
          </div>
          


          {/* 标签列表 */}
          <div className="max-h-64 overflow-y-auto smooth-scroll-container scrollbar-smooth">
            {filteredTags.length > 0 ? (
              <div className="py-1">
                {filteredTags.map((tag, index) => {
                  const tagName = tag && tag.name;
                  if (!tagName) return null;
                  const isSelected = selectedTags.some(selected => 
                    (typeof selected === 'string' ? selected : selected.name) === tagName
                  );
                  return (
                    <div
                      key={index}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-theme-hover flex items-center justify-between group ${
                        isSelected ? 'bg-theme-hover' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => addTag(tag)}
                        className="flex items-center flex-1"
                      >
                        <span 
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getTagColorFromState(tagName)}`}
                          style={getTagStyleFromState(tagName)}
                        >
                          #{tagName}
                        </span>
                        <span className="ml-2 text-theme-text">
                          {tag.count > 0 && `(${tag.count})`}
                        </span>
                      </button>
                      <div className="flex items-center ml-2 space-x-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleTagFavorite(tagName);
                          }}
                          className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 opacity-70 hover:opacity-100 group-hover:opacity-100 ${
                            tagFavoriteStatus[tagName] 
                              ? 'text-yellow-400 hover:text-yellow-500' 
                              : 'text-theme-text-muted hover:text-yellow-400'
                          }`}
                          title={tagFavoriteStatus[tagName] ? "取消收藏" : "收藏标签"}
                        >
                          <FiStar className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteTag(tag);
                          }}
                          className="flex items-center justify-center w-6 h-6 rounded-full bg-theme-danger/10 hover:bg-theme-danger text-theme-danger hover:text-white flex-shrink-0 opacity-70 hover:opacity-100 group-hover:opacity-100"
                          title="删除标签"
                        >
                          <FiX className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-2 text-sm text-theme-text-muted">
                暂无标签
              </div>
            )}
          </div>

          {/* 底部信息 */}
          <div className="px-2 py-1 bg-theme-hover text-xs text-theme-text-muted border-t border-theme-border">
            已选择 {selectedTags.length} 个标签
          </div>
        </div>
      )}

      {/* 颜色选择器弹出面板 */}
      {showColorPicker && (
        <div 
          ref={colorPickerRef}
          className="absolute top-0 left-full ml-1 p-3 bg-theme-surface rounded-lg shadow-lg border border-theme-border z-[60] w-56"
          style={{ 
            userSelect: 'none'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >

          <div className="grid grid-cols-5 gap-3">
            {allColors.map((color) => {
              const isCustomColor = color.value.startsWith('#');
              return (
                <div key={color.value} className="relative group flex justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedColor(color.value);
                      setShowColorPicker(false);
                      // 注意：这里只更新selectedColor状态，用于新创建的标签
                      // 不会影响已存在标签的颜色，避免与TagPicker组件冲突
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className={`relative p-1 rounded-full select-none ${
                      selectedColor === color.value 
                        ? 'ring-2 ring-theme-text-secondary ring-offset-2 ring-offset-theme-surface' 
                        : 'hover:ring-2 hover:ring-theme-border hover:ring-offset-1 hover:ring-offset-theme-surface'
                    }`}
                    title={color.name}
                    style={{ userSelect: 'none' }}
                  >
                    <span 
                      className="inline-block w-6 h-6 rounded-full select-none shadow-sm border border-theme-border" 
                      style={{ 
                        backgroundColor: color.hexColor,
                        userSelect: 'none' 
                      }}
                    ></span>
                  </button>
                  
                  {/* 自定义颜色删除按钮 */}
                  {isCustomColor && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteCustomColor(color.value);
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 hover:opacity-100"
                      title="删除自定义颜色"
                    >
                      <FiX className="w-2 h-2" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* 自定义颜色选择器 */}
          <div className="mt-4 pt-4 border-t border-theme-border">
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={tempCustomColor}
                onChange={(e) => {
                  setTempCustomColor(e.target.value);
                }}
                className="w-10 h-10 rounded border border-theme-border cursor-pointer"
                title="选择自定义颜色"
              />
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await saveCustomColor(tempCustomColor);
                  setSelectedColor(tempCustomColor);
                  setShowColorPicker(false);
                  // 注意：这里只更新selectedColor状态，用于新创建的标签
                  // 不会影响已存在标签的颜色，避免与TagPicker组件冲突
                }}
                className="px-3 py-2 text-sm bg-theme-text-secondary hover:bg-theme-text-secondary/90 text-white rounded transition-colors"
                title="添加自定义颜色"
              >
                添加
              </button>
            </div>
          </div>
          

        </div>
      )}


    </div>
  );
};

export default TagSelector;