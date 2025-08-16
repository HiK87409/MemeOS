import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiEdit2, FiTrash2, FiCalendar, FiTag, FiMoreVertical, FiStar, FiSettings, FiLink, FiArrowLeft, FiArrowRight, FiHeart, FiClock, FiEye, FiEyeOff } from 'react-icons/fi';

import { useEdit } from '../contexts/EditContext';
import { useTheme } from '../hooks/useTheme';
import NoteEditor from './NoteEditor';
import MarkdownRenderer from './MarkdownRenderer';
import CardCustomizer from './CardCustomizer';
import ConfirmDialog from './ConfirmDialog';
import ReferencesModal from './ReferencesModal';
import NoteHistoryModal from './NoteHistoryModal';


import globalEvents, { GLOBAL_EVENTS } from '../utils/globalEvents';

import { getAllColors } from '../utils/tagColorUtils';
import { commonColors, getDefaultColor } from '../utils/commonColors';
import localConfigManager from '../utils/localConfigManager';
import { formatRelativeTime, formatFullDate } from '../utils/timeUtils';
import { 
  togglePinNote, 
  toggleFavoriteNote,
  fetchGlobalCardSettings,
  saveGlobalCardSettings,
  fetchNoteCardSettings,
  saveNoteCardSettings,
  deleteAllNoteCardSettings,
  deleteNoteCardSettings,
  fetchNoteReferences,
  fetchNoteHistory
} from '../api/notesApi';
import { moodWeatherConfig } from '../config/moodWeatherConfig';
import EnhancedBackupManager from '../utils/enhancedbackupmanager';

const NoteCard = ({ note, onEdit, onDelete, onPin, onFavorite, onNoteClick, notes = [] }) => {
  // 使用共享的常用配色
  const allColors = [...commonColors];
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 检测内容中是否包含图片
  const containsImages = (content) => {
    if (!content) return false;
    // 检测Markdown格式的图片 ![alt](url)
    const imageRegex = /!\[.*?\]\([^)]+\)/g;
    return imageRegex.test(content);
  };
  
  // 如果有图片，默认展开 - 这个逻辑将在函数定义后处理
  const [tagColorMap, setTagColorMap] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showFullDate, setShowFullDate] = useState(false);
  const [colorDataLoaded, setColorDataLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [forceUpdateTrigger, setForceUpdateTrigger] = useState(0);

  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  // 解析出的心情和天气状态
  const [parsedMood, setParsedMood] = useState(null);
  const [parsedWeather, setParsedWeather] = useState(null);
  // 个性化设置相关状态
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [cardSettings, setCardSettings] = useState({});
  const [globalSettings, setGlobalSettings] = useState({});
  // 右键菜单相关状态
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  // 确认弹窗相关状态
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  });
  // 引用关系相关状态
  const [showReferencesModal, setShowReferencesModal] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState(null);
  const [referencesCount, setReferencesCount] = useState({ incoming: 0, outgoing: 0 });
  const [referencesData, setReferencesData] = useState({ incoming: [], outgoing: [] });
  
  // 历史记录相关状态
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [noteHistory, setNoteHistory] = useState([]);
  const [backupManager] = useState(() => new EnhancedBackupManager());

  const { isEditing: isEditingGlobal, startEditing, stopEditing } = useEdit();
  const { darkMode, isInitialized } = useTheme();
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const cardRef = useRef(null);
  const doubleClickTimeoutRef = useRef(null);
  

  
  // 检查当前笔记是否正在编辑
  const isEditing = isEditingGlobal(note.id);

  // 解析内容中的心情和天气
  const parseContentForMoodAndWeather = (content) => {
    return moodWeatherConfig.parseContentForMoodAndWeather(content);
  };

  // 解析笔记内容中的心情和天气
  useEffect(() => {
    if (note && note.content) {
      const { mood, weather } = parseContentForMoodAndWeather(note.content);
      setParsedMood(mood);
      setParsedWeather(weather);
    } else {
      setParsedMood(null);
      setParsedWeather(null);
    }
  }, [note.content]);

  // 从内容中移除心情和天气的函数
  const getContentWithoutMoodAndWeather = (content) => {
    return moodWeatherConfig.removeAllMoodAndWeather(content);
  };

  // 切换菜单显示状态
  const toggleMenu = () => {
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const menuWidth = 256; // 使用 tailwind.config.js 中定义的 menu-width
      const menuHeight = 160; // 菜单高度
      
      // 计算菜单位置，优先在按钮下方显示
      let left = rect.left;
      let top = rect.bottom + 8; // 按钮下方8px
      
      // 检查是否超出屏幕底部
      if (top + menuHeight > window.innerHeight - 10) {
        // 如果超出底部，尝试在按钮上方显示
        top = rect.top - menuHeight - 8; // 按钮上方8px
        
        // 如果上方空间也不足，使用屏幕中间位置
        if (top < 10) {
          top = (window.innerHeight - menuHeight) / 2;
        }
      }
      
      // 边界检查，确保菜单不会超出屏幕右边界
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }
      
      // 确保菜单不会超出屏幕左边界
      if (left < 10) {
        left = 10;
      }
      
      // 确保菜单不会超出屏幕顶部
      if (top < 10) {
        top = 10;
      }
      
      setMenuPosition({
        top: top,
        left: left
      });
    }
    setShowMenu(!showMenu);
  };

  // 处理直接进入编辑模式（无动画）
  const handleEditDirect = () => {
    startEditing(note.id);
  };

  // 处理双击编辑
  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditing) {
      clearTimeout(doubleClickTimeoutRef.current);
      handleEditDirect();
    }
  };

  // 处理单击
  const handleSingleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    doubleClickTimeoutRef.current = setTimeout(() => {
      // 单击事件处理
    }, 200);
  };

  // 处理右键菜单
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    {
      const menuWidth = 256; // 使用 tailwind.config.js 中定义的 menu-width
      const menuHeight = 160; // 菜单高度
      
      // 计算菜单位置，优先在鼠标位置下方显示
      let left = e.clientX;
      let top = e.clientY + 8; // 鼠标位置下方8px
      
      // 检查是否超出屏幕底部
      if (top + menuHeight > window.innerHeight - 10) {
        // 如果超出底部，尝试在鼠标位置上方显示
        top = e.clientY - menuHeight - 8; // 鼠标位置上方8px
        
        // 如果上方空间也不足，使用屏幕中间位置
        if (top < 10) {
          top = (window.innerHeight - menuHeight) / 2;
        }
      }
      
      // 边界检查，确保菜单不会超出屏幕右边界
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }
      
      // 确保菜单不会超出屏幕左边界
      if (left < 10) {
        left = 10;
      }
      
      // 确保菜单不会超出屏幕顶部
      if (top < 10) {
        top = 10;
      }
      
      setContextMenuPosition({
        x: left,
        y: top
      });
      setShowContextMenu(true);
      // 关闭其他菜单
      setShowMenu(false);
    }
  };

  // 外部点击关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 关闭三点菜单
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          menuButtonRef.current && !menuButtonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      // 关闭右键菜单
      setShowContextMenu(false);
    };

    const handleScroll = () => {
      setShowMenu(false);
      setShowContextMenu(false);
    };

    const handleResize = () => {
      setShowMenu(false);
      setShowContextMenu(false);
    };

    if (showMenu || showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showMenu, showContextMenu]);

  // 加载颜色数据
  useEffect(() => {
    const loadColors = async () => {
      try {
        // 使用localConfigManager获取标签颜色，与TagManager保持一致
        const tagColors = localConfigManager.getTagColors();
        setTagColorMap(tagColors);
        setColorDataLoaded(true);
      } catch (error) {
        console.error('加载颜色数据失败:', error);
        // 失败时使用localStorage作为回退
        const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
        setTagColorMap(savedColors);
        setColorDataLoaded(true);
      }
    };

    loadColors();
    
    // 添加监听器，当标签颜色变化时更新
    const handleTagColorsChanged = (tagColors) => {
      setTagColorMap(tagColors);
    };
    
    // 添加监听器，当用户偏好设置变化时强制重新渲染
    const handleUserPreferencesChanged = () => {
      // 强制重新渲染组件以应用新的宽度设置
      setForceUpdateTrigger(prev => prev + 1);
    };
    
    localConfigManager.addListener('tagColorsChanged', handleTagColorsChanged);
    localConfigManager.addListener('userPreferencesChanged', handleUserPreferencesChanged);
    
    return () => {
      localConfigManager.removeListener('tagColorsChanged', handleTagColorsChanged);
      localConfigManager.removeListener('userPreferencesChanged', handleUserPreferencesChanged);
    };
  }, []);

  // 监听标签颜色更新事件
  useEffect(() => {
    const handleTagColorsUpdated = async (event) => {
      try {
        const { fetchTagColors } = await import('../api/notesApi.js');
        const updatedTagColors = await fetchTagColors();
        
        setTagColorMap(updatedTagColors);
        localStorage.setItem('tagColors', JSON.stringify(updatedTagColors));
      } catch (error) {
        console.error('同步标签颜色失败:', error);
        const { tagName, color } = event.detail || {};
        if (tagName && color) {
          setTagColorMap(prev => ({
            ...prev,
            [tagName]: color
          }));
        }
      }
    };

    const handleSelectedColorChanged = (event) => {
      const { selectedColor } = event.detail || {};
      if (selectedColor) {
        localStorage.setItem('lastSelectedTagColor', selectedColor);
        setColorDataLoaded(prev => !prev);
        setTimeout(() => setColorDataLoaded(prev => !prev), 10);
      }
    };

    window.addEventListener('tagColorsUpdated', handleTagColorsUpdated);
    window.addEventListener('selectedColorChanged', handleSelectedColorChanged);
    return () => {
      window.removeEventListener('tagColorsUpdated', handleTagColorsUpdated);
      window.removeEventListener('selectedColorChanged', handleSelectedColorChanged);
    };
  }, []);

  // 加载卡片个性化设置
  useEffect(() => {
    const loadCardSettings = async () => {
      try {
        // 获取当前主题模式
        const themeMode = darkMode ? 'dark' : 'light';
        
        // 加载全局设置
        const globalSettings = await fetchGlobalCardSettings(themeMode);
        setGlobalSettings(globalSettings);

        // 加载当前笔记的个性化设置
        if (note.id) {
          try {
            const noteSettings = await fetchNoteCardSettings(note.id, themeMode);
            setCardSettings(noteSettings);
          } catch (error) {
            // 如果没有个性化设置，使用全局设置
            setCardSettings({});
          }
        }
        
        // 设置已加载标志
        setSettingsLoaded(true);
      } catch (error) {
        console.error('加载卡片设置失败:', error);
        // 使用默认设置
        setGlobalSettings({});
        setCardSettings({});
        // 即使出错也设置为已加载，避免无限等待
        setSettingsLoaded(true);
      }
    };

    // 只有在主题已经初始化后才执行加载
    if (isInitialized) {
      loadCardSettings();
    }
  }, [note.id, isInitialized, darkMode]);

  // 加载引用关系数据
  useEffect(() => {
    const loadReferences = async () => {
      if (!note?.id) return;
      
      try {
        const references = await fetchNoteReferences(note.id);
        setReferencesData(references);
        setReferencesCount({
          incoming: references.incoming?.length || 0,
          outgoing: references.outgoing?.length || 0
        });
      } catch (error) {
        console.error('获取引用关系数据失败:', error);
      }
    };

    loadReferences();
    
    // 添加轮询机制，每30秒更新一次引用数据
    const pollInterval = setInterval(loadReferences, 30000);
    
    // 监听全局事件，当引用关系更新时重新加载数据
    const handleReferencesUpdated = (eventData) => {
      const { noteId } = eventData || {};
      if (noteId === note.id) {
        console.log(`[NoteCard] 收到引用关系更新事件，重新加载笔记${note.id}的引用数据`);
        loadReferences();
      }
    };
    
    globalEvents.on(GLOBAL_EVENTS.NOTE_REFERENCES_UPDATED, handleReferencesUpdated);
    
    // 清理函数
    return () => {
      clearInterval(pollInterval);
      globalEvents.off(GLOBAL_EVENTS.NOTE_REFERENCES_UPDATED, handleReferencesUpdated);
    };
  }, [note.id]);



  // 监听全局设置更新事件和主题切换
  useEffect(() => {
    const handleGlobalUpdate = async (eventData) => {
      console.log('🌍 [NoteCard] 收到全局设置更新事件:', eventData);
      try {
        const themeMode = darkMode ? 'dark' : 'light';
        // 重新加载全局设置
        const freshGlobalSettings = await fetchGlobalCardSettings(themeMode);
        setGlobalSettings(freshGlobalSettings);
        
        // 如果是全部恢复默认或应用到全部，重新加载当前笔记的个性化设置
        if (eventData?.type === 'reset_all' || eventData?.type === 'apply_to_all') {
          if (note.id) {
            try {
              const noteSettings = await fetchNoteCardSettings(note.id, themeMode);
              setCardSettings(noteSettings);
            } catch (error) {
              // 如果没有个性化设置，使用全局设置
              setCardSettings({});
            }
          } else {
            setCardSettings({});
          }
        }
        
        // 更新加载状态
        setSettingsLoaded(true);
        console.log('🌍 [NoteCard] 全局设置已更新');
      } catch (error) {
        console.error('🌍 [NoteCard] 重新加载全局设置失败:', error);
        // 即使出错也更新加载状态
        setSettingsLoaded(true);
      }
    };

    // 直接设置监听器，不依赖isInitialized
    globalEvents.on(GLOBAL_EVENTS.CARD_SETTINGS_GLOBAL_UPDATE, handleGlobalUpdate);
    globalEvents.on(GLOBAL_EVENTS.CARD_SETTINGS_RESET_ALL, handleGlobalUpdate);

    // 清理监听器
    return () => {
      globalEvents.off(GLOBAL_EVENTS.CARD_SETTINGS_GLOBAL_UPDATE, handleGlobalUpdate);
      globalEvents.off(GLOBAL_EVENTS.CARD_SETTINGS_RESET_ALL, handleGlobalUpdate);
    };
  }, [darkMode]);

  // 专门监听主题切换，确保配置及时重新加载
  useEffect(() => {
    if (!isInitialized) return;
    
    const handleThemeSwitch = async () => {
      console.log('🎨 [NoteCard] 检测到主题切换，重新加载配置');
      try {
        const themeMode = darkMode ? 'dark' : 'light';
        
        // 重新加载全局设置
        const freshGlobalSettings = await fetchGlobalCardSettings(themeMode);
        setGlobalSettings(freshGlobalSettings);
        
        // 重新加载当前笔记的个性化设置
        if (note.id) {
          try {
            const noteSettings = await fetchNoteCardSettings(note.id, themeMode);
            setCardSettings(noteSettings);
          } catch (error) {
            // 如果没有个性化设置，使用全局设置
            setCardSettings({});
          }
        }
        
        // 更新加载状态
        setSettingsLoaded(true);
        console.log('🎨 [NoteCard] 主题切换配置重新加载完成');
      } catch (error) {
        console.error('🎨 [NoteCard] 主题切换配置重新加载失败:', error);
        // 即使出错也更新加载状态
        setSettingsLoaded(true);
      }
    };
    
    // 立即执行，不使用延迟以避免竞态条件
    handleThemeSwitch();
  }, [darkMode, isInitialized, note.id]);

  // 获取要显示的时间 - 始终使用创建时间
  const getDisplayTime = () => {
    return note.created_at;
  };

  // 从状态中获取标签颜色类名
  const getTagColorFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 统一返回白色文字样式，背景色通过getTagStyleFromState处理
    return 'text-white';
  };

  // 从状态中获取标签样式
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

  // 确保置顶状态是布尔值
  const isPinned = Boolean(note.is_pinned);

  // 获取当前生效的设置（个性化设置优先于全局设置）
  const getEffectiveSettings = () => {
    // 默认设置 - 不设置任何硬编码的默认颜色值
    const defaultSettings = {
      borderWidth: 1,
      shadowSize: 'sm',
      backgroundGradient: false,
      borderRadius: 8,
      maxLines: 6,
      width: 'auto',
    };
    
    // 确保globalSettings和cardSettings存在且不为空
    const safeGlobalSettings = globalSettings || {};
    const safeCardSettings = cardSettings || {};
    
    // 合并设置，确保自定义颜色优先级最高
    const mergedSettings = { ...defaultSettings };
    
    // 首先合并全局设置，只包含非空值
    Object.keys(safeGlobalSettings).forEach(key => {
      if (safeGlobalSettings[key] !== '' && safeGlobalSettings[key] !== undefined && safeGlobalSettings[key] !== null) {
        mergedSettings[key] = safeGlobalSettings[key];
      }
    });
    
    // 然后合并个性化设置，优先级最高，只包含非空值
    Object.keys(safeCardSettings).forEach(key => {
      if (safeCardSettings[key] !== '' && safeCardSettings[key] !== undefined && safeCardSettings[key] !== null) {
        mergedSettings[key] = safeCardSettings[key];
      }
    });
    
    return mergedSettings;
  };

  // 显示确认弹窗的辅助函数
  const showConfirmDialog = (title, message, onConfirm, type = 'warning') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
  };

  // 关闭确认弹窗
  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
      type: 'warning'
    });
  };

  // 处理个性化设置应用
  const handleApplySettings = (settings) => {
    showConfirmDialog(
      '应用到此卡片',
      '确定要将当前设置应用到此卡片吗？\n这将覆盖此卡片的现有个性化设置。',
      async () => {
        console.log('🎨 [NoteCard] 开始应用个性化设置:', settings);
        try {
          // 确保darkMode已经初始化
          if (typeof darkMode === 'undefined') {
            console.error('🎨 [NoteCard] darkMode未初始化');
            return;
          }
          
          const themeMode = darkMode ? 'dark' : 'light';
          console.log('🎨 [NoteCard] 调用 saveNoteCardSettings, noteId:', note.id, 'themeMode:', themeMode);
          
          // 保存当前主题模式的设置
          await saveNoteCardSettings(note.id, settings, themeMode);
          
          console.log('🎨 [NoteCard] 保存成功，更新本地状态');
          setCardSettings(settings);
          setShowCustomizer(false);
          console.log('🎨 [NoteCard] 个性化设置应用完成');
        } catch (error) {
          console.error('🎨 [NoteCard] 保存卡片设置失败:', error);
          // 使用自定义提示替代alert
        }
      },
      'info'
    );
  };

  // 处理应用到全部卡片
  const handleApplyToAll = (settings) => {
    showConfirmDialog(
      '应用到全部',
      '确定要将当前设置应用到所有卡片吗？\n这将覆盖所有卡片的个性化设置，无法撤销。',
      async () => {
        console.log('🌍 [NoteCard] 开始应用全局设置:', settings);
        try {
          // 确保主题已经初始化
          if (!isInitialized) {
            console.error('🌍 [NoteCard] 主题未初始化，等待初始化完成');
            // 等待主题初始化完成
            await new Promise(resolve => {
              const checkInitialized = setInterval(() => {
                if (isInitialized) {
                  clearInterval(checkInitialized);
                  resolve();
                }
              }, 100);
            });
          }
          
          const themeMode = darkMode ? 'dark' : 'light';
          
          // 删除当前主题模式的所有笔记个性化设置
          console.log('🌍 [NoteCard] 调用 deleteAllNoteCardSettings, themeMode:', themeMode);
          await deleteAllNoteCardSettings(themeMode);
          console.log('🌍 [NoteCard] 删除所有笔记设置成功');
          
          // 保存当前主题模式的全局设置
          console.log('🌍 [NoteCard] 调用 saveGlobalCardSettings, themeMode:', themeMode);
          await saveGlobalCardSettings(settings, themeMode);
          
          console.log('🌍 [NoteCard] 保存成功，更新本地状态');
          setGlobalSettings(settings);
          
          // 清空当前卡片的个性化设置
          setCardSettings({});
          setShowCustomizer(false);
          
          // 触发全局事件，通知所有卡片刷新
          globalEvents.emit(GLOBAL_EVENTS.CARD_SETTINGS_GLOBAL_UPDATE, {
            type: 'apply_to_all',
            settings: settings
          });
          
          console.log('🌍 [NoteCard] 全局设置应用完成，已通知所有卡片刷新');
        } catch (error) {
          console.error('🌍 [NoteCard] 保存全局设置失败:', error);
          // 使用自定义提示替代alert
        }
      },
      'warning'
    );
  };

  // 查看笔记历史记录
  const handleViewHistory = async () => {
    try {
      const history = await fetchNoteHistory(note.id);
      setNoteHistory(history);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('获取笔记历史记录失败:', error);
    }
  };

  // 处理恢复此卡片到默认
  const handleResetThisCard = () => {
    showConfirmDialog(
      '恢复此卡片',
      '确定要恢复此卡片到默认设置吗？\n此操作将清除当前卡片的所有个性化设置，恢复为全局默认样式。',
      async () => {
        console.log('🔄 [NoteCard] 开始恢复此卡片到默认');
        try {
          // 确保主题已经初始化
          if (!isInitialized) {
            console.error('🔄 [NoteCard] 主题未初始化，等待初始化完成');
            // 等待主题初始化完成
            await new Promise(resolve => {
              const checkInitialized = setInterval(() => {
                if (isInitialized) {
                  clearInterval(checkInitialized);
                  resolve();
                }
              }, 100);
            });
          }
          
          const themeMode = darkMode ? 'dark' : 'light';
          
          // 删除当前笔记的个性化设置
          console.log('🔄 [NoteCard] 调用 deleteNoteCardSettings, noteId:', note.id, 'themeMode:', themeMode);
          const result = await deleteNoteCardSettings(note.id, themeMode);
          console.log('🔄 [NoteCard] 删除笔记设置成功:', result);
          
          // 清空当前卡片的个性化设置，这将使卡片回到全局设置
          setCardSettings({});
          setShowCustomizer(false);
          
          // 重新加载当前主题的全局设置以确保显示正确
          try {
            const currentThemeMode = darkMode ? 'dark' : 'light';
            console.log('🔄 [NoteCard] 重新加载当前主题全局设置:', currentThemeMode);
            const freshGlobalSettings = await fetchGlobalCardSettings(currentThemeMode);
            console.log('🔄 [NoteCard] 全局设置加载成功:', freshGlobalSettings);
            setGlobalSettings(freshGlobalSettings);
          } catch (globalError) {
            console.error('🔄 [NoteCard] 重新加载全局设置失败:', globalError);
          }
          
          console.log('🔄 [NoteCard] 恢复此卡片到默认完成');
          // 成功提示已通过UI反馈
        } catch (error) {
          console.error('🔄 [NoteCard] 恢复此卡片到默认失败:', error);
          // 错误提示已通过UI反馈
        }
      },
      'warning'
    );
  };

  // 处理全部恢复默认
  const handleResetAllToDefault = () => {
    showConfirmDialog(
      '全部恢复默认',
      '确定要恢复所有卡片到默认设置吗？\n此操作将清除所有卡片的个性化设置和全局设置，无法撤销。',
      async () => {
        console.log('🔄 [NoteCard] 开始全部恢复默认');
        try {
          // 确保主题已经初始化
          if (!isInitialized) {
            console.error('🔄 [NoteCard] 主题未初始化，等待初始化完成');
            // 等待主题初始化完成
            await new Promise(resolve => {
              const checkInitialized = setInterval(() => {
                if (isInitialized) {
                  clearInterval(checkInitialized);
                  resolve();
                }
              }, 100);
            });
          }
          
          const themeMode = darkMode ? 'dark' : 'light';
          
          // 删除当前主题模式的所有笔记个性化设置
          console.log('🔄 [NoteCard] 调用 deleteAllNoteCardSettings, themeMode:', themeMode);
          const result = await deleteAllNoteCardSettings(themeMode);
          console.log('🔄 [NoteCard] 删除所有笔记设置成功:', result);
          
          // 重置全局设置到默认值
          const defaultGlobalSettings = {
            borderWidth: 1,
            shadowSize: 'sm',
            backgroundGradient: false,
            borderRadius: 8,
            maxLines: 6,
          };
          
          // 保存当前主题模式的默认全局设置
          console.log('🔄 [NoteCard] 保存默认全局设置, themeMode:', themeMode);
          await saveGlobalCardSettings(defaultGlobalSettings, themeMode);
          
          setGlobalSettings(defaultGlobalSettings);
          
          // 清空当前卡片的个性化设置
          setCardSettings({});
          setShowCustomizer(false);
          
          // 触发全局事件，通知所有卡片刷新
          globalEvents.emit(GLOBAL_EVENTS.CARD_SETTINGS_RESET_ALL, {
            type: 'reset_all',
            settings: defaultGlobalSettings
          });
          
          console.log('🔄 [NoteCard] 全部恢复默认完成');
          // 成功提示已通过UI反馈
        } catch (error) {
          console.error('🔄 [NoteCard] 全部恢复默认失败:', error);
          // 错误提示已通过UI反馈
        }
      },
      'danger'
    );
  };

  // 根据用户设置获取卡片宽度类名
  const getCardWidthClass = () => {
    // 获取用户偏好设置中的卡片宽度设置
    const preferences = localConfigManager.getUserPreferences();
    const cardWidth = preferences.cardWidth || '70%';
    
    // 根据百分比设置返回对应的类名
    switch (cardWidth) {
      case '50%':
        return 'w-1/2 max-w-full';
      case '60%':
        return 'w-3/5 max-w-full';
      case '70%':
        return 'w-[70%] max-w-full';
      case '80%':
        return 'w-4/5 max-w-full';
      case '90%':
        return 'w-[90%] max-w-full';
      case '100%':
        return 'w-full max-w-full';
      default:
        // 默认70%宽度
        return 'w-[70%] max-w-full';
    }
  };

  // 获取卡片样式类名
  const getCardClasses = () => {
    const baseClasses = `${getCardWidthClass()} min-h-card p-6 card-optimized smooth-transition select-none relative z-10`;
    
    // 置顶卡片不使用特殊背景，保持个性化设置
    return `${baseClasses} note-card`;
  };

  // 获取卡片的自定义样式 - 使用即时同步的CSS变量避免闪烁
  const getCardCustomStyle = () => {
    // 首先尝试使用即时同步的CSS变量（从index.html脚本设置）
    const getImmediateSettings = () => {
      return {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-global-bg').trim() || 'var(--theme-surface)',
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-global-border').trim(),
        borderWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-global-border-width').trim()) || 1,
        borderRadius: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-global-border-radius').trim()) || 8,
        shadowSize: getComputedStyle(document.documentElement).getPropertyValue('--card-global-shadow').trim() || 'sm',
        textColor: getComputedStyle(document.documentElement).getPropertyValue('--card-global-text').trim() || 'var(--theme-text)',
        backgroundGradient: false
      };
    };
    
    // 获取设置，优先使用即时同步的设置，然后回退到异步加载的设置
    const immediateSettings = getImmediateSettings();
    const settings = settingsLoaded ? getEffectiveSettings() : immediateSettings;
    
    const shadowStyles = {
      'none': 'none',
      'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    };

    const style = {
      borderWidth: `${settings.borderWidth}px`,
      borderStyle: 'solid',
      borderRadius: `${settings.borderRadius}px`,
      boxShadow: shadowStyles[settings.shadowSize] || shadowStyles.sm,
      color: settings.textColor || 'var(--theme-text)'
    };
    
    // 只有当borderColor存在且不为空时才设置边框颜色
    if (settings.borderColor && settings.borderColor !== '') {
      style.borderColor = settings.borderColor;
    } else {
      // 如果没有边框颜色，移除边框样式
      style.borderWidth = '0';
      style.borderStyle = 'none';
    }

    // 修复背景色应用逻辑 - 优先使用即时同步的CSS变量
    if (settings.backgroundGradient) {
      // 处理渐变背景色，确保能够响应主题变化
      const defaultThemeSurface = getComputedStyle(document.documentElement).getPropertyValue('--theme-surface').trim();
      const fallbackColor = defaultThemeSurface || '#e2e8f0';
      
      // 确保gradientColors存在且是数组
      const gradientColors = Array.isArray(settings.gradientColors) ? settings.gradientColors : ['', ''];
      let gradientColor1 = gradientColors[0];
      let gradientColor2 = gradientColors[1];
      
      // 如果第一个渐变色不存在、为空或为默认主题色，使用CSS变量
      if (!gradientColor1 || 
          gradientColor1 === '' ||
          gradientColor1 === '#ffffff' || 
          gradientColor1 === '#1F2937' ||
          gradientColor1 === '#e2e8f0' ||
          gradientColor1 === fallbackColor) {
        gradientColor1 = 'var(--theme-surface)';
      }
      
      // 如果第二个渐变色不存在、为空或为默认主题色，使用CSS变量
      if (!gradientColor2 || 
          gradientColor2 === '' ||
          gradientColor2 === '#ffffff' || 
          gradientColor2 === '#1F2937' ||
          gradientColor2 === '#f9fafb' ||
          gradientColor2 === fallbackColor) {
        gradientColor2 = 'var(--theme-elevated)';
      }
      
      style.background = `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})`;
      // 清除可能存在的backgroundColor属性，避免冲突
      delete style.backgroundColor;
    } else {
      // 确保纯色背景正确应用，优先使用即时同步的设置
      if (!settings.backgroundColor || 
          settings.backgroundColor === '' ||
          settings.backgroundColor === '#ffffff' || 
          settings.backgroundColor === '#1F2937' ||
          settings.backgroundColor === '#e2e8f0') {
        // 优先使用即时同步的CSS变量
        style.backgroundColor = immediateSettings.backgroundColor;
      } else {
        // 使用用户自定义的颜色
        style.backgroundColor = settings.backgroundColor;
      }
      // 清除可能存在的background属性，避免冲突
      delete style.background;
    }

    return {
      style,
      shadowClass: '' // 不再使用Tailwind阴影类，直接使用内联样式
    };
  };
  
  // 处理编辑保存
  const handleSave = async (updatedNote) => {
    try {
      await onEdit(note.id, updatedNote, { preventReload: true });
      // 如果不是标签更改，才退出编辑模式
      if (!updatedNote.isTagChange) {
        stopEditing();
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
    }
  };
  
  // 处理编辑取消
  const handleCancel = () => {
    setIsExiting(true);
    
    // 添加优化的退出动画类
    if (cardRef.current) {
      cardRef.current.classList.add('card-exit');
    }
    
    // 立即停止编辑，减少延迟
    stopEditing();
    
    // 使用动画完成事件来清理状态
    setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.classList.remove('card-exit');
      }
      setIsExiting(false);
    }, 350); // 与CSS动画时间匹配
  };
  
  // 处理删除
  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[NoteCard] 删除按钮被点击，笔记ID:', note.id);
    console.log('[NoteCard] onDelete函数存在:', typeof onDelete === 'function');
    
    if (typeof onDelete === 'function') {
      onDelete(note.id);
    } else {
      console.error('[NoteCard] onDelete不是一个函数:', onDelete);
    }
  };
  
  // 处理置顶
  const handlePin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const originalPinnedState = note.is_pinned;
    const newPinnedState = !originalPinnedState;
    
    // 乐观更新UI
    if (onPin) {
      onPin(note.id, newPinnedState);
    }
    
    try {
      await togglePinNote(note.id);
    } catch (error) {
      console.error('置顶操作失败:', error);
      console.error('错误详情:', error.response?.data || error.message);
      // 恢复原始状态
      if (onPin) {
        onPin(note.id, originalPinnedState);
      }
      // 错误提示已通过UI反馈
    }
  };
  

  
  // 解析标签
  const getTags = () => {
    if (!note.tags) return [];
    
    if (typeof note.tags === 'string') {
      return note.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    if (Array.isArray(note.tags)) {
      return note.tags;
    }
    
    return [];
  };
  
  const tags = getTags();
  
  // 截断内容用于预览，保持引用格式完整
  const getPreviewContent = (content, maxLength = 200) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    
    // 智能截断，避免破坏引用格式
    let truncated = content.substring(0, maxLength);
    
    // 检查是否在引用格式中间截断了
    const lastOpenBracket = truncated.lastIndexOf('[[');
    const lastCloseBracket = truncated.lastIndexOf(']]');
    const lastOpenChineseBracket = truncated.lastIndexOf('【【');
    const lastCloseChineseBracket = truncated.lastIndexOf('】】');
    
    // 如果有未闭合的引用格式，尝试找到完整的引用
    if ((lastOpenBracket > lastCloseBracket) || (lastOpenChineseBracket > lastCloseChineseBracket)) {
      // 在原始内容中找到下一个闭合括号
      const nextCloseBracket = content.indexOf(']]', lastOpenBracket);
      const nextCloseChineseBracket = content.indexOf('】】', lastOpenChineseBracket);
      
      // 选择最近的闭合括号
      let nextClose = -1;
      if (nextCloseBracket !== -1 && nextCloseChineseBracket !== -1) {
        nextClose = Math.min(nextCloseBracket + 2, nextCloseChineseBracket + 2);
      } else if (nextCloseBracket !== -1) {
        nextClose = nextCloseBracket + 2;
      } else if (nextCloseChineseBracket !== -1) {
        nextClose = nextCloseChineseBracket + 2;
      }
      
      // 如果找到了闭合括号且不会让内容过长，就包含完整的引用
      if (nextClose !== -1 && nextClose <= maxLength + 20) {
        truncated = content.substring(0, nextClose);
      }
    }
    
    return truncated + (truncated.length < content.length ? '...' : '');
  };
  
  // 获取清理后的内容（移除心情和天气）
  const cleanContent = getContentWithoutMoodAndWeather(note.content);

  // 如果有图片，根据用户偏好设置决定是否展开
  useEffect(() => {
    if (containsImages(cleanContent)) {
      // 获取用户偏好设置，默认为展开（true）
      const preferences = localConfigManager.getUserPreferences();
      const shouldExpandImages = preferences.expandImages !== false;
      setIsExpanded(shouldExpandImages);
    }
  }, [cleanContent]);

  // 估算内容行数来决定是否显示展开按钮
  const estimateLineCount = (content) => {
    if (!content) return 0;
    
    // 按换行符分割
    const lines = content.split('\n');
    let totalLines = 0;
    
    lines.forEach(line => {
      if (line.trim() === '') {
        totalLines += 1; // 空行
      } else {
        // 根据屏幕宽度动态计算每行字符数
        // 移动端约40字符，桌面端约60-80字符
        const isMobile = window.innerWidth < 768;
        const charsPerLine = isMobile ? 35 : 60;
        
        // 考虑中文字符占用更多空间
        const chineseChars = (line.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = line.length - chineseChars;
        const effectiveLength = chineseChars * 1.5 + otherChars;
        
        // 计算实际占用行数
        const lineCount = Math.ceil(effectiveLength / charsPerLine) || 1;
        totalLines += lineCount;
      }
    });
    
    return totalLines;
  };
  
  const estimatedLines = estimateLineCount(cleanContent);
  const maxLines = getEffectiveSettings().maxLines;
  const hasImages = containsImages(cleanContent);
  // 如果包含图片或者行数超过限制，都显示展开按钮
  const shouldShowExpand = hasImages || estimatedLines > maxLines;
  const displayContent = cleanContent;

  // 使用 useCallback 优化 onContentChange 回调
  const handleContentChange = useCallback(async (newContent) => {
      try {
        // 从原始内容中解析心情和天气
        const { mood, weather } = parseContentForMoodAndWeather(note.content);
        
        // 重新构建完整内容：心情 + 天气 + 更新后的内容
        let fullContent = newContent;
        
        // 添加天气（如果存在）
        if (weather) {
          fullContent = moodWeatherConfig.addWeatherToContent(fullContent, weather);
        }
        
        // 添加心情（如果存在）
        if (mood) {
          fullContent = moodWeatherConfig.addMoodToContent(fullContent, mood);
        }
        
        // 保存完整的内容
        await handleSave({ content: fullContent });
      } catch (error) {
        console.error('保存内容变化失败:', error);
      }
  }, [handleSave, note.content]);



  // 获取自定义样式
  const { style: customStyle } = getCardCustomStyle();
  
  // 如果正在编辑，直接显示编辑器
  if (isEditing) {
    // 获取卡片样式配置
    const { style: cardStyle } = getCardCustomStyle();
    const effectiveSettings = getEffectiveSettings();
    
    return (
      <NoteEditor
        note={note}
        onSubmit={handleSave}
        onCancel={handleCancel}
        submitText="保存"
        showCancel={true}
        isEditMode={true}
        onNoteClick={onNoteClick}
        autoFocus={true}
        cardStyle={cardStyle}
        cardSettings={effectiveSettings}
        initialTags={note.tags}
      />
    );
  }
  
  // 视觉连续性：初始隐藏内容，配置就绪后平滑显示
  const getInitialCardStyle = () => {
    const baseStyle = {
      ...customStyle,
      transition: 'opacity 0.3s ease-in-out'
    };
    
    // 如果设置还未加载完成，初始隐藏卡片
    if (!settingsLoaded) {
      baseStyle.opacity = '0';
    } else {
      baseStyle.opacity = '1';
    }
    
    return baseStyle;
  };
  
  const cardStyle = getInitialCardStyle();
  
  // 获取有效的文本颜色，支持分开的颜色设置和透明度
  const getEffectiveTextColor = (type = 'main', opacity = 1) => {
    const settings = getEffectiveSettings();
    let color;
    
    // 根据类型选择对应的颜色
    switch (type) {
      case 'main':
        color = settings.mainTextColor || settings.textColor;
        break;
      case 'secondary':
        color = settings.secondaryTextColor || settings.textColor;
        break;
      case 'link':
        color = settings.linkTextColor || settings.textColor;
        break;
      case 'button':
        color = settings.buttonTextColor || settings.textColor;
        break;
      case 'primary':
        color = settings.mainTextColor || settings.textColor;
        break;
      default:
        color = settings.textColor;
    }
    
    // 如果有自定义颜色设置，使用自定义颜色
    if (color) {
      // 如果是hex颜色，转换为rgba
      if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      return color;
    }
    
    // 回退到CSS变量
    switch (type) {
      case 'secondary':
        return opacity < 1 ? `rgba(var(--theme-text-secondary-rgb), ${opacity})` : 'var(--theme-text-secondary)';
      case 'link':
        // 对于链接类型，使用主题感知的颜色，而不是固定的蓝色
        if (darkMode) {
          // 深色模式下使用较亮的蓝色
          return opacity < 1 ? `rgba(96, 165, 250, ${opacity})` : '#60a5fa';
        } else {
          // 浅色模式下使用较深的蓝色
          return opacity < 1 ? `rgba(37, 99, 235, ${opacity})` : '#2563eb';
        }
      case 'button':
        return opacity < 1 ? `rgba(var(--theme-primary-rgb), ${opacity})` : 'var(--theme-primary)';
      case 'primary':
        return opacity < 1 ? `rgba(var(--theme-primary-rgb), ${opacity})` : 'var(--theme-primary)';
      default:
        return opacity < 1 ? `rgba(var(--theme-text-rgb), ${opacity})` : 'var(--theme-text)';
    }
  };

  return (
    <>
      <div 
        ref={cardRef}
        data-note-id={note.id}
        className={getCardClasses()}
        style={{
          ...cardStyle,
          color: getEffectiveTextColor('main')
        }}
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* 置顶标识条 */}
        {isPinned && (
          <div className="flex items-center mb-3 text-sm font-medium text-yellow-600 dark:text-yellow-400">
            <FiStar className="mr-1 fill-current" size={14} />
            <span>已置顶</span>
          </div>
        )}
        
        {/* 笔记头部 */}
        <div className="flex justify-between items-start mb-4">
          {/* 左上角区域：心情天气 + 标题 */}
          <div className="flex-1">
            {/* 心情和天气显示 */}
            {(parsedMood || parsedWeather) && (
              <div className="flex items-center gap-1 mb-2">
                {parsedMood && (
                  <div
                    className="text-lg px-2 py-1 rounded-md"
                    style={{ 
                      backgroundColor: getEffectiveTextColor('primary', 0.1),
                      color: getEffectiveTextColor('primary', 0.9),
                      border: `1px solid ${getEffectiveTextColor('primary', 0.3)}`
                    }}
                    title={`心情: ${parsedMood.name}`}
                  >
                    <span 
                      className="emoji-button"
                      style={{
                        fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiSymbols, EmojiOne Mozilla, Twemoji Mozilla, Segoe UI Symbol, Noto Emoji',
                        fontVariantEmoji: 'emoji',
                        textRendering: 'optimizeQuality'
                      }}
                    >
                      {parsedMood.emoji}
                    </span>
                  </div>
                )}
                {parsedWeather && (
                  <div
                    className="text-lg px-2 py-1 rounded-md"
                    style={{ 
                      backgroundColor: getEffectiveTextColor('primary', 0.1),
                      color: getEffectiveTextColor('primary', 0.9),
                      border: `1px solid ${getEffectiveTextColor('primary', 0.3)}`
                    }}
                    title={`天气: ${parsedWeather.name}`}
                  >
                    <span 
                      className="emoji-button"
                      style={{
                        fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, EmojiSymbols, EmojiOne Mozilla, Twemoji Mozilla, Segoe UI Symbol, Noto Emoji',
                        fontVariantEmoji: 'emoji',
                        textRendering: 'optimizeQuality'
                      }}
                    >
                      {parsedWeather.emoji}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* 标题 */}
            {note.title && (
              <h3 
                className="text-lg font-semibold mb-2 flex items-center"
                style={{ color: getEffectiveTextColor('main') }}
              >
                {note.title}
              </h3>
            )}
          </div>
          
          {/* 右上角：双向链接指示器 + 三点菜单 */}
          <div className="flex items-center gap-2 ml-4">
            {/* 双向链接指示器 - 改进版本 */}
            {(referencesCount.incoming > 0 || referencesCount.outgoing > 0) && (
              <div className="flex items-center gap-1">
                {/* 被引用指示器 */}
                {referencesCount.incoming > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTriggerPosition({
                        left: rect.left,
                        top: rect.top,
                        bottom: rect.bottom,
                        width: rect.width,
                        height: rect.height
                      });
                      setShowReferencesModal(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors duration-200 relative"
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
                    title={`被 ${referencesCount.incoming} 个笔记引用`}
                  >
                    <FiArrowLeft size={12} />
                    <span className="text-xs font-medium">{referencesCount.incoming}</span>
                  </button>
                )}
                
                {/* 引用其他笔记指示器 */}
                {referencesCount.outgoing > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTriggerPosition({
                        left: rect.left,
                        top: rect.top,
                        bottom: rect.bottom,
                        width: rect.width,
                        height: rect.height
                      });
                      setShowReferencesModal(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors duration-200 relative"
                    style={{ 
                      backgroundColor: getEffectiveTextColor('secondary', 0.1),
                      color: getEffectiveTextColor('secondary', 0.8),
                      border: `1px solid ${getEffectiveTextColor('secondary', 0.3)}`
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = getEffectiveTextColor('secondary', 0.15);
                      e.target.style.color = getEffectiveTextColor('secondary', 1);
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = getEffectiveTextColor('secondary', 0.1);
                      e.target.style.color = getEffectiveTextColor('secondary', 0.8);
                    }}
                    title={`引用了 ${referencesCount.outgoing} 个笔记`}
                  >
                    <FiArrowRight size={12} />
                    <span className="text-xs font-medium">{referencesCount.outgoing}</span>
                  </button>
                )}
              </div>
            )}
            

            
            {/* 三点菜单 */}
              <div className="relative">
                <button
                  ref={menuButtonRef}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu();
                  }}
                  className="p-2 transition-colors duration-200 rounded-md"
                  style={{ 
                    color: getEffectiveTextColor('button', 0.7),
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = getEffectiveTextColor('button', 1);
                    e.target.style.backgroundColor = 'var(--theme-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = getEffectiveTextColor('button', 0.7);
                    e.target.style.backgroundColor = 'transparent';
                  }}
                  title="更多操作"
                >
                  <FiMoreVertical size={16} />
                </button>
              </div>
          </div>
        </div>

        {/* 笔记内容 */}
        {cleanContent && (
          <div className="mb-4">
            <div 
              className="note-content-container"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: isExpanded ? 'none' : getEffectiveSettings().maxLines,
                WebkitBoxOrient: 'vertical',
                overflow: isExpanded ? 'visible' : 'hidden',
                lineHeight: '1.6',
                maxHeight: isExpanded ? 'none' : `${getEffectiveSettings().maxLines * 1.6}em`,
                minHeight: isExpanded ? 'auto' : `${Math.min(getEffectiveSettings().maxLines, 3) * 1.6}em`,
                transition: 'max-height 0.3s ease-out, min-height 0.3s ease-out'
              }}
            >
              <MarkdownRenderer 
                content={displayContent}
                className="note-content"
                editable={true}
                onContentChange={handleContentChange}
                onNoteClick={onNoteClick}
                notes={notes}
                textColors={{
                  main: getEffectiveTextColor('main'),
                  secondary: getEffectiveTextColor('secondary'),
                  link: getEffectiveTextColor('link'),
                  button: getEffectiveTextColor('button'),
                  reference: getEffectiveSettings().referenceTextColor || getEffectiveSettings().linkTextColor || getEffectiveSettings().textColor
                }}
              />
            </div>
            
            {/* 展开/收起按钮 */}
            {shouldShowExpand && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-sm hover:underline transition-colors duration-200 focus:outline-none focus:ring-0"
                style={{ 
                  color: getEffectiveTextColor('link', 0.8)
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = getEffectiveTextColor('link', 1);
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = getEffectiveTextColor('link', 0.8);
                }}
              >
                {isExpanded ? '收起' : '展开'}
              </button>
            )}
            

          </div>
        )}



        {/* 底部区域：标签和日期 */}
        <div className="mt-10">
          {/* 标签区域 - 右对齐 */}
          {tags.length > 0 && (
            <div className="flex items-center justify-end flex-wrap gap-2 mb-3">
              <FiTag style={{ color: getEffectiveTextColor('secondary', 0.7) }} size={14} />
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className={`inline-block text-xs px-2 py-1 rounded-full ${getTagColorFromState(tag)}`}
                  style={getTagStyleFromState(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {/* 相对时间显示 - 右对齐，更下面 */}
          <div className="flex justify-end">
            <div
              className="text-xs cursor-pointer transition-colors select-none"
              style={{ color: getEffectiveTextColor('secondary', 0.6) }}
              onClick={() => setShowFullDate(!showFullDate)}
              onMouseEnter={(e) => {
                setShowFullDate(true);
                e.target.style.color = getEffectiveTextColor('secondary', 0.8);
              }}
              onMouseLeave={(e) => {
                setShowFullDate(false);
                e.target.style.color = getEffectiveTextColor('secondary', 0.6);
              }}
              title={showFullDate ? formatRelativeTime(getDisplayTime()) : formatFullDate(getDisplayTime())}
            >
              <span>
                {showFullDate ? formatFullDate(getDisplayTime()) : formatRelativeTime(getDisplayTime())}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 三点菜单 */}
      {showMenu && createPortal(
        <div 
          ref={menuRef}
          className="fixed w-menu-width rounded-none shadow-lg z-[10001]"
          style={{ 
            backgroundColor: 'var(--theme-elevated)',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <button
            onClick={(e) => {
              handlePin(e);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center rounded-none transition-colors duration-150 hover:translate-x-1"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiStar className={`mr-2 transition-all duration-150 ${isPinned ? 'text-yellow-500 fill-current' : ''}`} size={14} />
            {isPinned ? '取消置顶' : '置顶'}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEditDirect();
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center transition-colors duration-150 hover:translate-x-1"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiEdit2 className="mr-2 transition-all duration-150" size={14} />
            编辑
          </button>
          <button
            onClick={() => {
              setShowCustomizer(true);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center transition-colors duration-150 hover:translate-x-1"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiSettings className="mr-2 transition-all duration-150" size={14} />
            个性化设置
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewHistory();
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center transition-colors duration-150 hover:translate-x-1"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiClock className="mr-2 transition-all duration-150" size={14} />
            历史记录
          </button>

          <button
            onClick={(e) => {
              handleDelete(e);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center rounded-none transition-colors duration-150 hover:translate-x-1"
            style={{ color: darkMode ? '#ef4444' : '#dc2626' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiTrash2 className="mr-2 transition-all duration-150" size={14} />
            删除
          </button>
        </div>,
        document.body
      )}

      {/* 右键菜单 */}
      {showContextMenu && createPortal(
        <div 
          className="fixed w-menu-width rounded-none shadow-lg z-[10001]"
          style={{ 
            backgroundColor: 'var(--theme-elevated)',
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
          }}
        >
          <button
            onClick={(e) => {
              handlePin(e);
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center rounded-t-md transition-colors duration-150 hover:translate-x-1"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiStar className={`mr-2 transition-all duration-150 ${isPinned ? 'text-yellow-500 fill-current' : ''}`} size={14} />
            {isPinned ? '取消置顶' : '置顶'}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEditDirect();
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center transition-colors duration-150 hover:translate-x-1"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiEdit2 className="mr-2 transition-all duration-150" size={14} />
            编辑
          </button>
          <button
            onClick={() => {
              setShowCustomizer(true);
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center transition-colors duration-150 hover:translate-x-1"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiSettings className="mr-2 transition-all duration-150" size={14} />
            个性化设置
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewHistory();
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center transition-colors duration-150 hover:translate-x-1"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiClock className="mr-2 transition-all duration-150" size={14} />
            历史记录
          </button>

          <button
            onClick={(e) => {
              handleDelete(e);
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center rounded-b-md transition-colors duration-150 hover:translate-x-1"
            style={{ color: darkMode ? '#ef4444' : '#dc2626' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FiTrash2 className="mr-2 transition-all duration-150" size={14} />
            删除
          </button>
        </div>,
        document.body
      )}

      {/* 个性化设置组件 */}
      <CardCustomizer
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        noteId={note.id}
        currentSettings={getEffectiveSettings()}
        onApply={handleApplySettings}
        onApplyToAll={handleApplyToAll}
        onResetThisCard={handleResetThisCard}
        onResetAllToDefault={handleResetAllToDefault}
      />

      {/* 自定义确认弹窗 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
        type={confirmDialog.type}
      />

      {/* 双向链接引用关系模态框 */}
      <ReferencesModal
        isOpen={showReferencesModal}
        onClose={() => {
          setShowReferencesModal(false);
          setTriggerPosition(null);
        }}
        noteId={note.id}
        noteTitle={note.title}
        onNoteClick={onNoteClick}
        triggerPosition={triggerPosition}
      />

      {/* 笔记历史记录模态框 */}
      <NoteHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setNoteHistory([]);
        }}
        noteId={note.id}
        noteTitle={note.title}
        noteContent={note.content}
        noteTags={note.tags}
        history={noteHistory}
        onNoteClick={onNoteClick}
      />

    </>
  );
};

export default NoteCard;