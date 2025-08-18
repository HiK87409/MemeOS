import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FiCheck, FiX, FiChevronDown, FiPlus, FiMoreVertical, FiEdit2, FiStar, FiFolder, FiFolderPlus, FiFolderMinus, FiTrash2, FiCornerUpLeft, FiCornerUpRight, FiList, FiBookmark } from 'react-icons/fi';
import { fetchAllTags, createTag, deleteTag as deleteTagApi, removeTagFromNotes, deleteTagAndNotes, renameTag } from '../api/notesApi';
import { getAllColors, getTagColorClass, getTagStyle, saveTagColor } from '../utils/tagColorUtils';
import { commonColors, getDefaultColor } from '../utils/commonColors';
import CompactCalendarFilter from './CompactCalendarFilter';
import PortalPopup from './PortalPopup';
import localConfigManager from '../utils/localConfigManager';
import ConfirmModal from './ConfirmModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 添加自定义CSS样式
const customStyles = `
  .sortable-ghost {
    opacity: 0.4;
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed #3B82F6;
  }
  
  .sortable-chosen {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }
  
  .sortable-drag {
    transform: rotate(2deg);
    opacity: 0.8;
  }
  
  .drag-handle {
    cursor: grab;
    transition: all 0.2s ease;
  }
  
  .drag-handle:hover {
    color: #3B82F6;
    transform: scale(1.1);
  }
  
  .drag-handle:active {
    cursor: grabbing;
    transform: scale(0.95);
  }
  
  .tag-expand-btn {
    transition: transform 0.2s ease;
  }
  
  .tag-expand-btn.expanded {
    transform: rotate(180deg);
  }
  
  .tag-item {
    transition: all 0.2s ease;
    position: relative;
  }
  
  .tag-item:hover {
    transform: translateX(2px);
  }
  
  .tag-item.dragging {
    z-index: 1000;
    pointer-events: none;
  }
  
  .tag-level-1 { padding-left: 28px !important; }
  .tag-level-2 { padding-left: 48px !important; }
  .tag-level-3 { padding-left: 68px !important; }
  .tag-level-4 { padding-left: 88px !important; }
  
  .loading-more {
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  
  .scroll-container {
    scroll-behavior: smooth;
  }
  
  .scroll-container::-webkit-scrollbar {
    width: 6px;
  }
  
  .scroll-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  
  .scroll-container::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
  }
  
  .scroll-container::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
  }
`;

// 动态添加样式到head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

const TagManager = ({ onTagsChange, onDateChange, selectedDate, noteDates, className = '' }) => {
  // 基础状态
  const [allTags, setAllTags] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [tagColorMap, setTagColorMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [colorDataLoaded, setColorDataLoaded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const scrollContainerRef = useRef(null);
  
  // 标签树相关状态
  const [expandedTags, setExpandedTags] = useState(new Set());
  const [tagHierarchy, setTagHierarchy] = useState({});
  const [visibleTags, setVisibleTags] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  // Intersection Observer相关
  const observerRef = useRef(null);
  const lastTagRef = useRef(null);
  

  
  // 标签相关状态
  const [menuVisible, setMenuVisible] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [showAddTagInput, setShowAddTagInput] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  
  // 确认模态框状态
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({
    title: '',
    message: '',
    onConfirm: null,
    type: 'default'
  });
  
  const showConfirmDialog = (title, message, onConfirm, type = 'default') => {
    setConfirmModalData({
      title,
      message,
      onConfirm,
      type
    });
    setShowConfirmModal(true);
  };
  
  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setConfirmModalData({
      title: '',
      message: '',
      onConfirm: null,
      type: 'default'
    });
  };
  
  const handleConfirmModal = () => {
    if (confirmModalData.onConfirm) {
      confirmModalData.onConfirm();
    }
    closeConfirmModal();
  };

  // 父标签选择对话框状态
  const [showParentSelectionModal, setShowParentSelectionModal] = useState(false);
  const [parentSelectionData, setParentSelectionData] = useState({
    title: '',
    message: '',
    options: [],
    onSelect: null
  });

  // 显示父标签选择对话框
  const showParentSelectionDialog = (title, message, options, onSelect) => {
    setParentSelectionData({
      title,
      message,
      options,
      onSelect
    });
    setShowParentSelectionModal(true);
  };

  // 关闭父标签选择对话框
  const closeParentSelectionModal = () => {
    setShowParentSelectionModal(false);
    setParentSelectionData({
      title: '',
      message: '',
      options: [],
      onSelect: null
    });
  };

  // 处理父标签选择
  const handleParentSelect = (selectedParent) => {
    if (parentSelectionData.onSelect) {
      parentSelectionData.onSelect(selectedParent);
    }
    closeParentSelectionModal();
  };

  // 统一的标签参数结构
  const getUnifiedTagParams = (tag) => {
    return {
      id: tag.id,
      name: tag.name,
      color: tagColorMap[tag.name] || '#3B82F6',
      isFavorite: tag.isFavorite || false,
      isPinned: tag.isPinned || false,
      // 统一的收藏操作函数
      toggleFavorite: async () => {
        try {
          const newFavoriteStatus = !tag.isFavorite;
          await localConfigManager.updateTag(tag.id, { isFavorite: newFavoriteStatus });
          
          // 使用favoriteConfig中的配置参数
          const config = window.favoriteConfigManager ? window.favoriteConfigManager.getConfig() : favoriteConfig;
          
          // 同步到TagPicker的收藏列表
          let favorites = [];
          if (config.enablePersistenceOptimization) {
            const savedFavorites = localStorage.getItem('memeos_favorite_tags');
            favorites = savedFavorites ? JSON.parse(savedFavorites) : [];
          }
          
          if (newFavoriteStatus) {
            if (!favorites.includes(tag.name)) {
              favorites.push(tag.name);
            }
          } else {
            favorites = favorites.filter(t => t !== tag.name);
          }
          
          if (config.enablePersistenceOptimization) {
            localStorage.setItem('memeos_favorite_tags', JSON.stringify(favorites));
          }
          
          // 触发收藏列表更新事件
          if (config.enableStateSynchronization) {
            window.dispatchEvent(new CustomEvent('favoriteTagsUpdated', {
              detail: { favoriteTags: favorites }
            }));
          }
          
          if (config.enableLogging) {
            console.log('TagManager: 切换收藏状态:', { tag: tag.name, newFavoriteStatus });
          }
          
          return newFavoriteStatus;
        } catch (error) {
          console.error('切换收藏状态失败:', error);
          throw error;
        }
      }
    };
  };

  // 统一配置对象：管理所有收藏状态相关的优化参数
  const favoriteConfig = {
    // 是否启用收藏状态同步优化
    // 设置为false可以禁用优化，进行完整的状态同步（用于调试）
    enableSyncOptimization: true,
    
    // 是否启用收藏状态持久化优化
    // 设置为false可以禁用localStorage持久化（用于调试）
    enablePersistenceOptimization: true,
    
    // 是否启用收藏状态日志输出
    // 设置为false可以减少控制台日志输出
    enableLogging: true,
    
    // 收藏状态同步超时时间（毫秒）
    syncTimeout: 5000
  };

  // 配置管理函数：允许运行时动态调整配置
  const updateFavoriteConfig = (newConfig) => {
    Object.assign(favoriteConfig, newConfig);
    if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收藏配置已更新:', favoriteConfig);
    }
  };

  // 获取当前配置的函数
  const getFavoriteConfig = () => {
    return { ...favoriteConfig };
  };

  // 重置配置为默认值的函数
  const resetFavoriteConfig = () => {
    favoriteConfig.enableSyncOptimization = true;
    favoriteConfig.enablePersistenceOptimization = true;
    favoriteConfig.enableLogging = true;
    favoriteConfig.syncTimeout = 5000;
    if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收藏配置已重置为默认值');
    }
  };

  // 监听收藏列表更新事件
  const handleFavoriteTagsUpdated = async (event) => {
    const { favoriteTags } = event.detail || {};
    if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收到收藏列表更新事件:', favoriteTags);
      console.log('TagManager: 收藏状态同步优化状态:', favoriteConfig.enableSyncOptimization);
    }
    
    // 使用更宽松的过滤条件，确保所有有效标签都被保留
    // 首先从localConfigManager获取最新的标签数据，确保不丢失任何标签
    const latestTags = localConfigManager.getTags();
    
    // 合并现有标签和最新标签，确保不丢失任何数据
    const mergedTags = [...allTags, ...latestTags].reduce((acc, tag) => {
      if (!tag) return acc;
      const tagId = tag.id || tag.name || tag.label || tag.title || 'unknown';
      const existingIndex = acc.findIndex(t => 
        (t.id && t.id === tag.id) || 
        (t.name && t.name === tag.name) ||
        (t.label && t.label === tag.label) ||
        (t.title && t.title === tag.title)
      );
      
      if (existingIndex >= 0) {
        // 合并标签属性，保留最新的收藏状态
        acc[existingIndex] = {
          ...acc[existingIndex],
          ...tag,
          isFavorite: favoriteTags.includes(tag.name || tag.label || tag.title || tag.id || 'unknown')
        };
      } else {
        // 添加新标签
        acc.push({
          ...tag,
          isFavorite: favoriteTags.includes(tag.name || tag.label || tag.title || tag.id || 'unknown')
        });
      }
      return acc;
    }, []);
    
    const updatedTags = mergedTags.filter(tag => {
      // 只过滤掉明显无效的标签：null、undefined、空对象
      if (!tag) return false;
      if (typeof tag !== 'object') return false;
      // 允许name为空字符串或其他falsy值，只要对象存在
      return true;
    });
    
    setAllTags(updatedTags);
    if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收藏状态已更新，保留所有标签，标签数量:', updatedTags.length);
    }
    
    // 根据配置参数决定是否持久化到localStorage
    if (favoriteConfig.enablePersistenceOptimization) {
      try {
        localStorage.setItem('memeos_favorite_tags', JSON.stringify(favoriteTags));
        if (favoriteConfig.enableLogging) {
          console.log('TagManager: 收藏状态已持久化到localStorage');
        }
      } catch (error) {
        console.error('TagManager: 持久化收藏状态失败:', error);
      }
    } else if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收藏状态持久化优化已禁用，跳过localStorage持久化');
    }
    
    // 根据配置参数决定是否同步本地配置管理器
    if (favoriteConfig.enableSyncOptimization) {
      try {
        // 遍历所有标签，更新本地配置管理器中的收藏状态
        for (const tag of updatedTags) {
          if (tag.name && tag.id) {
            await localConfigManager.updateTag(tag.id, { isFavorite: tag.isFavorite });
          }
        }
        if (favoriteConfig.enableLogging) {
          console.log('TagManager: 本地配置管理器收藏状态已同步');
        }
      } catch (error) {
        console.error('TagManager: 同步本地配置管理器收藏状态失败:', error);
      }
    } else if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收藏状态同步优化已禁用，跳过本地配置管理器同步');
    }
    
    if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收藏状态同步完成');
    }
  };

  // 监听标签更新事件
  const handleTagsUpdated = async (event) => {
    const { action, tagName, tag } = event.detail || {};
    if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收到标签更新事件:', { action, tagName, tag });
    }
    
    if (action === 'add' && tagName && tag) {
      // 添加新标签到列表
      const existingTag = allTags.find(t => t.name === tagName);
      if (!existingTag) {
        const newTag = {
          id: tag.id || Date.now(), // 临时ID，如果服务器没有返回
          name: tagName,
          isFavorite: false,
          isPinned: false,
          ...tag
        };
        
        const updatedTags = [...allTags, newTag];
        setAllTags(updatedTags);
        if (favoriteConfig.enableLogging) {
          console.log('TagManager: 新标签已添加到列表:', tagName);
        }
      }
    }
  };

  // 处理标签变化事件
  const handleTagsChanged = (tags) => {
    if (favoriteConfig.enableLogging) {
      console.log('TagManager: 收到标签变化事件:', tags);
    }
    
    // 安全地处理标签数据，使用更宽松的过滤条件确保所有有效标签都被保留
    const flattenedTags = flattenTags(tags);
    const validTags = flattenedTags.filter(tag => {
      // 只过滤掉明显无效的标签：null、undefined、空对象
      if (!tag) return false;
      if (typeof tag !== 'object') return false;
      // 允许name为空字符串或其他falsy值，只要对象存在
      return true;
    });
    
    setAllTags(validTags);
    if (favoriteConfig.enableLogging) {
      console.log('TagManager: 标签列表已更新，保留所有标签，标签数量:', validTags.length);
    }
    
    if (onTagsChange) {
      // 为了向后兼容，onTagsChange仍然接收标签名称数组
      // 对于没有name属性的标签，使用其他可能的标识符
      const tagNames = validTags.map(tag => tag.name || tag.label || tag.title || tag.id || 'unknown');
      onTagsChange(tagNames);
    }
  };
  
  // 处理标签颜色变化事件
  const handleTagColorsChanged = (tagColors) => {
    setTagColorMap(tagColors);
  };

  // 更新标签颜色
  const updateTagColor = async (tagName, color) => {
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
      
      // 触发UI更新事件
      window.dispatchEvent(new CustomEvent('tagColorsUpdated', {
        detail: { tagName, color }
      }));
      
      console.log('标签颜色已更新:', tagName, '->', color);
    } catch (error) {
      console.error('更新标签颜色失败:', error);
      window.showToast('更新标签颜色失败，请重试', 'error');
    }
  };
  


  // 搜索和颜色相关状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6'); // 默认天蓝色
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorEditingTag, setColorEditingTag] = useState(null); // 正在编辑颜色的标签
  
  // 颜色选择器ref
  const colorPickerButtonRef = useRef(null);
  const colorEditorButtonRef = useRef(null);


  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 并行加载颜色数据
        const [colors] = await Promise.all([
          getAllColors()
        ]);
        
        setAvailableColors(colors || commonColors);
        setColorDataLoaded(true);
        
        // 加载本地标签数据
        if (favoriteConfig.enableLogging) {
          console.log('加载本地标签数据...');
        }
        
        // 强制从数据库重新加载最新数据
        await localConfigManager.loadFromDatabase();
        
        // 从本地配置管理器获取同步后的标签和颜色数据
        let tags = localConfigManager.getTags();
        const tagColors = localConfigManager.getTagColors();
        
        // 从localStorage加载收藏状态并同步到标签对象
        let favoriteTags = [];
        if (favoriteConfig.enablePersistenceOptimization) {
          try {
            const savedFavorites = localStorage.getItem('memeos_favorite_tags');
            if (savedFavorites) {
              favoriteTags = JSON.parse(savedFavorites);
              if (favoriteConfig.enableLogging) {
                console.log('从localStorage加载收藏状态:', favoriteTags);
              }
              
              // 将收藏状态同步到标签对象
              tags = tags.map(tag => ({
                ...tag,
                isFavorite: favoriteTags.includes(tag.name || tag.label || tag.title || tag.id || 'unknown')
              }));
              
              if (favoriteConfig.enableLogging) {
                console.log('收藏状态已同步到标签对象，标签数量:', tags.length);
              }
            }
          } catch (error) {
            console.error('加载收藏状态失败:', error);
          }
        } else if (favoriteConfig.enableLogging) {
          console.log('TagManager: 收藏状态持久化优化已禁用，跳过localStorage加载');
        }
        
        // 如果没有从localStorage加载收藏状态，也需要将收藏状态同步到标签对象
        if (favoriteTags.length === 0) {
          const tagsWithFavorites = tags.map(tag => ({
            ...tag,
            isFavorite: favoriteTags.includes(tag.name || tag.label || tag.title || tag.id || 'unknown')
          }));
          setAllTags(tagsWithFavorites); // 设置带有收藏状态的完整标签对象数组
          if (favoriteConfig.enableLogging) {
            console.log('标签数据加载完成（无收藏状态）:', tagsWithFavorites);
          }
        } else {
          setAllTags(tags); // 使用已经同步了收藏状态的tags数组
          if (favoriteConfig.enableLogging) {
            console.log('标签数据加载完成（有收藏状态）:', tags);
          }
        }
        
        // 设置事件监听器
        localConfigManager.addListener('tagsChanged', handleTagsChanged);
        localConfigManager.addListener('tagColorsChanged', handleTagColorsChanged);

        
      } catch (error) {
        console.error('加载数据失败:', error);
        setAvailableColors(commonColors);
        setColorDataLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();

  // 添加全局事件监听器
    window.addEventListener('favoriteTagsUpdated', handleFavoriteTagsUpdated);
    window.addEventListener('tagsUpdated', handleTagsUpdated);
    
    // 添加配置管理事件监听器
    const handleUpdateConfig = (event) => {
      updateFavoriteConfig(event.detail);
    };
    
    const handleGetConfig = () => {
      window.dispatchEvent(new CustomEvent('getFavoriteConfigResponse', { detail: getFavoriteConfig() }));
    };
    
    const handleResetConfig = () => {
      resetFavoriteConfig();
    };
    
    window.addEventListener('updateFavoriteConfig', handleUpdateConfig);
    window.addEventListener('getFavoriteConfig', handleGetConfig);
    window.addEventListener('resetFavoriteConfig', handleResetConfig);
    
    // 清理函数
    return () => {
      localConfigManager.removeListener('tagsChanged', handleTagsChanged);
      localConfigManager.removeListener('tagColorsChanged', handleTagColorsChanged);
      window.removeEventListener('favoriteTagsUpdated', handleFavoriteTagsUpdated);
      window.removeEventListener('tagsUpdated', handleTagsUpdated);
      window.removeEventListener('updateFavoriteConfig', handleUpdateConfig);
      window.removeEventListener('getFavoriteConfig', handleGetConfig);
      window.removeEventListener('resetFavoriteConfig', handleResetConfig);
    };
  }, []);

  // 扁平化标签树（用于兼容现有的allTags状态）
  const flattenTags = (tags) => {
    // 安全地处理各种输入格式
    if (!tags) {
      if (favoriteConfig.enableLogging) {
        console.warn('flattenTags: 接收到空的标签数据');
      }
      return [];
    }
    
    // 如果是数组，确保每个元素都是有效的标签对象
    if (Array.isArray(tags)) {
      return tags
        .filter(tag => tag && typeof tag === 'object') // 过滤掉非对象元素
        .map(tag => {
          // 为标签生成标识符，支持多种属性
          const tagName = tag.name || tag.label || tag.title || tag.id || 'unknown';
          return {
            id: tag.id || `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: tagName,
            color: tag.color || '#3B82F6',
            isFavorite: tag.isFavorite || false,
            isPinned: tag.isPinned || false,
            ...tag // 保留其他属性
          };
        })
        .filter(tag => tag !== null); // 过滤掉无效的标签
    }
    
    // 如果是单个标签对象，转换为数组
    if (typeof tags === 'object' && tags.name) {
      return [{
        id: tags.id || `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: tags.name,
        color: tags.color || '#3B82F6',
        isFavorite: tags.isFavorite || false,
        isPinned: tags.isPinned || false,
        ...tags
      }];
    }
    
    if (favoriteConfig.enableLogging) {
      console.warn('flattenTags: 无法识别的标签数据格式:', tags);
    }
    return [];
  };
  

  

  

  // 打开删除确认模态框
  const openDeleteModal = (tag) => {
    setTagToDelete(tag);
    setShowDeleteModal(true);
  };

  // 关闭删除确认模态框
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTagToDelete(null);
  };

  // 确认删除标签
  const confirmDeleteTag = async () => {
    if (!tagToDelete) return;
    
    let tagName, tagId;
    
    if (typeof tagToDelete === 'string') {
      tagName = tagToDelete;
      tagId = null;
    } else if (tagToDelete && tagToDelete.id) {
      // 优先使用name属性，如果没有则尝试其他可能的属性名
      tagName = tagToDelete.name || tagToDelete.tagName || tagToDelete.label || tagToDelete.title;
      tagId = tagToDelete.id;
    } else {
      if (favoriteConfig.enableLogging) {
        console.error('删除标签失败：无效的标签对象', tagToDelete);
      }
      closeDeleteModal();
      return;
    }
    
    // 如果没有tagName但有tagId，尝试通过tagId查找tagName
    if (!tagName && tagId) {
      const allTags = localConfigManager.getTags();
      const foundTag = allTags.find(tag => tag.id === tagId);
      if (foundTag) {
        tagName = foundTag.name;
      }
    }
    
    // 如果没有tagId但有tagName，尝试通过tagName查找tagId
    if (!tagId && tagName) {
      const allTags = localConfigManager.getTags();
      const foundTag = allTags.find(tag => tag.name === tagName);
      if (foundTag) {
        tagId = foundTag.id;
      }
    }
    
    if (!tagId && !tagName) {
      console.error('删除标签失败：缺少标签名称或ID', { tagName, tagId, tagToDelete });
      closeDeleteModal();
      return;
    }
    
    try {
      console.log('开始删除标签:', { tagName, tagId });
      
      // 使用本地配置管理器删除标签
      const success = await localConfigManager.deleteTag(tagId);
      
      if (success) {
        console.log('标签删除成功:', tagName);
        
        // 从收藏列表中移除已删除的标签
        try {
          const savedFavorites = localStorage.getItem('memeos_favorite_tags');
          if (savedFavorites) {
            let favorites = JSON.parse(savedFavorites);
            if (favorites.includes(tagName)) {
              favorites = favorites.filter(t => t !== tagName);
              localStorage.setItem('memeos_favorite_tags', JSON.stringify(favorites));
              
              // 触发收藏列表更新事件
              window.dispatchEvent(new CustomEvent('favoriteTagsUpdated', {
                detail: { favoriteTags: favorites }
              }));
              
              console.log('已从收藏列表中移除标签:', tagName);
            }
          }
        } catch (favError) {
          console.warn('从收藏列表移除标签失败:', favError);
        }
        
        // 强制重新从数据库加载最新数据
        await localConfigManager.loadFromDatabase();
        
        // 关闭模态框
        closeDeleteModal();
        
        console.log('标签删除完成，数据已刷新');
      } else {
        console.error('本地标签删除失败:', tagName);
      }
      
    } catch (error) {
      console.error('删除标签过程中发生错误:', error);
      closeDeleteModal();
    }
  };

  // 删除标签（替换为模态框）
  const deleteTag = (tagToDelete) => {
    if (!tagToDelete) return;
    openDeleteModal(tagToDelete);
  };
  

  

  
  const toggleMenu = (e, tagId) => {
    e.stopPropagation();
    setMenuVisible(menuVisible === tagId ? null : tagId);
  };
  
  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuVisible !== null) {
        // 检查点击是否在菜单区域外
        const menuElement = document.querySelector(`[data-menu-id="${menuVisible}"]`);
        if (menuElement && !menuElement.contains(event.target)) {
          setMenuVisible(null);
        }
      }
    };
    
    // 添加全局点击事件监听器
    document.addEventListener('mousedown', handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuVisible]);
  
  const handleMenuAction = async (action, tag) => {
    setMenuVisible(null);
    
    switch (action) {
      case 'pin':
        // 标签置顶功能
        try {
          const newPinnedStatus = !tag.isPinned;
          await localConfigManager.updateTag(tag.id, { isPinned: newPinnedStatus });
          
          // 如果是父标签，同步置顶状态到所有子标签
          if (tag.isParent) {
            const allTags = localConfigManager.getTags();
            const childTags = allTags.filter(t => t.parentId === tag.id);
            
            for (const child of childTags) {
              await localConfigManager.updateTag(child.id, { isPinned: newPinnedStatus });
              console.log('子标签置顶状态已同步:', child.name, '->', newPinnedStatus ? '已置顶' : '未置顶');
            }
          }
          
          // 强制重新加载标签数据以确保状态同步
          await localConfigManager.loadFromDatabase();
          const updatedTags = localConfigManager.getTags();
          setAllTags(updatedTags);
          
          console.log('标签置顶状态已切换:', tag.name, '->', newPinnedStatus ? '已置顶' : '未置顶');
          console.log('标签置顶状态修改完成');
        } catch (error) {
          console.error('标签置顶状态修改失败:', error);
          window.showToast('标签置顶状态修改失败，请重试', 'error');
        }
        break;
        
      case 'favorite':
        // 收藏标签功能 - 使用统一参数结构
        try {
          const unifiedTag = getUnifiedTagParams(tag);
          const newFavoriteStatus = await unifiedTag.toggleFavorite();
          
          // 如果是父标签，同步收藏状态到所有子标签
          if (tag.isParent) {
            const allTags = localConfigManager.getTags();
            const childTags = allTags.filter(t => t.parentId === tag.id);
            
            for (const child of childTags) {
              const childUnifiedTag = getUnifiedTagParams(child);
              await childUnifiedTag.setFavorite(newFavoriteStatus);
              console.log('子标签收藏状态已同步:', child.name, '->', newFavoriteStatus ? '已收藏' : '已取消收藏');
            }
          }
          
          // 不再需要手动重新加载数据，因为事件处理函数会处理状态更新
          // 这样可以避免闪烁问题
          
          window.showToast(`标签已${newFavoriteStatus ? '收藏' : '取消收藏'}`, 'success');
          console.log('TagManager: 标签收藏状态修改完成，通过事件同步到其他组件');
        } catch (error) {
          console.error('标签收藏状态修改失败:', error);
          window.showToast('标签收藏状态修改失败，请重试', 'error');
        }
        break;
        

        
      case 'setColor':
        // 设置颜色功能
        setSelectedColor(tagColorMap[tag.name] || '#3B82F6');
        setColorEditingTag(tag);
        setShowColorPicker(true);
        break;
        
      case 'rename':
        // 重命名功能
        setEditingTag(tag);
        setNewTagName(tag.name);
        break;
        
      case 'remove':
        // 移除标签并删除标签功能 - 从所有笔记中移除标签并删除标签本身
        try {
          // 如果是父标签，先处理所有子标签
          if (tag.isParent) {
            const allTags = localConfigManager.getTags();
            const childTags = allTags.filter(t => t.parentId === tag.id);
            
            // 递归移除所有子标签
            for (const child of childTags) {
              const childResult = await removeTagFromNotes(child.name);
              if (childResult.success) {
                await localConfigManager.deleteTag(child.id);
                console.log('已从所有笔记中移除子标签并删除子标签本身:', child.name);
              } else {
                console.error('移除子标签失败:', child.name, childResult.message);
              }
            }
          }
          
          // 移除当前标签
          const result = await removeTagFromNotes(tag.name);
          if (result.success) {
            console.log('已从所有笔记中移除标签并删除标签本身:', tag.name);
            window.showToast(result.message || '已从所有笔记中移除标签并删除标签本身', 'success');
            
            // 从本地配置管理器中删除标签
            try {
              await localConfigManager.deleteTag(tag.id);
              console.log('本地配置管理器中的标签已删除:', tag.name);
            } catch (localError) {
              console.warn('从本地配置管理器删除标签失败:', localError);
            }
          } else {
            console.error('移除标签失败:', result.message);
            window.showToast('移除标签失败，请重试', 'error');
            return;
          }
          
          // 触发笔记列表刷新
          try {
            if (typeof window.refreshNotes === 'function') {
              window.refreshNotes();
            }
          } catch (error) {
            console.warn('refreshNotes函数调用失败:', error);
          }
          
          // 触发标签刷新
          try {
            if (typeof window.refreshTags === 'function') {
              window.refreshTags();
            }
          } catch (error) {
            console.warn('refreshTags函数调用失败:', error);
          }
        } catch (error) {
          console.error('移除标签失败:', error);
          window.showToast('移除标签失败，请重试', 'error');
        }
        break;
        
      case 'dissolveParent':
        // 解散父标签功能
        try {
          console.log('开始解散父标签:', tag.name);
          
          // 获取所有子标签
          const allTags = localConfigManager.getTags();
          const childTags = allTags.filter(t => t.parentId === tag.id);
          
          // 更新所有子标签的parentId为null
          for (const child of childTags) {
            await localConfigManager.updateTag(child.id, { parentId: null });
            console.log('子标签已移出父标签:', child.name);
          }
          
          // 更新父标签的isParent状态为false
          await localConfigManager.updateTag(tag.id, { isParent: false });
          
          // 直接获取更新后的标签数据，不重新从数据库加载
          const updatedTags = localConfigManager.getTags();
          setAllTags(updatedTags);
          
          window.showToast(`父标签 "${tag.name}" 已解散，${childTags.length} 个子标签已回到主列表`, 'success');
          console.log('父标签解散完成:', tag.name);
        } catch (error) {
          console.error('解散父标签失败:', error);
          window.showToast('解散父标签失败，请重试', 'error');
        }
        break;
        
      case 'setAsParent':
        // 设置为父标签功能
        try {
          console.log('开始设置标签为父标签:', tag.name);
          
          // 更新标签的isParent状态为true
          await localConfigManager.updateTag(tag.id, { isParent: true });
          
          // 直接获取更新后的标签数据，不重新从数据库加载
          const updatedTags = localConfigManager.getTags();
          setAllTags(updatedTags);
          
          // 重新构建标签层次结构和更新可见标签列表
          const { hierarchy, rootTags } = buildTagHierarchy(updatedTags);
          setTagHierarchy(hierarchy);
          
          // 扁平化标签树用于显示
          const flattenedTags = flattenTagTree(rootTags);
          setVisibleTags(flattenedTags);
          
          window.showToast(`标签 "${tag.name}" 已设置为父标签`, 'success');
          console.log('标签已设置为父标签:', tag.name);
        } catch (error) {
          console.error('设置标签为父标签失败:', error);
          window.showToast('设置标签为父标签失败，请重试', 'error');
        }
        break;
        
      case 'moveToParent':
        // 移动到父标签功能
        try {
          console.log('开始移动标签到父标签:', tag.name);
          
          // 获取所有可以作为父标签的标签（已经是父标签的标签，且不是当前标签）
          const allTags = localConfigManager.getTags();
          const parentCandidates = allTags.filter(t => t.isParent && t.id !== tag.id);
          
          if (parentCandidates.length === 0) {
            window.showToast('没有可用的父标签', 'warning');
            return;
          }
          
          // 创建父标签选择对话框
          const parentOptions = parentCandidates.map(p => ({
            id: p.id,
            name: p.name,
            color: tagColorMap[p.name] || '#9CA3AF'
          }));
          
          // 显示选择对话框
          showParentSelectionDialog(
            '选择父标签',
            `请选择要将标签 "${tag.name}" 移动到的父标签：`,
            parentOptions,
            async (selectedParent) => {
              try {
                // 更新标签的parentId
                await localConfigManager.updateTag(tag.id, { parentId: selectedParent.id });
                
                // 更新父标签的isParent状态为true
                await localConfigManager.updateTag(selectedParent.id, { isParent: true });
                
                // 直接获取更新后的标签数据，不重新从数据库加载
                const updatedTags = localConfigManager.getTags();
                setAllTags(updatedTags);
                
                // 重新构建标签层次结构和更新可见标签列表
                const { hierarchy, rootTags } = buildTagHierarchy(updatedTags);
                setTagHierarchy(hierarchy);
                
                // 扁平化标签树用于显示
                const flattenedTags = flattenTagTree(rootTags);
                setVisibleTags(flattenedTags);
                
                window.showToast(`标签 "${tag.name}" 已移动到父标签 "${selectedParent.name}"`, 'success');
                console.log('标签移动到父标签完成:', tag.name, '->', selectedParent.name);
              } catch (error) {
                console.error('移动标签到父标签失败:', error);
                window.showToast('移动标签到父标签失败，请重试', 'error');
              }
            }
          );
        } catch (error) {
          console.error('移动标签到父标签失败:', error);
          window.showToast('移动标签到父标签失败，请重试', 'error');
        }
        break;
        
      case 'removeFromParent':
        // 从父标签中移出功能
        try {
          console.log('开始从父标签中移出标签:', tag.name);
          
          if (!tag.parentId) {
            window.showToast('该标签不在任何父标签中', 'warning');
            return;
          }
          
          // 更新标签的parentId为null
          await localConfigManager.updateTag(tag.id, { parentId: null });
          
          // 检查原父标签是否还有其他子标签
          const allTags = localConfigManager.getTags();
          const oldParentId = tag.parentId;
          const siblings = allTags.filter(t => t.parentId === oldParentId && t.id !== tag.id);
          
          if (siblings.length === 0) {
            // 不再自动取消父标签状态，让用户明确决定是否要取消父标签状态
            console.log('原父标签已失去所有子标签，但仍保持父标签状态:', oldParentId);
          }
          
          // 直接获取更新后的标签数据，不重新从数据库加载
          const updatedTags = localConfigManager.getTags();
          setAllTags(updatedTags);
          
          // 重新构建标签层次结构和更新可见标签列表
          const { hierarchy, rootTags } = buildTagHierarchy(updatedTags);
          setTagHierarchy(hierarchy);
          
          // 扁平化标签树用于显示
          const flattenedTags = flattenTagTree(rootTags);
          setVisibleTags(flattenedTags);
          
          window.showToast(`标签 "${tag.name}" 已从父标签中移出`, 'success');
          console.log('标签已从父标签中移出:', tag.name);
        } catch (error) {
          console.error('从父标签中移出标签失败:', error);
          window.showToast('从父标签中移出标签失败，请重试', 'error');
        }
        break;
        
      case 'deleteAll':
        // 删除标签和笔记功能
        const confirmMessage = `确定要删除标签 "${tag.name}" 及其所有相关笔记吗？此操作不可恢复。`;
        
        showConfirmDialog(
          '删除标签和笔记',
          confirmMessage,
          async () => {
            try {
              // 如果是父标签，先处理子标签
              if (tag.isParent) {
                const allTags = localConfigManager.getTags();
                const childTags = allTags.filter(t => t.parentId === tag.id);
                
                // 递归删除所有子标签和相关笔记
                for (const child of childTags) {
                  const childResult = await deleteTagAndNotes(child.name);
                  if (childResult.success) {
                    await localConfigManager.deleteTag(child.id);
                    console.log('已删除子标签和相关笔记:', child.name);
                  }
                }
              }
              
              // 删除标签和相关笔记
              const result = await deleteTagAndNotes(tag.name);
              if (result.success) {
                console.log('已删除标签和相关笔记:', tag.name);
                window.showToast(result.message || '标签及其相关笔记已删除', 'success');
                
                // 从本地配置管理器中删除标签
                try {
                  await localConfigManager.deleteTag(tag.id);
                  console.log('本地配置管理器中的标签已删除:', tag.name);
                } catch (localError) {
                  console.warn('从本地配置管理器删除标签失败:', localError);
                }
              } else {
                console.error('删除标签和笔记失败:', result.message);
                window.showToast('删除标签和笔记失败，请重试', 'error');
                return;
              }
              
              // 从收藏列表中移除已删除的标签
              try {
                const savedFavorites = localStorage.getItem('memeos_favorite_tags');
                if (savedFavorites) {
                  let favorites = JSON.parse(savedFavorites);
                  const updatedFavorites = favorites.filter(t => !allTagNames.includes(t));
                  
                  if (updatedFavorites.length !== favorites.length) {
                    localStorage.setItem('memeos_favorite_tags', JSON.stringify(updatedFavorites));
                    
                    // 触发收藏列表更新事件
                    window.dispatchEvent(new CustomEvent('favoriteTagsUpdated', {
                      detail: { favoriteTags: updatedFavorites }
                    }));
                    
                    console.log('已从收藏列表中移除标签:', allTagNames.filter(t => favorites.includes(t)).join(', '));
                  }
                }
              } catch (favError) {
                console.warn('从收藏列表移除标签失败:', favError);
              }
              
              // 触发笔记列表刷新
              try {
                if (typeof window.refreshNotes === 'function') {
                  window.refreshNotes();
                }
              } catch (error) {
                console.warn('refreshNotes函数调用失败:', error);
              }
              
              // 触发标签刷新
              try {
                if (typeof window.refreshTags === 'function') {
                  window.refreshTags();
                }
              } catch (error) {
                console.warn('refreshTags函数调用失败:', error);
              }
            } catch (error) {
              console.error('删除标签和笔记失败:', error);
              window.showToast('删除标签和笔记失败，请重试', 'error');
            }
          },
          'danger'
        );
        break;
    }
  };
  
  const handleRenameTag = async () => {
  if (!editingTag || !newTagName.trim()) return;
  
  const oldName = editingTag.name;
  const newName = newTagName.trim();
  
  // 检查名称是否已存在
  if (localConfigManager.getAllTagNames().includes(newName)) {
    window.showToast('标签名称已存在', 'warning');
    return;
  }
  
  try {
    console.log('开始重命名标签:', { oldName, newName });
    
    // 使用 renameTag API 函数
    const result = await renameTag(oldName, newName);
    
    if (result.success) {
      console.log('标签重命名成功:', { oldName, newName });
      window.showToast('标签重命名成功', 'success');
      
      // 如果标签有颜色，同步更新颜色映射
      if (tagColorMap[oldName]) {
        await localConfigManager.setTagColor(newName, tagColorMap[oldName]);
        // 移除旧名称的颜色映射
        delete tagColorMap[oldName];
      }
      
      console.log('标签重命名完成');
    } else {
      console.error('标签重命名失败:', result.message);
      window.showToast('重命名标签失败，请重试', 'error');
    }
    
  } catch (error) {
    console.error('重命名标签过程中发生错误:', error);
    window.showToast('重命名标签失败，请重试', 'error');
  } finally {
    setEditingTag(null);
    setNewTagName('');
  }
};
  
  const handleAddTag = async () => {
    if (newTagName.trim()) {
      const tagName = newTagName.trim();
      
      try {
        // 检查标签是否已存在
        const normalizedTagName = tagName.toLowerCase();
        const existingTag = allTags.find(tag => {
          const tagIdentifier = (tag.name || tag.label || tag.title || tag.id || '').toLowerCase();
          return tagIdentifier === normalizedTagName;
        });
        
        if (existingTag) {
          console.log('标签已存在，不允许重复创建:', tagName);
          setNewTagName('');
          setShowAddTagInput(false);
          return;
        }
        
        // 使用本地配置管理器添加标签
        const newTag = await localConfigManager.addTag({
          name: tagName,
          isPinned: false,
          children: []
        });
        
        if (newTag) {
          // 使用用户选择的颜色设置标签颜色
          await localConfigManager.setTagColor(tagName, selectedColor);
          
          // 立即更新本地颜色映射，确保UI立即显示新颜色
          setTagColorMap(prev => ({
            ...prev,
            [tagName]: selectedColor
          }));
          
          console.log('新标签添加成功:', tagName, '颜色:', selectedColor, 'ID:', newTag.id);
          
          // 触发标签更新事件，通知其他组件刷新
          window.dispatchEvent(new CustomEvent('tagsUpdated', {
            detail: {
              action: 'add',
              tag: newTag,
              tagName: tagName
            }
          }));
          
          // 手动刷新标签列表，确保立即显示新标签
          const currentTags = localConfigManager.getTags();
          
          // 获取收藏状态
          let favoriteTags = [];
          try {
            const savedFavorites = localStorage.getItem('memeos_favorite_tags');
            if (savedFavorites) {
              favoriteTags = JSON.parse(savedFavorites);
            }
          } catch (error) {
            console.error('获取收藏状态失败:', error);
          }
          
          const tagsWithFavorites = currentTags.map(tag => ({
            ...tag,
            isFavorite: favoriteTags.includes(tag.name || tag.label || tag.title || tag.id || 'unknown')
          }));
          setAllTags(tagsWithFavorites);
          
          console.log('新标签添加完成，标签列表已刷新');
        } else {
          console.error('添加标签失败');
        }
      } catch (error) {
        console.error('添加标签过程中发生错误:', error);
      }
      
      setNewTagName('');
      setSearchTerm(''); // 清空搜索词，确保显示所有标签
      setShowAddTagInput(false);
    }
  };
  
  // 过滤标签的函数
  const filterTags = (tags, searchTerm) => {
    if (!searchTerm.trim()) return tags;
    
    const term = searchTerm.toLowerCase();
    const filteredTagIds = new Set();
    
    // 首先找到所有匹配的标签
    tags.forEach(tag => {
      if (tag.name && tag.name.toLowerCase().includes(term)) {
        filteredTagIds.add(tag.id);
        
        // 如果是父标签，包含所有子标签
        if (tag.isParent) {
          const childTags = tags.filter(t => t.parentId === tag.id);
          childTags.forEach(child => filteredTagIds.add(child.id));
        }
        
        // 如果是子标签，也包含其父标签
        if (tag.parentId) {
          const parentTag = tags.find(t => t.id === tag.parentId);
          if (parentTag) {
            filteredTagIds.add(parentTag.id);
          }
        }
      }
    });
    
    // 额外检查：确保所有匹配的子标签都被正确处理
    tags.forEach(tag => {
      // 如果这个标签是子标签且名称匹配搜索词
      if (tag.parentId && tag.name && tag.name.toLowerCase().includes(term)) {
        // 确保子标签被包含
        filteredTagIds.add(tag.id);
        
        // 确保父标签被包含
        const parentTag = tags.find(t => t.id === tag.parentId);
        if (parentTag) {
          filteredTagIds.add(parentTag.id);
        }
      }
    });
    
    // 额外检查：如果搜索词匹配父标签名称，确保只显示该父标签和其直接子标签
    tags.forEach(tag => {
      // 如果这个标签是父标签且名称匹配搜索词
      if (tag.isParent && tag.name && tag.name.toLowerCase().includes(term)) {
        // 确保父标签被包含
        filteredTagIds.add(tag.id);
        
        // 只包含直接子标签
        const directChildren = tags.filter(t => t.parentId === tag.id);
        directChildren.forEach(child => filteredTagIds.add(child.id));
      }
    });
    
    // 返回所有匹配的标签及其相关标签
    return tags.filter(tag => filteredTagIds.has(tag.id));
  };
  
  const handleTagClick = (tag) => {
    // 处理选中/取消选中逻辑
    if (selectedTag && selectedTag.id === tag.id) {
      // 如果点击的是已选中的标签，则取消选中
      setSelectedTag(null);
      console.log('取消选中标签:', tag.name);
      
      // 触发取消标签筛选功能
      if (window.handleTagFilter) {
        window.handleTagFilter(null);
      }
    } else {
      // 选中新的标签
      setSelectedTag(tag);
      console.log('选中标签:', tag.name);
      
      // 触发标签筛选功能，传递完整的标签对象
      if (window.handleTagFilter) {
        window.handleTagFilter(tag);
      }
    }
  };
  
  // 监听标签颜色更新事件
useEffect(() => {
  const handleTagColorsUpdated = async (event) => {
    const { tagName, color } = event.detail;
    console.log('TagManager: 收到标签颜色更新事件:', tagName, color);
    
    // 更新本地颜色映射
    setTagColorMap(prev => ({
      ...prev,
      [tagName]: color
    }));
    
    // 同步到服务器
    try {
      await localConfigManager.setTagColor(tagName, color);
      console.log('TagManager: 标签颜色已同步到服务器:', tagName, color);
    } catch (error) {
      console.error('TagManager: 同步标签颜色到服务器失败:', error);
    }
  };
  
  window.addEventListener('tagColorsUpdated', handleTagColorsUpdated);
  
  return () => {
    window.removeEventListener('tagColorsUpdated', handleTagColorsUpdated);
  };
}, []);

// 监听筛选状态变化，同步选中状态
useEffect(() => {
  const handleTagFilterChange = (event) => {
    const { tagName } = event.detail || {};
    if (tagName) {
      // 有筛选标签，找到对应的标签对象并设置为选中状态
      const tagToSelect = allTags.find(t => t.name === tagName);
      if (tagToSelect) {
        setSelectedTag(tagToSelect);
      }
    } else {
      // 没有筛选标签，清除选中状态
      setSelectedTag(null);
    }
  };
  
  // 监听筛选清除事件
  const handleFilterCleared = () => {
    console.log('TagManager接收到filterCleared事件，清除选中状态');
    setSelectedTag(null);
  };
  
  window.addEventListener('tagFilterChanged', handleTagFilterChange);
  window.addEventListener('filterCleared', handleFilterCleared);
  
  return () => {
    window.removeEventListener('tagFilterChanged', handleTagFilterChange);
    window.removeEventListener('filterCleared', handleFilterCleared);
  };
}, [allTags]);





  // 构建标签层次结构
  const buildTagHierarchy = useCallback((tags) => {
    const hierarchy = {};
    const rootTags = [];
    
    // 首先创建所有标签的映射，保留原有的isParent属性
    tags.forEach(tag => {
      hierarchy[tag.id] = {
        ...tag,
        children: [],
        level: 0,
        isParent: tag.isParent || false // 保留原有的isParent属性
      };
    });
    
    // 构建层次关系
        tags.forEach(tag => {
          if (tag.parentId && hierarchy[tag.parentId]) {
            hierarchy[tag.parentId].children.push(hierarchy[tag.id]);
            // 保持原有的isParent状态，不自动修改
            hierarchy[tag.id].level = hierarchy[tag.parentId].level + 1;
          } else {
            rootTags.push(hierarchy[tag.id]);
          }
        });
    
    return { hierarchy, rootTags };
  }, []);
  
  // 扁平化标签树用于显示
  const flattenTagTree = useCallback((tags, level = 0, parentExpanded = true, addedIds = new Set()) => {
    let result = [];
    
    // 对标签进行排序：置顶的标签在前，然后按其他规则排序
    const sortedTags = [...tags].sort((a, b) => {
      // 置顶标签优先
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // 如果置顶状态相同，保持原有顺序
      return 0;
    });
    
    sortedTags.forEach(tag => {
      if (level === 0 || parentExpanded) {
        // 使用Set来避免重复添加标签
        if (!addedIds.has(tag.id)) {
          addedIds.add(tag.id);
          result.push({ ...tag, level });
          
          if (expandedTags.has(tag.id) && tag.children && tag.children.length > 0) {
            const childTags = flattenTagTree(tag.children, level + 1, true, addedIds);
            result.push(...childTags);
          }
        }
      }
    });
    
    return result;
  }, [expandedTags]);
  
  // 切换标签展开/折叠状态
  const toggleTagExpand = useCallback((tagId) => {
    setExpandedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);
  
  // 处理拖拽排序
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const activeTag = allTags.find(tag => tag.id === active.id);
      const overTag = allTags.find(tag => tag.id === over.id);
      
      if (!activeTag || !overTag) return;
      
      try {
        // 检查是否拖拽到父标签区域（建立父子关系）
        if (overTag.isParent && activeTag.parentId !== overTag.id) {
          // 将标签设置为父标签的子标签
          await localConfigManager.updateTag(activeTag.id, { parentId: overTag.id });
          
          // 获取更新后的标签数据
          const updatedTags = localConfigManager.getTags();
          setAllTags(updatedTags);
          
          // 重新构建标签层次结构和更新可见标签列表
          const { hierarchy, rootTags } = buildTagHierarchy(updatedTags);
          setTagHierarchy(hierarchy);
          const flattenedTags = flattenTagTree(rootTags);
          setVisibleTags(flattenedTags);
          
          window.showToast(`标签 "${activeTag.name}" 已成为 "${overTag.name}" 的子标签`, 'success');
          console.log('标签已拖入父标签:', activeTag.name, '->', overTag.name);
          return;
        }
        
        // 检查是否拖出父标签到根级别（脱离父子关系）
        if (activeTag.parentId !== null && (overTag.parentId === null || !overTag.isParent)) {
          // 更新标签的parentId为null
          await localConfigManager.updateTag(activeTag.id, { parentId: null });
          
          // 检查原父标签是否还有其他子标签
          const allTags = localConfigManager.getTags();
          const oldParentId = activeTag.parentId;
          const siblings = allTags.filter(t => t.parentId === oldParentId && t.id !== activeTag.id);
          
          if (siblings.length === 0) {
            // 不再自动取消父标签状态，让用户明确决定是否要取消父标签状态
            console.log('原父标签已失去所有子标签，但仍保持父标签状态:', oldParentId);
          }
          
          // 获取更新后的标签数据
          const updatedTags = localConfigManager.getTags();
          setAllTags(updatedTags);
          
          // 重新构建标签层次结构和更新可见标签列表
          const { hierarchy, rootTags } = buildTagHierarchy(updatedTags);
          setTagHierarchy(hierarchy);
          const flattenedTags = flattenTagTree(rootTags);
          setVisibleTags(flattenedTags);
          
          window.showToast(`标签 "${activeTag.name}" 已从父标签中移出`, 'success');
          console.log('标签已拖出父标签:', activeTag.name);
          return;
        }
        
        // 同级标签之间的排序（都有父标签或都没有父标签）
        if ((activeTag.parentId === null && overTag.parentId === null) || 
            (activeTag.parentId === overTag.parentId)) {
          const oldIndex = visibleTags.findIndex(tag => tag.id === active.id);
          const newIndex = visibleTags.findIndex(tag => tag.id === over.id);
          
          const newVisibleTags = arrayMove(visibleTags, oldIndex, newIndex);
          setVisibleTags(newVisibleTags);
          
          // 更新标签顺序到本地存储
          const tagOrder = newVisibleTags.map(tag => tag.id);
          localStorage.setItem('tagOrder', JSON.stringify(tagOrder));
          console.log('标签顺序已更新:', tagOrder);
        } else {
          // 其他跨层级拖拽情况，静默处理
        }
        
      } catch (error) {
        console.error('拖拽操作失败:', error);
        window.showToast('拖拽操作失败，请重试', 'error');
      }
    }
  }, [visibleTags, allTags]);
  
  // Intersection Observer回调
  const handleObserver = useCallback((entries) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isLoading) {
      setPage(prevPage => prevPage + 1);
    }
  }, [hasMore, isLoading]);
  
  // 设置Intersection Observer
  useEffect(() => {
    const options = {
      root: scrollContainerRef.current,
      rootMargin: '0px',
      threshold: 0.1
    };
    
    observerRef.current = new IntersectionObserver(handleObserver, options);
    
    if (lastTagRef.current) {
      observerRef.current.observe(lastTagRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);
  
  // 更新可见标签
  useEffect(() => {
    const { hierarchy, rootTags } = buildTagHierarchy(allTags);
    setTagHierarchy(hierarchy);
    
    const flattenedTags = flattenTagTree(rootTags);
    
    // 应用搜索过滤
    const filteredTags = filterTags(flattenedTags, searchTerm);
    
    // 分页加载
    const startIndex = 0;
    const endIndex = page * pageSize;
    const paginatedTags = filteredTags.slice(startIndex, endIndex);
    
    setVisibleTags(paginatedTags);
    setHasMore(endIndex < filteredTags.length);
  }, [allTags, page, buildTagHierarchy, flattenTagTree, searchTerm]);
  
  // 更新lastTagRef
  useEffect(() => {
    if (visibleTags.length > 0) {
      lastTagRef.current = document.querySelector(`[data-tag-id="${visibleTags[visibleTags.length - 1].id}"]`);
    }
  }, [visibleTags]);
  
  // 可排序的标签项组件
  const SortableTagItem = ({ tag }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isOver,
    } = useSortable({ id: tag.id });
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    
    const hasChildren = tag.children && tag.children.length > 0;
    const isExpanded = expandedTags.has(tag.id);
    const isParent = tag.isParent; // 只使用明确的isParent属性，不自动根据是否有子标签判断
    
    // 拖拽悬停效果
     const isDragTarget = isOver && tag.isParent;
     const isRootDropTarget = isOver && !tag.isParent && !tag.parentId;
    
    return (
      <div
        ref={setNodeRef}
        style={style}
        data-tag-id={tag.id}
        className="w-full"
      >
        {/* 标签项 */}
        <div 
          className={`tag-item flex items-center w-full p-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
            tag.isPinned ? 'border-l-4 border-blue-500' : ''
          } ${selectedTag && selectedTag.id === tag.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${
            isDragTarget ? 'bg-blue-100 dark:bg-blue-800/50 border-2 border-blue-400' : ''
          } ${
            isRootDropTarget ? 'bg-green-100 dark:bg-green-800/50 border-2 border-green-400' : ''
          }`}
          style={{ 
            paddingLeft: `${8 + tag.level * 20}px`,
            opacity: transform ? 0.8 : 1
          }}
          onClick={() => handleTagClick(tag)}
        >
          {/* 拖拽手柄 */}
          <div
            {...attributes}
            {...listeners}
              className="mr-2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title={tag.isParent ? "拖拽以重新排序或拖入此父标签" : tag.parentId ? "拖拽以重新排序或拖出到根级别" : "拖拽以重新排序或拖入父标签"}
            >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </div>
          
          {/* 展开/折叠按钮 */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTagExpand(tag.id);
              }}
              className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <FiChevronDown 
                className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                size={12} 
              />
            </button>
          )}
          
          {/* 父标签特殊图标 */}
          {isParent && (
            <FiFolder className="mr-1 text-blue-500" size={12} title="父标签" />
          )}
          
          {/* 标签颜色圆点 */}
          <div className="mr-2 w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600" 
               style={{ backgroundColor: tagColorMap[tag.name] || '#9CA3AF' }}
               title={`标签颜色: ${tagColorMap[tag.name] || '默认'}`}>
          </div>
          
          {/* 标签名称 */}
          <span className="flex-1 text-xs text-gray-800 dark:text-gray-200 truncate">
            #{tag.name}
          </span>
          
          {/* 选中图标 */}
          {selectedTag && selectedTag.id === tag.id && (
            <FiCheck className="mr-1 text-green-500" size={12} />
          )}
          
          {/* 置顶图标 */}
          {tag.isPinned && (
            <FiBookmark className="mr-1 text-blue-500" size={12} />
          )}
          
          {/* 收藏图标 */}
          {tag.isFavorite && (
            <FiStar className="mr-2 text-purple-500" size={12} />
          )}
          
          {/* 菜单按钮 */}
          <button
            onClick={(e) => toggleMenu(e, tag.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            <FiMoreVertical size={14} />
          </button>
        </div>
        
        {/* 菜单 */}
        {menuVisible === tag.id && (
          <div 
            data-menu-id={tag.id}
            className="absolute right-2 top-8 shadow-lg z-50 min-w-[180px] rounded-none"
            style={{
              backgroundColor: 'var(--theme-elevated)'
            }}
          >
            {/* 关闭按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuVisible(null);
              }}
              className="absolute top-2 right-2 p-1 rounded transition-colors"
              style={{
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              title="关闭"
            >
              <FiX className="text-red-500 hover:text-red-700" size={14} />
            </button>
            
            {/* 标签置顶 */}
            <button
              onClick={() => handleMenuAction('pin', tag)}
              className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--theme-text)'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FiBookmark className={`mr-2 ${tag.isPinned ? 'text-blue-500' : ''}`} size={14} />
              {tag.isPinned ? '取消置顶' : '标签置顶'}
            </button>
            
            {/* 收藏标签 */}
            <button
              onClick={() => handleMenuAction('favorite', tag)}
              className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--theme-text)'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FiStar className={`mr-2 ${tag.isFavorite ? 'text-yellow-500 fill-current' : ''}`} size={14} />
              {tag.isFavorite ? '取消收藏' : '收藏标签'}
            </button>
            
            {/* 父标签特殊功能 */}
            {tag.parentId ? (
              <>
                <div className="border-0 my-1"></div>
                {/* 移出父标签 */}
                <button
                  onClick={() => handleMenuAction('removeFromParent', tag)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#f59e0b'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--theme-surface)';
                    e.target.style.color = '#d97706';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#f59e0b';
                  }}
                  title="从父标签中移出"
                >
                  <FiCornerUpLeft className="mr-2" size={14} />
                  <span>移出父标签</span>
                </button>
              </>
            ) : isParent ? (
              <>
                <div className="border-0 my-1"></div>
                {/* 解散父标签 */}
                <button
                  onClick={() => handleMenuAction('dissolveParent', tag)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#ef4444'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--theme-surface)';
                    e.target.style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#ef4444';
                  }}
                  title="解散父标签关系"
                >
                  <FiFolderMinus className="mr-2" size={14} />
                  <span>解散父标签</span>
                </button>
              </>
            ) : (
              <>
                <div className="border-0 my-1"></div>
                {/* 设置为父标签 */}
                <button
                  onClick={() => handleMenuAction('setAsParent', tag)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#3b82f6'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--theme-surface)';
                    e.target.style.color = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#3b82f6';
                  }}
                  title="设置为父标签"
                >
                  <FiFolderPlus className="mr-2" size={14} />
                  <span>设置为父标签</span>
                </button>
                {/* 移到父标签 */}
                <button
                  onClick={() => handleMenuAction('moveToParent', tag)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--theme-text)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  title="移动到父标签"
                >
                  <FiCornerUpRight className="mr-2" size={14} />
                  <span>移到父标签</span>
                </button>
              </>
            )}
            
            <div className="border-0 my-1"></div>
            
            {/* 设置颜色 */}
            <button
              ref={colorEditorButtonRef}
              onClick={() => handleMenuAction('setColor', tag)}
              className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--theme-text)'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <div className="mr-2 w-4 h-4 rounded-full" style={{ 
                backgroundColor: tagColorMap[tag.name] || '#9CA3AF',
                borderColor: 'var(--theme-border)'
              }} />
              设置颜色
            </button>
            
            <div className="border-0 my-1"></div>
            
            {/* 仅移除标签 */}
            <button
              onClick={() => handleMenuAction('remove', tag)}
              className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--theme-text)'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FiCornerUpLeft className="mr-2" size={14} />
              仅移除标签
            </button>
            
            {/* 删除标签和笔记 */}
            <button
              onClick={() => handleMenuAction('deleteAll', tag)}
              className="w-full text-left px-3 py-2 text-sm flex items-center border-0 transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: '#ef4444'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--theme-surface)';
                e.target.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#ef4444';
              }}
              title="删除标签和笔记"
            >
              <FiTrash2 className="mr-2" size={14} />
              <span>删除标签和笔记</span>
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // 渲染标签树
  const renderTagTree = () => {
    return visibleTags.map((tag) => (
      <SortableTagItem key={tag.id} tag={tag} />
    ));
  };
  
  return (
    <div className={`tag-manager flex flex-row h-full ${className}`}>

      


      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 日期筛选器 */}
        <div className="mb-4">
          <CompactCalendarFilter
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            noteDates={noteDates}
          />
        </div>
      
      {/* 标签管理标题 */}
      <div className="flex-shrink-0 mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-theme-text">标签管理</h3>
        <div className="flex items-center gap-2">
        </div>
      </div>
      
      {/* 搜索和添加标签区域 */}
      <div className="mb-3">
        {/* 搜索框 */}
        <div className="relative mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={async (e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                const tagName = searchTerm.trim();
                try {
                  // 检查标签是否已存在
                  const normalizedTagName = tagName.toLowerCase();
                  const existingTag = allTags.find(tag => {
                    const tagIdentifier = (tag.name || tag.label || tag.title || tag.id || '').toLowerCase();
                    return tagIdentifier === normalizedTagName;
                  });
                  
                  if (existingTag) {
                    console.log('标签已存在，不允许重复创建:', tagName);
                    return;
                  }
                  
                  // 使用本地配置管理器添加标签
                  const newTag = await localConfigManager.addTag({
                    name: tagName,
                    isPinned: false,
                    children: []
                  });
                  
                  if (newTag) {
                    // 使用用户选择的颜色设置标签颜色
                    await localConfigManager.setTagColor(tagName, selectedColor);
                    
                    // 立即更新本地颜色映射，确保UI立即显示新颜色
                    setTagColorMap(prev => ({
                      ...prev,
                      [tagName]: selectedColor
                    }));
                    
                    console.log('通过搜索框添加标签成功:', tagName, '颜色:', selectedColor, 'ID:', newTag.id);
                    
                    // 触发标签更新事件，通知其他组件刷新
                    window.dispatchEvent(new CustomEvent('tagsUpdated', {
                      detail: {
                        action: 'add',
                        tag: newTag,
                        tagName: tagName
                      }
                    }));
                    
                    // 手动刷新标签列表，确保立即显示新标签
                    const currentTags = localConfigManager.getTags();
                    
                    // 获取收藏状态
                    let favoriteTags = [];
                    try {
                      const savedFavorites = localStorage.getItem('memeos_favorite_tags');
                      if (savedFavorites) {
                        favoriteTags = JSON.parse(savedFavorites);
                      }
                    } catch (error) {
                      console.error('获取收藏状态失败:', error);
                    }
                    
                    const tagsWithFavorites = currentTags.map(tag => ({
                      ...tag,
                      isFavorite: favoriteTags.includes(tag.name || tag.label || tag.title || tag.id || 'unknown')
                    }));
                    setAllTags(tagsWithFavorites);
                    
                    setSearchTerm(''); // 清空搜索框
                  } else {
                    console.error('通过搜索框添加标签失败');
                  }
                } catch (error) {
                  console.error('通过搜索框添加标签过程中发生错误:', error);
                }
              }
            }}
            placeholder="搜索标签..."
            className="w-full px-2 py-1 pr-16 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:ring-0" style={{ backgroundColor: 'var(--theme-background)' }}
          />
          {/* 添加标签按钮 */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (searchTerm.trim()) {
                const tagName = searchTerm.trim();
                try {
                  // 检查标签是否已存在
                  const normalizedTagName = tagName.toLowerCase();
                  const existingTag = allTags.find(tag => {
                    const tagIdentifier = (tag.name || tag.label || tag.title || tag.id || '').toLowerCase();
                    return tagIdentifier === normalizedTagName;
                  });
                  
                  if (existingTag) {
                    console.log('标签已存在，不允许重复创建:', tagName);
                    return;
                  }
                  
                  // 使用本地配置管理器添加标签
                  const newTag = await localConfigManager.addTag({
                    name: tagName,
                    isPinned: false,
                    children: []
                  });
                  
                  if (newTag) {
                    // 使用用户选择的颜色设置标签颜色
                    await localConfigManager.setTagColor(tagName, selectedColor);
                    
                    // 立即更新本地颜色映射，确保UI立即显示新颜色
                    setTagColorMap(prev => ({
                      ...prev,
                      [tagName]: selectedColor
                    }));
                    
                    console.log('通过+号按钮添加标签成功:', tagName, '颜色:', selectedColor, 'ID:', newTag.id);
                    
                    // 触发标签更新事件，通知其他组件刷新
                    window.dispatchEvent(new CustomEvent('tagsUpdated', {
                      detail: {
                        action: 'add',
                        tag: newTag,
                        tagName: tagName
                      }
                    }));
                    
                    // 手动刷新标签列表，确保立即显示新标签
                    const currentTags = localConfigManager.getTags();
                    
                    // 获取收藏状态
                    let favoriteTags = [];
                    try {
                      const savedFavorites = localStorage.getItem('memeos_favorite_tags');
                      if (savedFavorites) {
                        favoriteTags = JSON.parse(savedFavorites);
                      }
                    } catch (error) {
                      console.error('获取收藏状态失败:', error);
                    }
                    
                    const tagsWithFavorites = currentTags.map(tag => ({
                      ...tag,
                      isFavorite: favoriteTags.includes(tag.name || tag.label || tag.title || tag.id || 'unknown')
                    }));
                    setAllTags(tagsWithFavorites);
                    
                    setSearchTerm(''); // 清空搜索框
                  } else {
                    console.error('通过+号按钮添加标签失败');
                  }
                } catch (error) {
                  console.error('通过+号按钮添加标签过程中发生错误:', error);
                }
              }
            }}
            className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="添加标签"
          >
            <FiPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* 颜色选择器按钮 - 只在添加新标签时显示 */}
          {!colorEditingTag && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <button
                ref={colorPickerButtonRef}
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="选择标签颜色"
              >
                <div 
                  className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: selectedColor }}
                />
              </button>
              
              {/* 颜色选择器弹窗 - 使用PortalPopup */}
              <PortalPopup
                isOpen={showColorPicker}
                triggerRef={colorPickerButtonRef}
                onClose={() => setShowColorPicker(false)}
                className="min-w-[200px] max-w-[400px]"
              >
                <div className="rounded-lg shadow-lg p-3 w-full" style={{ backgroundColor: '#171717' }}>
                  {/* 预设颜色网格 */}
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {commonColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={async () => {
                          setSelectedColor(color.hexColor);
                          
                          // 如果正在编辑标签颜色，更新标签颜色
                          if (colorEditingTag) {
                            await updateTagColor(colorEditingTag.name, color.hexColor);
                            setColorEditingTag(null);
                          }
                          
                          setShowColorPicker(false);
                          console.log('已选择颜色:', color.hexColor);
                        }}
                        className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color.hexColor }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  
                  {/* 自定义颜色选择器 */}
                  <div className="pt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      自定义颜色
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={async (e) => {
                          const color = e.target.value;
                          setSelectedColor(color);
                          
                          // 如果正在编辑标签颜色，更新标签颜色
                          if (colorEditingTag) {
                            await updateTagColor(colorEditingTag.name, color);
                          }
                        }}
                        className="w-10 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
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
                            
                            // 如果正在编辑标签颜色且颜色值有效，更新标签颜色
                            if (colorEditingTag && hexColorRegex.test(value)) {
                              await updateTagColor(colorEditingTag.name, value);
                            }
                          }
                        }}
                        placeholder="#000000"
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </PortalPopup>
            </div>
          )}

        </div>
        

      </div>
      
      {/* 标签树展示区域 - 可滚动 */}
      <div className="flex-1 min-h-0 mb-4 relative">
        
        {/* 标签颜色选择器 - 用于编辑现有标签颜色（全屏弹窗） */}
        {colorEditingTag && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
            <div className="bg-light-bg dark:bg-dark-surface rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-light-elevated dark:bg-dark-elevated mb-4">
                  <FiEdit2 className="h-6 w-6 text-light-text dark:text-dark-text" />
                </div>
                <h3 className="text-lg font-medium text-light-text dark:text-dark-text mb-2">
                  设置标签颜色
                </h3>
                <p className="text-sm text-light-muted dark:text-dark-muted">
                  {colorEditingTag.name}
                </p>
              </div>
              
              <div className="mb-6">
                {/* 预设颜色网格 */}
                <div className="grid grid-cols-8 gap-3 mb-6">
                  {commonColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={async () => {
                        setSelectedColor(color.hexColor);
                        await updateTagColor(colorEditingTag.name, color.hexColor);
                        setColorEditingTag(null);
                        setShowColorPicker(false);
                        console.log('标签颜色已更新:', colorEditingTag.name, '->', color.hexColor);
                      }}
                      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.hexColor }}
                      title={color.name}
                    />
                  ))}
                </div>
                
                {/* 自定义颜色选择器 */}
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-3">
                    自定义颜色
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={async (e) => {
                        const color = e.target.value;
                        setSelectedColor(color);
                        await updateTagColor(colorEditingTag.name, color);
                      }}
                      className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
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
                          
                          // 如果颜色值有效，更新标签颜色
                          if (hexColorRegex.test(value)) {
                            await updateTagColor(colorEditingTag.name, value);
                          }
                        }
                      }}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm focus:ring-0"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setColorEditingTag(null);
                    setShowColorPicker(false);
                  }}
                  className="px-4 py-2 bg-light-elevated dark:bg-dark-elevated hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    if (selectedColor) {
                      await updateTagColor(colorEditingTag.name, selectedColor);
                      setColorEditingTag(null);
                      setShowColorPicker(false);
                    }
                  }}
                className="px-4 py-2 bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text rounded-md transition-colors"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="h-full overflow-y-auto hide-scrollbar smooth-scroll-container scrollbar-smooth scrollbar-hide" ref={scrollContainerRef}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleTags.map(tag => tag.id)}
              strategy={verticalListSortingStrategy}
            >
              {isLoading ? (
                <div className="text-sm text-theme-text-muted py-4 text-center">加载中...</div>
              ) : visibleTags.length > 0 ? (
                <div className="space-y-1">
                  {renderTagTree()}
                  {hasMore && (
                    <div className="text-sm text-theme-text-muted py-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                      加载更多...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-theme-text-muted py-4 text-center">
                  {searchTerm ? '没有找到匹配的标签' : '暂无标签'}
                </div>
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>



      {/* 重命名标签模态框 */}
      {editingTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-bg dark:bg-dark-surface rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-light-elevated dark:bg-dark-elevated mb-4">
                <FiEdit2 className="h-6 w-6 text-light-text dark:text-dark-text" />
              </div>
              <h3 className="text-lg font-medium text-light-text dark:text-dark-text mb-2">
                重命名标签
              </h3>
              <div className="mb-4">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="输入新的标签名称"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-0"
                  onKeyPress={(e) => e.key === 'Enter' && handleRenameTag()}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setEditingTag(null);
                  setNewTagName('');
                }}
                className="px-4 py-2 bg-light-elevated dark:bg-dark-elevated hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRenameTag}
                className="px-4 py-2 bg-light-bg dark:bg-dark-bg hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text rounded-md transition-colors"
              >
                确认重命名
              </button>
            </div>
          </div>
        </div>
      )}
      

      
      {/* 确认模态框 */}
      {showConfirmModal && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={closeConfirmModal}
          onConfirm={handleConfirmModal}
          title={confirmModalData.title}
          message={confirmModalData.message}
          type={confirmModalData.type}
        />
      )}
      
      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-bg dark:bg-dark-surface rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <FiTrash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-light-text dark:text-dark-text mb-2">
                删除标签
              </h3>
              <p className="text-sm text-light-muted dark:text-dark-muted mb-4">
                确定要删除标签 "{tagToDelete && (typeof tagToDelete === 'string' ? tagToDelete : tagToDelete.name)}" 吗？
                <br />
                删除后，该标签将从所有笔记中移除。
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-light-elevated dark:bg-dark-elevated hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteTag}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 父标签选择对话框 */}
      {showParentSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-bg dark:bg-dark-surface rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <FiFolderPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-light-text dark:text-dark-text mb-2">
                {parentSelectionData.title}
              </h3>
              <p className="text-sm text-light-muted dark:text-dark-muted mb-4">
                {parentSelectionData.message}
              </p>
            </div>
            
            {/* 父标签选项列表 */}
            <div className="mb-4 max-h-60 overflow-y-auto">
              {parentSelectionData.options.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => handleParentSelect(option)}
                  className="w-full text-left px-3 py-2 mb-2 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-light-elevated dark:hover:bg-dark-elevated transition-colors flex items-center"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
                  }}
                >
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: option.color }}
                  ></span>
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={closeParentSelectionModal}
                className="px-4 py-2 bg-light-elevated dark:bg-dark-elevated hover:bg-light-border dark:hover:bg-dark-border text-light-text dark:text-dark-text rounded-md transition-colors"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)'
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      

      
      </div>
    </div>
  );
};

// 导出配置管理函数，供外部组件使用
export const favoriteConfigManager = {
  // 更新配置
  updateConfig: (newConfig) => {
    // 通过全局事件通知TagManager组件更新配置
    window.dispatchEvent(new CustomEvent('updateFavoriteConfig', { detail: newConfig }));
  },
  
  // 获取当前配置
  getConfig: () => {
    // 通过全局事件请求当前配置
    return new Promise((resolve) => {
      const handler = (event) => {
        window.removeEventListener('getFavoriteConfigResponse', handler);
        resolve(event.detail);
      };
      window.addEventListener('getFavoriteConfigResponse', handler);
      window.dispatchEvent(new CustomEvent('getFavoriteConfig'));
    });
  },
  
  // 重置配置
  resetConfig: () => {
    window.dispatchEvent(new CustomEvent('resetFavoriteConfig'));
  },
  
  // 预设配置模式
  presets: {
    // 性能优化模式（默认）
    performance: {
      enableSyncOptimization: true,
      enablePersistenceOptimization: true,
      enableLogging: false,
      syncTimeout: 5000
    },
    
    // 调试模式
    debug: {
      enableSyncOptimization: false,
      enablePersistenceOptimization: false,
      enableLogging: true,
      syncTimeout: 10000
    },
    
    // 平衡模式
    balanced: {
      enableSyncOptimization: true,
      enablePersistenceOptimization: true,
      enableLogging: true,
      syncTimeout: 3000
    }
  },
  
  // 应用预设配置
  applyPreset: (presetName) => {
    const preset = favoriteConfigManager.presets[presetName];
    if (preset) {
      favoriteConfigManager.updateConfig(preset);
    } else {
      console.error('未找到预设配置:', presetName);
    }
  }
};

export default TagManager;