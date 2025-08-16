import React, { useEffect, useRef, useState } from 'react';
import { FiPlus, FiChevronDown, FiX, FiCheck, FiEdit3, FiStar } from 'react-icons/fi';
// API imports removed - now using localConfigManager for all tag operations
import PortalPopup from './PortalPopup';
import localConfigManager from '../utils/localConfigManager';
import { commonColors, getDefaultColor } from '../utils/commonColors';

const TagPicker = ({ 
  isOpen, 
  triggerRef, 
  selectedTags = [], 
  onTagsChange, 
  onClose,
  cardSettings
}) => {
  const [availableTags, setAvailableTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tagColorMap, setTagColorMap] = useState({});
  const [favoriteTags, setFavoriteTags] = useState([]);
  
  // 新标签创建相关状态
  const [inputValue, setInputValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6'); // 默认天蓝色
  // 注意：这个selectedColor只用于TagPicker中已存在标签的颜色修改
  // 与TagSelector中的selectedColor是独立的，避免冲突
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);
  const colorButtonRef = useRef(null);
  
  // 创建搜索输入框的ref
  const searchInputRef = useRef(null);
  
  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // 删除功能相关状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  
  // 已选标签模态框相关状态
  const [showSelectedTagsModal, setShowSelectedTagsModal] = useState(false);

  // 加载标签数据
  const loadTags = async () => {
    setIsLoading(true);
    try {
      // 使用localConfigManager获取标签数据
      const tags = localConfigManager.getTags();
      const tagColors = localConfigManager.getTagColors();
      
      // 扁平化标签列表
      const flattenTags = (tags) => {
        return tags.map(tag => tag.name);
      };
      
      setAvailableTags(flattenTags(tags) || []);
      setTagColorMap(tagColors || {});
      
      // 加载收藏列表
      loadFavoriteTags();
    } catch (error) {
      console.error('加载标签失败:', error);
      setAvailableTags(['工作', '学习', '生活', '想法', '计划', '重要', '待办']);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载收藏列表
  const loadFavoriteTags = () => {
    try {
      // 使用favoriteConfig中的配置参数
      const config = window.favoriteConfigManager ? window.favoriteConfigManager.getConfig() : {
        enablePersistenceOptimization: true,
        enableBatchOperations: true,
        enableStateSynchronization: true,
        enableLogging: false
      };
      
      let favorites = [];
      if (config.enablePersistenceOptimization) {
        const savedFavorites = localStorage.getItem('memeos_favorite_tags');
        if (savedFavorites) {
          favorites = JSON.parse(savedFavorites);
        }
      }
      
      if (favorites.length > 0) {
        // 不过滤收藏标签，保留所有收藏状态，避免因为availableTags的限制而丢失收藏状态
        // 只过滤掉明显无效的标签（空字符串、null、undefined等）
        const validFavorites = favorites.filter(tag => 
          tag && typeof tag === 'string' && tag.trim().length > 0
        );
        
        // 如果过滤后的列表与原列表不同，说明有无效标签需要清理
        if (validFavorites.length !== favorites.length) {
          if (config.enableLogging) {
            console.log('加载时清理无效收藏标签:', { 
              original: favorites, 
              filtered: validFavorites, 
              removed: favorites.filter(tag => !tag || typeof tag !== 'string' || tag.trim().length === 0) 
            });
          }
          
          // 更新localStorage中的收藏列表
          if (config.enablePersistenceOptimization) {
            localStorage.setItem('memeos_favorite_tags', JSON.stringify(validFavorites));
          }
        }
        
        setFavoriteTags(validFavorites);
      }
      
      if (config.enableLogging) {
        console.log('TagPicker: 加载收藏列表完成:', { count: favorites.length });
      }
    } catch (error) {
      console.error('加载收藏列表失败:', error);
      setFavoriteTags([]);
    }
  };

  // 保存收藏列表
  const saveFavoriteTags = (favorites) => {
    try {
      // 使用favoriteConfig中的配置参数
      const favoriteConfig = window.favoriteConfigManager ? window.favoriteConfigManager.getConfig() : {
        enablePersistenceOptimization: true,
        enableBatchOperations: true,
        enableStateSynchronization: true,
        enableLogging: false
      };
      
      if (favoriteConfig.enablePersistenceOptimization) {
        localStorage.setItem('memeos_favorite_tags', JSON.stringify(favorites));
      }
      
      setFavoriteTags(favorites);
      
      // 触发收藏列表更新事件
      if (favoriteConfig.enableStateSynchronization) {
        window.dispatchEvent(new CustomEvent('favoriteTagsUpdated', {
          detail: { favoriteTags: favorites }
        }));
      }
      
      if (favoriteConfig.enableLogging) {
        console.log('TagPicker: 保存收藏列表:', favorites);
      }
    } catch (error) {
      console.error('保存收藏列表失败:', error);
    }
  };

  // 添加到收藏列表
  const addToFavorites = (tag) => {
    if (!favoriteTags.includes(tag)) {
      const newFavorites = [...favoriteTags, tag];
      saveFavoriteTags(newFavorites);
    }
  };

  // 从收藏列表移除
  const removeFromFavorites = (tag) => {
    const newFavorites = favoriteTags.filter(t => t !== tag);
    saveFavoriteTags(newFavorites);
  };

  // 统一的标签参数结构
  const getUnifiedTagParams = (tagName) => {
    return {
      id: tagName, // 在TagPicker中，标签名称作为唯一标识
      name: tagName,
      color: tagColorMap[tagName] || '#3B82F6',
      isFavorite: favoriteTags.includes(tagName),
      isPinned: false, // TagPicker中暂不使用置顶功能
      // 统一的收藏操作函数
      toggleFavorite: async () => {
        try {
          // 使用favoriteConfig中的配置参数
          const config = window.favoriteConfigManager ? window.favoriteConfigManager.getConfig() : {
            enablePersistenceOptimization: true,
            enableBatchOperations: true,
            enableStateSynchronization: true,
            enableLogging: false
          };
          
          if (config.enableLogging) {
            console.log('TagPicker: 切换收藏状态:', { tag: tagName, currentStatus: favoriteTags.includes(tagName) });
          }
          
          if (favoriteTags.includes(tagName)) {
            removeFromFavorites(tagName);
            return false;
          } else {
            addToFavorites(tagName);
            return true;
          }
        } catch (error) {
          console.error('切换收藏状态失败:', error);
          throw error;
        }
      }
    };
  };

  // 切换收藏状态 - 保持向后兼容
  const toggleFavorite = (tag) => {
    const unifiedTag = getUnifiedTagParams(tag);
    return unifiedTag.toggleFavorite();
  };

  // 始终监听收藏列表更新事件 - 独立于组件打开状态
  useEffect(() => {
    // 添加收藏列表更新事件监听器
    window.addEventListener('favoriteTagsUpdated', handleFavoriteTagsUpdated);
    
    return () => {
      // 清理事件监听器
      window.removeEventListener('favoriteTagsUpdated', handleFavoriteTagsUpdated);
    };
  }, []);

  // 组件打开时加载数据
  useEffect(() => {
    if (isOpen) {
      // 立即加载一次数据，确保初始状态正确
      const immediateLoad = () => {
        const tags = localConfigManager.getTags();
        const tagColors = localConfigManager.getTagColors();
        
        const flattenTags = (tags) => {
          return tags.map(tag => tag.name);
        };
        
        setAvailableTags(flattenTags(tags) || []);
        setTagColorMap(tagColors || {});
        loadFavoriteTags();
      };
      
      immediateLoad();
      loadTags();
      
      // 如果有选中的标签，自动设置颜色选择器的状态
      if (selectedTags.length > 0) {
        const lastSelectedTag = selectedTags[selectedTags.length - 1];
        const tagColor = tagColorMap[lastSelectedTag];
        if (tagColor) {
          if (tagColor.startsWith('#')) {
            setSelectedColor(tagColor);
          } else {
            // 如果是预设颜色名称，查找对应的十六进制值
            const colorObj = commonColors.find(c => c.value === tagColor);
            setSelectedColor(colorObj ? colorObj.hexColor : '#3B82F6');
          }
        } else {
          // 如果没有找到颜色，使用默认颜色
          setSelectedColor('#3B82F6');
        }
      }
      
      // 设置localConfigManager事件监听器
      localConfigManager.addListener('tagsChanged', handleTagsChanged);
      localConfigManager.addListener('tagColorsChanged', handleTagColorsChanged);
    }
    
    return () => {
      // 清理事件监听器
      localConfigManager.removeListener('tagsChanged', handleTagsChanged);
      localConfigManager.removeListener('tagColorsChanged', handleTagColorsChanged);
    };
  }, [isOpen]);
  
  // 监听availableTags变化，确保收藏列表与可用标签同步
  useEffect(() => {
    if (availableTags.length > 0) {
      // 当availableTags更新后，重新加载收藏列表以确保数据一致性
      loadFavoriteTags();
    }
  }, [availableTags]);
  
  // 处理标签变化事件
  const handleTagsChanged = (tags) => {
    const flattenTags = (tags) => {
      return tags.map(tag => tag.name);
    };
    
    setAvailableTags(flattenTags(tags) || []);
  };
  
  // 处理标签颜色变化事件
  const handleTagColorsChanged = (tagColors) => {
    setTagColorMap(tagColors || {});
  };

  // 处理收藏列表更新事件 - 独立于isOpen状态
  const handleFavoriteTagsUpdated = (event) => {
    const { favoriteTags: updatedFavorites } = event.detail || {};
    
    // 使用favoriteConfig中的配置参数
    const config = window.favoriteConfigManager ? window.favoriteConfigManager.getConfig() : {
      enablePersistenceOptimization: true,
      enableBatchOperations: true,
      enableStateSynchronization: true,
      enableLogging: false
    };
    
    if (config.enableLogging) {
      console.log('TagPicker收到收藏列表更新事件:', updatedFavorites);
    }
    
    if (updatedFavorites) {
      // 不过滤收藏标签，保留所有收藏状态，避免因为availableTags的限制而丢失收藏状态
      // 只过滤掉明显无效的标签（空字符串、null、undefined等）
      const validFavorites = updatedFavorites.filter(tag => 
        tag && typeof tag === 'string' && tag.trim().length > 0
      );
      
      // 如果过滤后的列表与原列表不同，说明有无效标签需要清理
      if (validFavorites.length !== updatedFavorites.length) {
        if (config.enableLogging) {
          console.log('清理无效收藏标签:', { 
            original: updatedFavorites, 
            filtered: validFavorites, 
            removed: updatedFavorites.filter(tag => !tag || typeof tag !== 'string' || tag.trim().length === 0) 
          });
        }
        
        // 更新localStorage中的收藏列表
        try {
          if (config.enablePersistenceOptimization) {
            localStorage.setItem('memeos_favorite_tags', JSON.stringify(validFavorites));
          }
          
          // 重新触发事件通知其他组件
          if (config.enableStateSynchronization) {
            window.dispatchEvent(new CustomEvent('favoriteTagsUpdated', {
              detail: { favoriteTags: validFavorites }
            }));
          }
        } catch (error) {
          console.error('更新收藏列表失败:', error);
        }
      }
      
      setFavoriteTags(validFavorites);
    }
  };

  // 处理标签选择
  const handleTagSelect = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    onTagsChange(newTags);
    
    // 当选择标签时，同步更新颜色选择器的状态
    if (!selectedTags.includes(tag)) {
      // 新选择标签时，加载该标签的颜色
      const tagColor = tagColorMap[tag];
      if (tagColor) {
        if (tagColor.startsWith('#')) {
          setSelectedColor(tagColor);
        } else {
          // 如果是预设颜色名称，查找对应的十六进制值
          const colorObj = commonColors.find(c => c.value === tagColor);
          setSelectedColor(colorObj ? colorObj.hexColor : '#3B82F6');
        }
      } else {
        // 如果没有找到颜色，使用默认颜色
        setSelectedColor('#3B82F6');
      }
    }
    
    // 触发标签选择事件，确保状态同步
    const action = selectedTags.includes(tag) ? 'remove' : 'select';
    window.dispatchEvent(new CustomEvent('tagsUpdated', {
      detail: { action: action, tagName: tag, tags: newTags }
    }));
  };

  // 处理收藏区域标签点击 - 添加到已选标签列表
  const handleFavoriteTagClick = (tag) => {
    console.log('🎯 handleFavoriteTagClick 被调用:', { tag, selectedTags });
    
    // 如果标签不在已选列表中，则添加到已选列表
    if (!selectedTags.includes(tag)) {
      const newSelectedTags = [...selectedTags, tag];
      console.log('🎯 添加到已选标签:', { tag, newSelectedTags });
      onTagsChange(newSelectedTags);
      
      // 触发标签选择事件，确保状态同步
      window.dispatchEvent(new CustomEvent('tagsUpdated', {
        detail: { action: 'select', tagName: tag, tags: newSelectedTags }
      }));
    }
  };

  // 监听标签更新事件，实现实时同步
  useEffect(() => {
    const handleTagsUpdated = (event) => {
      const { action } = event.detail || {};
      console.log('🎯 handleTagsUpdated 被调用:', { action, isOpen });
      
      // 当标签发生变化时，重新加载数据
      // 但排除备选区的添加/移除操作，避免不必要的重载导致闪烁
      if (isOpen && !['add_to_available', 'remove_from_available'].includes(action)) {
        console.log('🎯 执行 loadTags()');
        loadTags();
      } else {
        console.log('🎯 跳过 loadTags() - 备选区操作或组件未打开');
      }
    };

    const handleTagColorsUpdated = async (event) => {
      const { tagName, color } = event.detail || {};
      
      if (tagName && color) {
        // 立即更新本地状态
        setTagColorMap(prev => ({
          ...prev,
          [tagName]: color
        }));
      }
      
      // 标签颜色同步已通过localConfigManager完成，无需额外操作
    };

    // 监听收藏列表更新事件
    const handleFavoriteTagsUpdated = (event) => {
      const { favoriteTags: updatedFavorites } = event.detail || {};
      if (updatedFavorites) {
        setFavoriteTags(updatedFavorites);
      }
    };

    // 监听筛选清除事件
    const handleFilterCleared = () => {
      console.log('TagPicker接收到filterCleared事件，清除选中状态');
      // 清除所有选中的标签
      onTagsChange([]);
      // 重置搜索状态
      setSearchTerm('');
      setIsSearchMode(false);
      setShowSearchDropdown(false);
    };

    // 监听标签变化和颜色变化事件
    window.addEventListener('tagsUpdated', handleTagsUpdated);
    window.addEventListener('tagColorsUpdated', handleTagColorsUpdated);
    window.addEventListener('favoriteTagsUpdated', handleFavoriteTagsUpdated);
    window.addEventListener('filterCleared', handleFilterCleared);
    
    return () => {
      window.removeEventListener('tagsUpdated', handleTagsUpdated);
      window.removeEventListener('tagColorsUpdated', handleTagColorsUpdated);
      window.removeEventListener('favoriteTagsUpdated', handleFavoriteTagsUpdated);
      window.removeEventListener('filterCleared', handleFilterCleared);
    };
  }, [isOpen]);



  // 创建新标签
  const createTag = async () => {
    // 根据当前模式获取要创建的标签名称
    const trimmedValue = isSearchMode ? searchTerm.trim() : inputValue.trim();
    if (!trimmedValue) return;
    
    // 检查标签是否已存在
    const tagExists = availableTags.some(tag => {
      const tagName = typeof tag === 'string' ? tag : (tag && tag.name);
      return tagName === trimmedValue;
    });
    
    try {
      if (!tagExists) {
        // 使用localConfigManager创建新标签
        const newTag = await localConfigManager.addTag({
          name: trimmedValue,
          isPinned: false,
          children: []
        });
        
        if (newTag) {
          // 设置标签颜色 - 确保使用有效的十六进制颜色值
        let colorToSet = selectedColor;
        
        // 如果selectedColor是预设颜色名称，查找对应的十六进制值
        if (!selectedColor.startsWith('#')) {
          const colorObj = commonColors.find(c => c.value === selectedColor);
          colorToSet = colorObj ? colorObj.hexColor : '#3B82F6';
        }
        
        await localConfigManager.setTagColor(trimmedValue, colorToSet);
          console.log('🎯 TagPicker通过localConfigManager创建标签:', trimmedValue);
        }
      }
      
      // 立即更新本地状态
      const updatedTags = tagExists ? availableTags : [...availableTags, trimmedValue];
      setAvailableTags(updatedTags);
      
      // 立即更新标签颜色映射 - 确保使用有效的十六进制颜色值
      let colorToSave = selectedColor;
      
      // 如果selectedColor是预设颜色名称，查找对应的十六进制值
      if (!selectedColor.startsWith('#')) {
        const colorObj = commonColors.find(c => c.value === selectedColor);
        colorToSave = colorObj ? colorObj.hexColor : '#3B82F6';
      }
      
      const newTagColorMap = {
        ...tagColorMap,
        [trimmedValue]: colorToSave
      };
      setTagColorMap(newTagColorMap);
      
      // 更新本地存储
      try {
        const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
        savedColors[trimmedValue] = colorToSave;
        localStorage.setItem('tagColors', JSON.stringify(savedColors));
        console.log('🎨 TagPicker保存颜色到localStorage:', { tagName: trimmedValue, color: colorToSave });
      } catch (error) {
        console.error('更新本地存储失败:', error);
      }
      
      // 触发UI更新事件
      window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
        detail: { tagName: trimmedValue, color: colorToSave }
      }));
      
      // 触发标签列表更新事件
      window.dispatchEvent(new CustomEvent('tagsUpdated', {
        detail: { action: 'create', tagName: trimmedValue, tags: updatedTags }
      }));
      

      
      // 不再自动将新创建的标签添加到收藏列表中
      
      // 自动将新创建的标签添加到已选列表中
      if (!selectedTags.includes(trimmedValue)) {
        const newSelectedTags = [...selectedTags, trimmedValue];
        onTagsChange(newSelectedTags);
      }
      
      // 根据当前模式清空相应的输入框并关闭下拉框
      if (isSearchMode) {
        setSearchTerm('');
        setIsSearchMode(false);
        setShowSearchDropdown(false);
      } else {
        setInputValue('');
      }
      
      // 使用localConfigManager创建标签（已在前面完成，这里不需要额外操作）
      
      // 使用localConfigManager更新标签颜色（已在前面完成，这里不需要额外操作）
      
    } catch (error) {
      console.error('创建标签失败:', error);
      // 如果创建失败，重新加载数据
      loadTags();
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (isSearchMode) {
        // 搜索模式下的逻辑
        if (filteredTags.length === 0) {
          // 没有匹配的标签，创建新标签
          // 将搜索词作为新标签名称
          setInputValue(searchTerm);
          setIsSearchMode(false);
          setSearchTerm('');
          setShowSearchDropdown(false);
          // 延迟执行创建，确保状态更新完成
          setTimeout(() => {
            createTag();
          }, 10);
        } else if (filteredTags.length === 1) {
          // 只有一个匹配的标签，自动选择
          const singleTag = filteredTags[0];
          const tagName = typeof singleTag === 'string' ? singleTag : (singleTag && singleTag.name);
          
          // 自动将匹配的标签添加到已选列表中
          if (!selectedTags.includes(tagName)) {
            const newSelectedTags = [...selectedTags, tagName];
            onTagsChange(newSelectedTags);
            
            // 触发标签选择事件，确保状态同步
            window.dispatchEvent(new CustomEvent('tagsUpdated', {
              detail: { action: 'select', tagName: tagName, tags: newSelectedTags }
            }));
          }
          
          // 清空搜索并退出搜索模式
          setSearchTerm('');
          setIsSearchMode(false);
          setShowSearchDropdown(false);
        }
        // 如果有多个匹配标签，不自动选择，让用户手动选择
      } else {
        // 非搜索模式下直接创建新标签
        createTag();
      }
    }
    
    // 在搜索模式下按Escape键退出搜索
    if (e.key === 'Escape' && isSearchMode) {
      setIsSearchMode(false);
      setSearchTerm('');
      setShowSearchDropdown(false);
    }
  };

  // 删除功能相关函数
  const openDeleteModal = (tag) => {
    setTagToDelete(tag);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTagToDelete(null);
  };

  const confirmDeleteTag = async () => {
    if (!tagToDelete) return;
    
    const tagName = typeof tagToDelete === 'string' ? tagToDelete : (tagToDelete && tagToDelete.name);
    if (!tagName) return;
    
    try {
      // 立即更新本地状态，提供即时反馈
      const updatedTags = availableTags.filter(tag => {
        const currentTagName = typeof tag === 'string' ? tag : (tag && tag.name);
        return currentTagName !== tagName;
      });
      setAvailableTags(updatedTags);
      

      
      // 如果删除的标签在收藏列表中，也要移除
      if (favoriteTags.includes(tagName)) {
        removeFromFavorites(tagName);
      }
      
      // 如果删除的标签在已选列表中，也要移除
      if (selectedTags.includes(tagName)) {
        const newSelectedTags = selectedTags.filter(tag => tag !== tagName);
        onTagsChange(newSelectedTags);
      }
      
      // 触发标签列表更新事件
      window.dispatchEvent(new CustomEvent('tagsUpdated', {
        detail: { action: 'delete', tagName: tagName, tags: updatedTags }
      }));
      
      // 关闭模态框
      closeDeleteModal();
      
      // 使用localConfigManager删除标签
      await localConfigManager.deleteTag(tagName);
      console.log('🎯 TagPicker通过localConfigManager删除标签:', tagName);
      
    } catch (error) {
      console.error('删除标签失败:', error);
      // 如果删除失败，重新加载数据
      loadTags();
    }
  };

  const deleteTag = (tagToDelete) => {
    if (!tagToDelete) return;
    openDeleteModal(tagToDelete);
  };

  // 参考天气背景实现，直接使用CSS变量
  const getSmartColors = () => {
    return {
      backgroundColor: 'var(--theme-elevated)',
      textColor: 'var(--theme-text)',
      borderColor: 'var(--theme-border)'
    };
  };



  // 获取标签颜色
  const getTagColorFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 返回基础样式，不包含文字颜色，让内联样式控制
    // 背景色和文字颜色都通过getTagStyleFromState函数的内联样式设置
    return 'border border-gray-300 dark:border-gray-600';
  };

  // 获取标签样式
  const getTagStyleFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 如果没有颜色映射，使用默认颜色
    if (!colorValue) {
      return {
        backgroundColor: '#3B82F6', // 默认天蓝色
        color: '#ffffff'
      };
    }
    
    // 如果是十六进制颜色值，直接使用
    if (colorValue.startsWith('#')) {
      return {
        backgroundColor: colorValue,
        color: '#ffffff'
      };
    }
    
    // 如果是预设颜色名称，查找对应的十六进制值
    const colorObj = commonColors.find(c => c.value === colorValue);
    if (colorObj) {
      return {
        backgroundColor: colorObj.hexColor,
        color: '#ffffff'
      };
    }
    
    // 如果已经是十六进制值但没有#前缀，添加前缀
    if (/^[0-9A-Fa-f]{6}$/.test(colorValue)) {
      return {
        backgroundColor: `#${colorValue}`,
        color: '#ffffff'
      };
    }
    
    // 兜底：使用默认颜色
    return {
      backgroundColor: '#3B82F6',
      color: '#ffffff'
    };
  };





  // 搜索相关函数
  const handleSearchChange = (e) => {
    e.stopPropagation();
    const value = e.target.value;
    setSearchTerm(value);
    // 输入时自动进入搜索模式并显示下拉列表
    if (value.trim().length > 0) {
      setIsSearchMode(true);
      setShowSearchDropdown(true);
    } else {
      // 搜索词为空时保持搜索模式，显示空状态提示
      setIsSearchMode(true);
      setShowSearchDropdown(true);
    }
  };

  // 智能搜索过滤函数 - 优化搜索关联性
  const filteredTags = availableTags.filter(tag => {
    if (!isSearchMode) return false;
    
    // 确保在搜索模式下总是显示一些内容
    if (!searchTerm.trim()) {
      // 如果没有可用标签，显示默认标签
      if (availableTags.length === 0) {
        return ['工作', '学习', '生活', '想法', '计划', '重要', '待办'].includes(tag);
      }
      return true; // 搜索词为空时显示所有标签
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const tagName = typeof tag === 'string' ? tag : (tag && tag.name);
    
    if (!tagName) return false;
    
    const tagNameLower = tagName.toLowerCase();
    
    // 1. 完全匹配优先级最高
    if (tagNameLower === searchLower) return true;
    
    // 2. 开头匹配优先级较高
    if (tagNameLower.startsWith(searchLower)) return true;
    
    // 3. 包含匹配
    if (tagNameLower.includes(searchLower)) return true;
    
    // 4. 拼音匹配（简单的拼音首字母匹配）
    // 这里可以扩展更复杂的拼音匹配逻辑
    const pinyinMap = {
      'g': ['工作', '管理', '功能', '工具'],
      'x': ['学习', '生活', '想法', '项目', '系统'],
      's': ['生活', '思想', '设计', '实践'],
      'j': ['计划', '技术', '经验', '记录'],
      'd': ['重要', '待办', '调试', '开发'],
      'y': ['研究', '优化', '应用', '测试']
    };
    
    // 检查搜索词是否是拼音首字母
    if (searchLower.length === 1 && pinyinMap[searchLower]) {
      return pinyinMap[searchLower].some(keyword => tagNameLower.includes(keyword));
    }
    
    // 5. 模糊匹配 - 分词匹配
    const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);
    if (searchWords.length > 1) {
      return searchWords.every(word => tagNameLower.includes(word));
    }
    
    return false;
  });
  
  // 按匹配度排序
const sortedFilteredTags = [...filteredTags].sort((a, b) => {
  if (!searchTerm.trim()) {
    // 搜索词为空时按字母顺序排序
    const nameA = (typeof a === 'string' ? a : (a && a.name)) || '';
    const nameB = (typeof b === 'string' ? b : (b && b.name)) || '';
    return nameA.localeCompare(nameB);
  }
  
  const searchLower = searchTerm.toLowerCase().trim();
  const nameA = (typeof a === 'string' ? a : (a && a.name)) || '';
  const nameB = (typeof b === 'string' ? b : (b && b.name)) || '';
  const nameALower = nameA.toLowerCase();
  const nameBLower = nameB.toLowerCase();
  
  // 完全匹配优先级最高
  if (nameALower === searchLower && nameBLower !== searchLower) return -1;
  if (nameBLower === searchLower && nameALower !== searchLower) return 1;
  
  // 开头匹配优先级较高
  if (nameALower.startsWith(searchLower) && !nameBLower.startsWith(searchLower)) return -1;
  if (nameBLower.startsWith(searchLower) && !nameALower.startsWith(searchLower)) return 1;
  
  // 长度优先 - 较短的标签优先
  if (nameALower.includes(searchLower) && nameBLower.includes(searchLower)) {
    return nameA.length - nameB.length;
  }
  
  return 0;
});

  // 切换搜索模式
  const toggleSearchMode = () => {
    const newSearchMode = !isSearchMode;
    setIsSearchMode(newSearchMode);
    setShowSearchDropdown(newSearchMode);
    
    if (newSearchMode) {
      // 进入搜索模式时清空新标签输入框并聚焦
      setInputValue('');
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="搜索标签..."]');
        if (input) {
          input.focus();
        }
      }, 100);
    } else {
      // 退出搜索模式时清空搜索词
      setSearchTerm('');
    }
  };

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearchDropdown && isSearchMode) {
        // 检查点击是否在下拉列表或输入框内
        const dropdown = document.querySelector('.absolute.top-full.left-0.right-0.mt-1');
        const input = document.querySelector('input[placeholder="搜索标签..."]');
        
        if (dropdown && !dropdown.contains(event.target) && 
            input && !input.contains(event.target) &&
            !event.target.closest('button')) {
          setShowSearchDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchDropdown, isSearchMode]);

  if (!isOpen) return null;

  const colors = getSmartColors();

  return (
    <div 
      className="mt-3 p-3 rounded-lg tag-picker"
      style={{
        backgroundColor: 'transparent',
        color: colors.textColor,
        borderRadius: `${cardSettings?.borderRadius || 8}px`
      }}
    >
      {isLoading ? (
        <div className="text-sm py-4 text-center" style={{ color: colors.textColor, opacity: 0.7 }}>
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" style={{ color: colors.textColor }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </div>
        </div>
      ) : (
        <>
          {/* 收藏区域 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium" style={{ color: colors.textColor }}>
                收藏
              </div>
              <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                {favoriteTags.length} 项
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scrollbar-hide smooth-scroll-container scrollbar-smooth">
              {/* 显示收藏标签 - 过滤掉不存在的标签 */}
              {favoriteTags.length > 0 ? (
                favoriteTags.filter(tag => availableTags.includes(tag)).map(tag => (
                  <div
                    key={tag}
                    className="group relative flex-shrink-0 flex items-center"
                  >
                    <div
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${getTagColorFromState(tag)}`}
                      style={getTagStyleFromState(tag)}
                      onClick={(e) => {
                        console.log('🎯 收藏标签点击事件被触发:', { tag });
                        e.stopPropagation();
                        handleFavoriteTagClick(tag);
                      }}
                      title="点击添加到已选标签"
                    >
                      <span className="truncate max-w-tag-truncate">{tag}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          // 从收藏中移除，并同步到TagManager
                          removeFromFavorites(tag);
                          
                          // 同步更新TagManager中的标签收藏状态
                          try {
                            const allTags = localConfigManager.getTags();
                            const tagToUpdate = allTags.find(t => t.name === tag);
                            if (tagToUpdate) {
                              localConfigManager.updateTag(tagToUpdate.id, { isFavorite: false });
                              console.log('已同步更新TagManager中的标签收藏状态:', tag);
                            }
                          } catch (error) {
                            console.error('同步更新TagManager标签收藏状态失败:', error);
                          }
                        }}
                        className="ml-2 flex-shrink-0 cursor-pointer text-yellow-500"
                        title="从收藏中移除"
                      >
                        <FiStar size={12} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm py-4 text-center w-full" style={{ color: 'var(--theme-text-secondary)' }}>
                  暂无收藏项，从下方搜索添加
                </div>
              )}
            </div>
          </div>
          

          
          {/* 新标签创建/搜索区域 */}
          <div className="pt-3" style={{ }}>
            <div className="flex items-center space-x-2 mb-2">
              {/* 输入框容器，包含搜索/颜色选择按钮 */}
              <div className="flex-1 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={isSearchMode ? searchTerm : inputValue}
                  onChange={(e) => {
                    e.stopPropagation();
                    const value = e.target.value;
                    
                    // 自动搜索逻辑：输入时自动进入搜索模式
                    if (value.trim().length > 0) {
                      // 如果不在搜索模式，先切换到搜索模式
                      if (!isSearchMode) {
                          setIsSearchMode(true);
                          setSearchTerm('');
                          setShowSearchDropdown(true);
                      }
                      // 设置搜索词
                      setSearchTerm(value);
                      setShowSearchDropdown(true);
                    } else {
                      // 输入为空时的处理
                      if (isSearchMode) {
                        setSearchTerm('');
                        setShowSearchDropdown(true);
                      } else {
                        setInputValue('');
                      }
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={isSearchMode ? "搜索标签..." : "新标签名称"}
                  className={`w-full pl-3 py-2 border rounded-lg text-sm focus:ring-0 ${isSearchMode ? 'pr-24' : 'pr-12'}`}
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: colors.borderColor,
                    color: colors.textColor
                  }}
                />
                {/* 清除按钮（仅在搜索模式显示） */}
                {isSearchMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      setShowSearchDropdown(false);
                      setIsSearchMode(false);
                      setInputValue('');
                    }}
                    className="absolute right-9 top-1 bottom-1 px-2 py-1 text-xs rounded text-red-500"
                    title="退出"
                  >
                    退出
                  </button>
                )}
                
                {/* 搜索按钮（仅在非搜索模式显示） */}
                {!isSearchMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSearchMode(true);
                      setSearchTerm('');
                      setShowSearchDropdown(true);
                      setInputValue('');
                      setTimeout(() => {
                        const input = document.querySelector('input[placeholder="搜索标签..."]');
                        if (input) {
                          input.focus();
                        }
                      }, 100);
                    }}
                    className="absolute right-9 top-1 bottom-1 px-2 py-1 text-xs rounded"
                    style={{
                      color: colors.textColor,
                      borderColor: colors.borderColor
                    }}
                  >
                    搜索
                  </button>
                )}
                {/* 颜色选择按钮 */}
                <div className="absolute right-1 top-1 bottom-1">
                  <button
                    ref={colorButtonRef}
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-8 h-8 rounded-full border"
                    style={{ 
                      backgroundColor: selectedColor,
                      borderColor: colors.borderColor
                    }}
                    title="选择颜色"
                  />
                  
                  {/* 颜色选择器弹窗 */}
                  <PortalPopup
                    isOpen={showColorPicker}
                    onClose={() => setShowColorPicker(false)}
                    triggerRef={colorButtonRef}
                    className="w-72"
                    position="bottom-right"
                    disableOutsideClick={true}
                  >
                    <div 
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: 'var(--theme-elevated)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FiEdit3 size={16} style={{ color: 'var(--theme-primary)' }} />
                          <span className="font-medium text-sm" style={{ color: colors.textColor }}>选择颜色</span>
                        </div>
                        <button
                          onClick={() => setShowColorPicker(false)}
                          style={{ color: colors.textColor }}
                          className=""
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* 预设颜色网格 */}
                      <div className="grid grid-cols-6 gap-2 mb-3">
                        {commonColors.map((color) => (
                          <button
                            key={color.hexColor}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setSelectedColor(color.hexColor);
                              setShowColorPicker(false);
                              
                              // 如果当前有选中的标签，更新其颜色
                              if (selectedTags.length > 0) {
                                const tagName = selectedTags[selectedTags.length - 1]; // 使用最后一个选中的标签
                                try {
                                  // 更新本地状态
                                  const newTagColorMap = {
                                    ...tagColorMap,
                                    [tagName]: color.hexColor
                                  };
                                  setTagColorMap(newTagColorMap);
                                  
                                  // 更新本地存储
                                  const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
                                  savedColors[tagName] = color.hexColor;
                                  localStorage.setItem('tagColors', JSON.stringify(savedColors));
                                  
                                  // 通过localConfigManager保存颜色
                                  await localConfigManager.setTagColor(tagName, color.hexColor);
                                  
                                  // 触发UI更新事件
                                  window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
                                    detail: { tagName, color: color.hexColor }
                                  }));
                                  
                                  console.log('🎨 TagPicker更新标签颜色:', { tagName, color: color.hexColor });
                                } catch (error) {
                                  console.error('更新标签颜色失败:', error);
                                }
                              }
                              // 注意：这个颜色选择只影响TagPicker中已存在的标签
                              // 不会影响TagSelector中新创建的标签颜色
                            }}
                            className="w-8 h-8 rounded-full border flex items-center justify-center"
                            style={{ 
                              backgroundColor: color.hexColor,
                              borderColor: colors.borderColor
                            }}
                            title={color.name}
                          >
                            {selectedColor === color.hexColor && (
                              <FiCheck size={14} color="white" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} />
                            )}
                          </button>
                        ))}
                      </div>
                      
                      {/* 自定义颜色区域 */}
                      <div className="pt-3" style={{ }}>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedColor.startsWith('#') ? selectedColor : '#3B82F6'}
                            onChange={async (e) => {
                              const color = e.target.value;
                              setSelectedColor(color);
                              
                              // 如果当前有选中的标签，更新其颜色
                              if (selectedTags.length > 0 && color.startsWith('#')) {
                                const tagName = selectedTags[selectedTags.length - 1]; // 使用最后一个选中的标签
                                try {
                                  // 更新本地状态
                                  const newTagColorMap = {
                                    ...tagColorMap,
                                    [tagName]: color
                                  };
                                  setTagColorMap(newTagColorMap);
                                  
                                  // 更新本地存储
                                  const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
                                  savedColors[tagName] = color;
                                  localStorage.setItem('tagColors', JSON.stringify(savedColors));
                                  
                                  // 通过localConfigManager保存颜色
                                  await localConfigManager.setTagColor(tagName, color);
                                  
                                  // 触发UI更新事件
                                  window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
                                    detail: { tagName, color }
                                  }));
                                  
                                  console.log('🎨 TagPicker更新标签颜色(自定义):', { tagName, color });
                                } catch (error) {
                                  console.error('更新标签颜色失败:', error);
                                }
                              }
                              // 注意：这个颜色选择只影响TagPicker中已存在的标签
                              // 不会影响TagSelector中新创建的标签颜色
                            }}
                            className="w-8 h-8 rounded cursor-pointer"
                            style={{ borderColor: colors.borderColor }}
                          />
                          <input
                            type="text"
                            value={selectedColor}
                            onChange={async (e) => {
                              const value = e.target.value;
                              // 验证是否为有效的十六进制颜色值
                              const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                              if (hexColorRegex.test(value) || value === '') {
                                setSelectedColor(value);
                                
                                // 如果当前有选中的标签且颜色值有效，更新其颜色
                                if (selectedTags.length > 0 && hexColorRegex.test(value)) {
                                  const tagName = selectedTags[selectedTags.length - 1]; // 使用最后一个选中的标签
                                  try {
                                    // 更新本地状态
                                    const newTagColorMap = {
                                      ...tagColorMap,
                                      [tagName]: value
                                    };
                                    setTagColorMap(newTagColorMap);
                                    
                                    // 更新本地存储
                                    const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
                                    savedColors[tagName] = value;
                                    localStorage.setItem('tagColors', JSON.stringify(savedColors));
                                    
                                    // 通过localConfigManager保存颜色
                                    await localConfigManager.setTagColor(tagName, value);
                                    
                                    // 触发UI更新事件
                                    window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
                                      detail: { tagName, color: value }
                                    }));
                                    
                                    console.log('🎨 TagPicker更新标签颜色(文本输入):', { tagName, color: value });
                                  } catch (error) {
                                    console.error('更新标签颜色失败:', error);
                                  }
                                }
                              }
                              // 注意：这个颜色选择只影响TagPicker中已存在的标签
                              // 不会影响TagSelector中新创建的标签颜色
                            }}
                            placeholder="#000000"
                            className="flex-1 px-2 py-1 text-xs rounded"
                            style={{
                              backgroundColor: 'transparent',
                              borderColor: colors.borderColor,
                              color: colors.textColor
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </PortalPopup>
                </div>
                
                {/* 搜索结果三级菜单列表 */}
                <PortalPopup
                  isOpen={showSearchDropdown && isSearchMode}
                  onClose={(e) => {
                    e && e.stopPropagation && e.stopPropagation();
                    setShowSearchDropdown(false);
                  }}
                  triggerRef={searchInputRef}
                  className="w-80"
                  position="bottom"
                  disableOutsideClick={true}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-lg max-h-96 overflow-y-auto"
                       style={{
                         backgroundColor: 'var(--theme-elevated)'
                       }}>
                    {/* 第一级：搜索结果概览 */}
                    <div className="p-3" style={{}}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium" style={{ color: colors.textColor }}>
                          搜索结果
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                            找到 {sortedFilteredTags.length} 个标签
                          </div>
                          <button
                            onClick={() => {
                              setIsSearchMode(false);
                              setSearchTerm('');
                              setShowSearchDropdown(false);
                            }}
                            className="text-xs px-2 py-1 rounded"
                            style={{ color: '#EF4444' }}
                          >
                            退出
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {sortedFilteredTags.length > 0 ? (
                      <>
                        {/* 第二级：标签分类 */}
                        <div className="p-2" style={{}}>
                          <div className="text-xs font-medium mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
                            标签分类
                          </div>
                          <div className="grid grid-cols-2 gap-2">

                            
                            {/* 可选择的标签 */}
                            <div 
                              className="p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              style={{ backgroundColor: 'var(--theme-elevated)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const availableSection = document.getElementById('available-tags-section');
                                if (availableSection) {
                                  availableSection.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                            >
                              <div className="text-xs font-medium" style={{ color: colors.textColor }}>
                                可选择 ({sortedFilteredTags.length})
                              </div>
                              <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                                点击查看
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 第三级：具体标签列表 */}
                        <div className="p-2">
                          
                          {/* 可选择的标签部分 */}
                          {sortedFilteredTags.filter(tag => !selectedTags.includes(tag)).length > 0 && (
                            <div id="available-tags-section">
                              <div className="text-xs font-medium mb-2 px-2" style={{ color: 'var(--theme-text-secondary)' }}>
                                可选择的标签
                              </div>
                              {sortedFilteredTags
                                .filter(tag => !selectedTags.includes(tag))
                                .map(tag => (
                                  <div
                                    key={`available-${tag}`}
                                    className="px-3 py-2 mb-1 rounded cursor-pointer flex items-center justify-between"
                                    style={{
                                      backgroundColor: 'var(--theme-elevated)'
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-4 h-4 rounded-full"
                                        style={getTagStyleFromState(tag)}
                                      />
                                      <span className="text-sm" style={{ color: colors.textColor }}>{tag}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!selectedTags.includes(tag)) {
                                            const newSelectedTags = [...selectedTags, tag];
                                            onTagsChange(newSelectedTags);
                                            
                                            // 触发标签选择事件，确保状态同步
                                            window.dispatchEvent(new CustomEvent('tagsUpdated', {
                                              detail: { action: 'select', tagName: tag, tags: newSelectedTags }
                                            }));
                                          }
                                        }}
                                        className="text-xs px-2 py-1 rounded"
                                        style={{
                                          backgroundColor: 'var(--theme-primary)',
                                          color: 'white'
                                        }}
                                      >
                                        点击添加
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFavorite(tag);
                                        }}
                                        className="text-xs p-1 rounded"
                                        style={{
                                          color: favoriteTags.includes(tag) ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                                          border: favoriteTags.includes(tag) ? '1px solid var(--theme-primary)' : '1px solid var(--theme-border)'
                                        }}
                                        title={favoriteTags.includes(tag) ? "已收藏" : "添加到收藏"}
                                      >
                                        <FiStar size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                        <div>{searchTerm.trim() ? '没有找到匹配的标签' : '请输入搜索关键词'}</div>
                        {searchTerm.trim() && (
                          <div className="text-xs mt-1">按回车键创建标签 "{searchTerm}"</div>
                        )}
                      </div>
                    )}
                  </div>
                </PortalPopup>
              </div>
              
              {/* 创建按钮 */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent && e.nativeEvent.stopImmediatePropagation && e.nativeEvent.stopImmediatePropagation();
                  createTag();
                  // 创建后关闭下拉框
                  setShowSearchDropdown(false);
                  setIsSearchMode(false);
                  setSearchTerm('');
                  return false;
                }}
                disabled={!(isSearchMode ? searchTerm.trim() : inputValue.trim())}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FiPlus size={16} />
                创建
              </button>
            </div>
          </div>
        </>
)}
      
      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 max-w-sm w-full mx-4"
               style={{
                 backgroundColor: 'transparent'
               }}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <FiX className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                删除标签
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
                确定要删除标签 "{tagToDelete && (typeof tagToDelete === 'string' ? tagToDelete : tagToDelete.name)}" 吗？
                <br />
                删除后，该标签将从所有笔记中移除。
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 rounded-md"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--theme-text)'
                }}
              >
                取消
              </button>
              <button
                onClick={confirmDeleteTag}
                className="px-4 py-2 bg-red-500 text-white rounded-md"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
   );
 };

export default TagPicker;