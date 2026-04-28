import React, { useState, useRef, useEffect, startTransition } from 'react';
import { FiCalendar, FiX, FiUpload, FiLink, FiSend, FiImage, FiTag, FiSmile, FiHeart, FiCloud, FiEdit3, FiCheckSquare, FiClock, FiPlus } from 'react-icons/fi';
import { format, toZonedTime } from 'date-fns-tz';
import { uploadImage, fetchAllTags, fetchTagColors, fetchMyNotesWithPagination, processBidirectionalLinks } from '../api/notesApi';
import { getAllColors, getTagColorClass, getTagStyle } from '../utils/tagColorUtils';
import { commonColors, getDefaultColor } from '../utils/commonColors';
import CustomDatePicker from './CustomDatePicker';
import EmojiPicker from './EmojiPicker';
import MoodSelector from './MoodSelector';
import WeatherSelector from './WeatherSelector';
import EditToolbar from './EditToolbar';
import TimeEditor from './TimeEditor';
import InputDialog from './InputDialog';
import NoteReferenceSelector from './NoteReferenceSelector';
import TagPicker from './TagPicker';
import { useTheme } from '../hooks/useTheme';
import localConfigManager from '../utils/localConfigManager';

import { createAutoBackup } from '../utils/autoBackup';
import { moodWeatherConfig } from '../config/moodWeatherConfig';

const NoteEditor = ({ 
  initialContent = '', 
  initialTags = [], 
  initialDate = null,
  note = null,
  onSubmit, 
  onCancel, 
  submitText = '发布',
  showCancel = false,
  isEditMode = false,
  onNoteClick = null,
  autoFocus = false,
  cardStyle = null,
  cardSettings = null,
  overrideWidth = null
}) => {
  // 如果传入了note对象，优先使用note的数据
  const getInitialContent = () => {
    if (note) return note.content || '';
    return initialContent || '';
  };
  
  const getInitialTags = () => {
    if (note && Array.isArray(note.tags) && note.tags.length > 0) {
      // 如果note.tags是字符串数组，直接返回
      if (typeof note.tags[0] === 'string') {
        return note.tags;
      }
      // 如果note.tags是对象数组，提取name属性
      if (note.tags[0] && note.tags[0].name) {
        return note.tags.map(tag => tag.name);
      }
    }
    return initialTags || [];
  };
  
  const getInitialDate = () => {
    if (note && note.created_at) {
      return new Date(note.created_at);
    }
    return initialDate || new Date();
  };

  const [content, setContent] = useState(getInitialContent());
  const [selectedTags, setSelectedTags] = useState(getInitialTags());
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [currentTime, setCurrentTime] = useState(new Date()); // 实时时间状态
  const [isExpanded, setIsExpanded] = useState(true); // 始终保持展开状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [failedUploadFile, setFailedUploadFile] = useState(null); // 保存上传失败的文件用于重试

  const allColors = [...commonColors];
  const [tagColorMap, setTagColorMap] = useState(() => {
    try {
      const saved = localStorage.getItem('tagColors');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [colorDataLoaded, setColorDataLoaded] = useState(false);

  const fileInputRef = useRef(null);



  const referenceButtonRef = useRef(null);
  const debounceTimerRef = useRef(null);
  
  // 新组件的状态管理
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showWeatherSelector, setShowWeatherSelector] = useState(false);
  const [showEditToolbar, setShowEditToolbar] = useState(false);
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  
  // 当前选中的心情和天气
  const [currentMood, setCurrentMood] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  
  const textareaRef = useRef(null);
  const editorRef = useRef(null); // 编辑器容器的引用
  
  // 输入对话框状态
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputDialogConfig, setInputDialogConfig] = useState({
    title: '',
    placeholder: '',
    onConfirm: null
  });
  const [showReferenceSelector, setShowReferenceSelector] = useState(false);
  
  // 按钮的 ref
  const emojiButtonRef = useRef(null);
  const moodButtonRef = useRef(null);
  const weatherButtonRef = useRef(null);
  const editButtonRef = useRef(null);
  const timeButtonRef = useRef(null);
  const tagButtonRef = useRef(null);



  // 加载颜色数据
  const loadColors = async () => {
    try {

      
      // allColors已从commonColors初始化，无需再设置
      // const colors = await getAllColors();
      // setAllColors(colors);
      
      // 优先使用localConfigManager获取颜色数据，确保与TagPicker同步
      try {
        const configColors = localConfigManager.getTagColors();

        
        if (Object.keys(configColors).length > 0) {
          setTagColorMap(configColors);

        } else {
          
          
          // 回退到本地存储
          const localColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
          if (Object.keys(localColors).length > 0) {
            setTagColorMap(localColors);

          }
        }
      } catch (configError) {
        console.error('从localConfigManager加载颜色失败，回退到localStorage:', configError);
        
        // 回退到本地存储
        try {
          const localColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
          if (Object.keys(localColors).length > 0) {
            setTagColorMap(localColors);

          }
        } catch (localError) {
          console.error('从本地存储加载颜色也失败:', localError);
        }
      }
      
      // 异步尝试从服务器获取颜色数据，但不阻塞本地加载
      try {
        const serverColors = await fetchTagColors();

        
        // 合并服务器数据，本地数据优先
        setTagColorMap(prev => {
          const mergedMap = { ...serverColors, ...prev };
          
          // 如果服务器有新数据，更新本地存储和localConfigManager
          if (Object.keys(serverColors).length > 0) {
            localStorage.setItem('tagColors', JSON.stringify(mergedMap));
            // 尝试更新localConfigManager
            try {
              Object.entries(serverColors).forEach(([tagName, color]) => {
                localConfigManager.setTagColor(tagName, color);
              });

            } catch (configUpdateError) {
              console.error('更新localConfigManager失败:', configUpdateError);

            }
          }
          
          return mergedMap;
        });
      } catch (serverError) {
        console.log('从服务器获取标签颜色失败，使用本地数据:', serverError);
        // 本地数据已经加载，无需额外处理
      }
      
      setColorDataLoaded(true);

    } catch (error) {
      console.error('加载颜色数据失败:', error);
      setColorDataLoaded(true);
    }
  };



  // 组件挂载时加载颜色数据
  useEffect(() => {
    loadColors();
  }, []);



  // 实时更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 每秒更新一次

    return () => {
      clearInterval(timer);
    };
  }, []);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 解析内容中的心情和天气
  const parseContentForMoodAndWeather = (content) => {
    return moodWeatherConfig.parseContentForMoodAndWeather(content);
  };

  // 使用ref追踪note的id，只在note id变化时重置编辑器状态
  // 避免同一个note的对象引用变化（如父组件状态更新）导致标签等本地编辑状态被覆盖
  const prevNoteIdRef = useRef(null);
  
  useEffect(() => {
    if (note) {
      // 只在note id变化时才重置编辑器状态（如切换编辑不同的笔记）
      // 同一个note的属性更新不应覆盖用户正在编辑的本地状态
      if (prevNoteIdRef.current === note.id) {
        return;
      }
      prevNoteIdRef.current = note.id;
      
      const noteContent = note.content || '';
      setContent(noteContent);
      
      // 解析内容中的心情和天气
      const { mood, weather } = parseContentForMoodAndWeather(noteContent);
      setCurrentMood(mood);
      setCurrentWeather(weather);
      
      // 处理标签数据
      let noteTagNames = [];
      if (Array.isArray(note.tags) && note.tags.length > 0) {
        if (typeof note.tags[0] === 'string') {
          noteTagNames = note.tags;
        } else if (note.tags[0] && note.tags[0].name) {
          noteTagNames = note.tags.map(tag => tag.name);
        }
      }
      setSelectedTags(noteTagNames);
      
      // 处理日期
      if (note.created_at) {
        setSelectedDate(new Date(note.created_at));
      }
    }
  }, [note]);

  // 监听标签颜色更新事件
  useEffect(() => {
    const handleTagColorsUpdated = async (event) => {
      const { tagName, color } = event.detail || {};
      
      if (tagName && color) {
        console.log('🎨 NoteEditor收到颜色更新事件:', { tagName, color });
        
        // 优先使用事件中的颜色数据更新本地状态
        setTagColorMap(prev => {
          const updatedMap = {
            ...prev,
            [tagName]: color
          };
          
          // 立即更新本地存储
          try {
            localStorage.setItem('tagColors', JSON.stringify(updatedMap));
            console.log('🎨 NoteEditor更新本地存储颜色:', { tagName, color });
          } catch (error) {
            console.error('更新本地存储失败:', error);
          }
          
          // 同时更新localConfigManager，确保与TagPicker同步
          try {
            localConfigManager.setTagColor(tagName, color);
            console.log('🎨 NoteEditor更新localConfigManager颜色:', { tagName, color });
          } catch (configError) {
            console.error('更新localConfigManager失败:', configError);
          }
          
          return updatedMap;
        });
        
        // 异步尝试从服务器同步数据，但不阻塞UI更新
        try {
          const { fetchTagColors } = await import('../api/notesApi.js');
          const serverColors = await fetchTagColors();
          
          // 合并服务器数据，保持本地更新的优先级
          setTagColorMap(prev => {
            const mergedMap = { ...serverColors, ...prev };
            localStorage.setItem('tagColors', JSON.stringify(mergedMap));
            return mergedMap;
          });
        } catch (error) {
          console.log('服务器同步失败，使用本地数据:', error);
        }
      } else {
        // 如果没有具体的标签信息，尝试从本地存储重新加载
        try {
          const localColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
          setTagColorMap(localColors);
          console.log('🎨 NoteEditor从本地存储重新加载颜色数据');
        } catch (error) {
          console.error('从本地存储加载颜色失败:', error);
        }
      }
    };

    window.addEventListener('tagColorsUpdated', handleTagColorsUpdated);
    return () => {
      window.removeEventListener('tagColorsUpdated', handleTagColorsUpdated);
    };
  }, []);



  // 监听颜色数据加载完成和标签数据，确保标签颜色正确显示
  useEffect(() => {
    if (colorDataLoaded && Array.isArray(selectedTags) && selectedTags.length > 0) {
      console.log('🎨 NoteEditor颜色数据和标签都已加载，检查标签颜色:');
      selectedTags.forEach(tagName => {
        const colorValue = tagColorMap[tagName];
        console.log(`🎨 标签 ${tagName} 的颜色值:`, colorValue);
      });
    }
  }, [colorDataLoaded, selectedTags, tagColorMap]);

  // 监听标签更新事件（创建/删除）
  useEffect(() => {
    const handleTagsUpdated = (event) => {
      const { action, tagName } = event.detail || {};
      
      if (action === 'delete' && tagName) {
        // 如果删除的标签在当前已选标签中，则移除它
        setSelectedTags(prevTags => {
          if (!Array.isArray(prevTags)) return [];
          const updatedTags = prevTags.filter(tag => {
            const currentTagName = typeof tag === 'string' ? tag : tag.name;
            return currentTagName !== tagName;
          });
          return updatedTags;
        });
      }
    };

    window.addEventListener('tagsUpdated', handleTagsUpdated);
    return () => {
      window.removeEventListener('tagsUpdated', handleTagsUpdated);
    };
  }, []);

  // 监nfrom当前笔记中移除标签事件
  useEffect(() => {
    const handleRemoveTagFromNote = (event) => {
      const { tagName } = event.detail || {};
      
      if (tagName) {
        // 从当前笔记的已选标签中移除指定标签
        handleRemoveTag(tagName);
        console.log('已从当前笔记中移除标签:', tagName);
      }
    };

    window.addEventListener('removeTagFromNote', handleRemoveTagFromNote);
    return () => {
      window.removeEventListener('removeTagFromNote', handleRemoveTagFromNote);
    };
  }, []);

  // 监听内容变化，同步更新心情和天气状态
  useEffect(() => {
    const { mood, weather } = parseContentForMoodAndWeather(content);
    setCurrentMood(mood);
    setCurrentWeather(weather);
  }, [content]);

  // 自动聚焦功能
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      // 延迟聚焦，确保组件已完全渲染
      setTimeout(() => {
        textareaRef.current?.focus();
        // 将光标移到内容末尾
        const length = textareaRef.current?.value?.length || 0;
        textareaRef.current?.setSelectionRange(length, length);
      }, 100);
    }
  }, [autoFocus]);

  // 点击外部关闭编辑器功能已禁用
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     // 如果点击的是编辑器外部，且不是在弹出组件内，则关闭编辑器
  //     if (editorRef.current && !editorRef.current.contains(event.target)) {
  //       // 检查是否点击在弹出组件内（如日期选择器、标签选择器等）
  //       const isClickInPopup = event.target.closest('.react-datepicker-popper') ||
  //                             event.target.closest('.emoji-picker') ||
  //                             event.target.closest('.mood-selector') ||
  //                             event.target.closest('.weather-selector') ||
  //                             event.target.closest('.edit-toolbar') ||
  //                             event.target.closest('.time-editor') ||
  //                             event.target.closest('.tag-picker') ||
  //                             event.target.closest('.note-reference-selector') ||
  //                             event.target.closest('.input-dialog') ||
  //                             event.target.closest('[data-portal]') ||
  //                             event.target.closest('[role="dialog"]') ||
  //                             event.target.closest('.card-customizer') ||
  //                             event.target.closest('.portal-popup') ||
  //                             event.target.closest('.confirm-dialog') ||
  //                             event.target.closest('.references-modal') ||
  //                             // 检查是否点击在任何固定定位的弹出层内
  //                             (event.target.closest('[style*="position: fixed"]') && 
  //                              event.target.closest('[style*="z-index"]'));
  //       
  //       if (!isClickInPopup && onCancel) {
  //         onCancel();
  //       }
  //     }
  //   };

  //   // 只在编辑模式下添加点击外部关闭功能
  //   if (isEditMode) {
  //     document.addEventListener('click', handleClickOutside);
  //     return () => {
  //       document.removeEventListener('click', handleClickOutside);
  //     };
  //   }
  // }, [isEditMode, onCancel]);

  // 从状态中获取标签颜色类名
  const getTagColorFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 无论是否有颜色映射，都统一返回白色文字样式
    // 背景色通过getTagStyleFromState函数的内联样式设置
    return 'text-white border border-theme-border';
  };

  // 从状态中获取标签样式
  const getTagStyleFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    

    
    // 如果没有颜色映射，使用默认灰色（与TagManager一致）
    if (!colorValue) {
        return {
        backgroundColor: '#9CA3AF',
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
    
    // 预设颜色，需要从allColors中查找对应的十六进制值
    const presetColor = allColors.find(c => c.value === colorValue);
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

  // 处理心情选择
  const handleMoodSelect = (newMood) => {
    const newContent = moodWeatherConfig.addMoodToContent(content, newMood);
    setContent(newContent);
    setCurrentMood(newMood); // 同时更新心情状态
    setShowMoodSelector(false);
  };

  // 处理天气选择
  const handleWeatherSelect = (newWeather) => {
    const newContent = moodWeatherConfig.addWeatherToContent(content, newWeather);
    setContent(newContent);
    setCurrentWeather(newWeather); // 同时更新天气状态
    setShowWeatherSelector(false);
  };

  // 处理提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[NoteEditor] handleSubmit 被调用，内容:', content);
    if (!content.trim()) return;
    
    const tagNames = Array.isArray(selectedTags) ? selectedTags : []; // 确保是数组
    
    try {
      const result = await onSubmit({
        content,
        tags: tagNames,
        created_at: selectedDate.toISOString()
      });
      
      // 处理双向链接（创建或更新笔记时都处理）
      if (result && result.id) {
        try {
          console.log('[双向链接] 开始处理双向链接，笔记ID:', result.id);
          console.log('[双向链接] 笔记内容:', content);
          
          // 处理双向链接关系（基于 [[wiki-link]] 语法）
          const bidirectionalResult = await processBidirectionalLinks(result.id, content);
          
          console.log('[双向链接] 双向链接处理完成:', bidirectionalResult);
          
          // 如果成功处理了引用，触发引用数据的重新加载
          if (bidirectionalResult.success && bidirectionalResult.affectedNoteIds) {
            console.log('[双向链接] 触发受影响笔记的引用数据更新:', bidirectionalResult.affectedNoteIds);
            
            // 导入全局事件管理器
            const { default: globalEvents, GLOBAL_EVENTS } = await import('../utils/globalEvents');
            
            // 为每个受影响的笔记触发引用关系更新事件
            bidirectionalResult.affectedNoteIds.forEach(noteId => {
              console.log(`[双向链接] 触发笔记${noteId}的引用关系更新事件`);
              globalEvents.emit(GLOBAL_EVENTS.NOTE_REFERENCES_UPDATED, { noteId });
            });
          }
        } catch (error) {
          console.warn('[双向链接] 处理双向链接失败:', error);
        }
      }
        
        // 创建自动备份（如果是编辑模式且有笔记ID）
      if (isEditMode && result && result.id) {
        try {
          await createAutoBackup({
            id: result.id,
            content,
            tags: tagNames,
            created_at: selectedDate.toISOString()
          });
        } catch (backupError) {
          console.warn('自动备份失败:', backupError);
          // 备份失败不影响主要功能
        }
      }
      
      // 如果不是编辑模式，重置表单
      if (!isEditMode) {
        setContent('');
        setSelectedTags([]);
        setSelectedDate(new Date());
        setIsExpanded(false);
      }
      
      return result;
    } catch (error) {
      console.error('提交失败:', error);
      throw error;
    }
  };

  // 处理取消 - 现在只用于重置内容，不收起发布框
  const handleCancel = () => {
    // 立即响应用户操作
    if (onCancel) {
      onCancel();
      return;
    }
    
    // 异步处理状态重置，不阻塞UI
    setTimeout(() => {
      startTransition(() => {
        // 如果是编辑模式且有原始笔记数据，恢复到原始内容
        if (isEditMode && note) {
          setContent(note.content || '');
          
          // 恢复原始标签（确保字符串数组格式）
          if (Array.isArray(note.tags) && note.tags.length > 0) {
            if (typeof note.tags[0] === 'string') {
              setSelectedTags(note.tags);
            } else if (note.tags[0] && note.tags[0].name) {
              setSelectedTags(note.tags.map(tag => tag.name));
            } else {
              setSelectedTags([]);
            }
          } else {
            setSelectedTags([]);
          }
          
          // 恢复原始日期
          if (note.created_at) {
            setSelectedDate(new Date(note.created_at));
          } else {
            setSelectedDate(new Date());
          }
          
          // 恢复原始心情和天气
          const { mood, weather } = parseContentForMoodAndWeather(note.content || '');
          setCurrentMood(mood);
          setCurrentWeather(weather);
        } else {
          // 如果不是编辑模式，重置所有状态到默认值
          setContent('');
          setSelectedTags([]);
          setSelectedDate(new Date());
          setCurrentMood(null);
          setCurrentWeather(null);
        }
        
        // 同时关闭所有弹出组件
        setShowEmojiPicker(false);
        setShowMoodSelector(false);
        setShowWeatherSelector(false);
        setShowEditToolbar(false);
        setShowTimeEditor(false);
        setShowReferenceSelector(false);
      });
    }, 0); // 立即异步执行，不阻塞当前渲染
  };

  // 移除标签
  const handleRemoveTag = (tagToRemove) => {
    // 确保selectedTags是数组后再进行过滤
    setSelectedTags(Array.isArray(selectedTags) ? selectedTags.filter(tag => tag !== tagToRemove) : []);
  };

  // 工具栏功能函数
  const insertTaskList = () => {
    const taskText = '\n- [ ] 新任务\n';
    setContent(prev => prev + taskText);
  };

  const insertReference = () => {
    setShowReferenceSelector(true);
  };

  // 用于存储已处理的引用，避免重复处理
  const [processedReferences, setProcessedReferences] = useState(new Set());
  
  // 简单的内容变化处理
  const handleContentChange = (newContent) => {
    setContent(newContent);
  };

  // 处理笔记引用选择 - 使用 [[noteId|noteTitle]] wiki-link 格式
  const handleNoteReference = async (selectedNote) => {
    const noteTitle = getNoteTitle(selectedNote.content);
    // 使用 wiki-link 格式：[[noteId|displayText]]
    const referenceText = `[[${selectedNote.id}|${noteTitle}]]`;
    
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newContent = content.substring(0, start) + referenceText + content.substring(end);
      setContent(newContent);
      
      // 设置光标位置到插入内容之后
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + referenceText.length, start + referenceText.length);
      }, 0);
    } else {
      setContent(prev => prev + referenceText);
    }
    
    // 引用已插入，立即处理双向链接
    if (isEditMode && note) {
      try {
        const bidirectionalResult = await processBidirectionalLinks(note.id, content + referenceText);
        if (bidirectionalResult.success) {
          const { default: globalEvents, GLOBAL_EVENTS } = await import('../utils/globalEvents');
          globalEvents.emit(GLOBAL_EVENTS.NOTE_REFERENCES_UPDATED, { noteId: note.id });
        }
      } catch (error) {
        console.warn('[双向链接] 插入引用后处理双向链接失败:', error);
      }
    }
    
    // 关闭引用选择器
    setShowReferenceSelector(false);
  };

  // 获取笔记标题的辅助函数（排除心情和天气标记）
  const getNoteTitle = (content) => {
    // 先移除心情和天气标记
    const cleanContent = moodWeatherConfig.removeAllMoodAndWeather(content);
    const lines = cleanContent.split('\n');
    const firstLine = lines[0]?.trim();
    
    // 如果第一行是标题格式
    if (firstLine?.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '');
    }
    
    // 如果是任务列表格式，保留任务内容作为标题
    if (firstLine?.match(/^[-*+]\s+/)) {
      const taskContent = firstLine.replace(/^[-*+]\s+/, '').trim();
      return taskContent?.length > 50 ? taskContent.substring(0, 50) + '...' : taskContent || '无标题';
    }
    
    // 否则取前50个字符作为标题，但不要移除太多字符
    const plainText = firstLine?.replace(/[#*`_~\[\]()]/g, '').trim();
    return plainText?.length > 50 ? plainText.substring(0, 50) + '...' : plainText || '无标题';
  };

  // 关闭所有弹出组件
  const closeAllPopups = () => {
    // 使用startTransition来批量处理状态更新，减少重新渲染次数
    startTransition(() => {
      setShowTagPicker(false);
      setShowEmojiPicker(false);
      setShowMoodSelector(false);
      setShowWeatherSelector(false);
      setShowEditToolbar(false);
      setShowTimeEditor(false);
      setShowReferenceSelector(false);
    });
  };

  // 处理表情选择
  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + emoji + content.substring(end);
      setContent(newContent);
      
      // 设置光标位置到插入内容之后
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  // 扁平化标签树（用于兼容现有的标签状态）
  const flattenTags = (tags) => {
    return tags.map(tag => tag.name);
  };

  // 处理TagPicker标签选择
  const handleTagPickerSelect = (tags) => {
    // 确保selectedTags始终保持字符串数组格式
    const tagNames = tags.map(tag => typeof tag === 'string' ? tag : tag.name);
    
    // 只更新本地状态，与创建模式行为一致，不触发自动保存
    // 保存将在用户点击保存按钮时统一执行
    setSelectedTags(tagNames);
  };



  // 处理格式选择
  const handleFormatSelect = (newContent, cursorPos) => {
    setContent(newContent);
    
    // 设置光标位置
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  // 处理按钮点击，确保只显示一个弹出组件
  const handleButtonClick = (buttonType, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    switch (buttonType) {
      case 'tag':
        // 标签选择器像文本格式工具栏一样，点击切换显示状态
        if (showTagPicker) {
          setShowTagPicker(false);
        } else {
          closeAllPopups();
          setShowTagPicker(true);
        }
        break;
      case 'edit':
        // 文本格式工具栏，点击切换显示状态
        if (showEditToolbar) {
          setShowEditToolbar(false);
        } else {
          closeAllPopups();
          setShowEditToolbar(true);
        }
        break;
      case 'emoji':
        closeAllPopups();
        setShowEmojiPicker(true);
        break;
      case 'mood':
        closeAllPopups();
        setShowMoodSelector(true);
        break;
      case 'weather':
        closeAllPopups();
        setShowWeatherSelector(true);
        break;
      case 'time':
        closeAllPopups();
        setShowTimeEditor(true);
        break;
      case 'reference':
        closeAllPopups();
        setShowReferenceSelector(true);
        break;
      default:
        break;
    }
  };

  // 处理图片上传
  const handleImageUpload = async (e, isRetry = false, retryFile = null) => {
    const files = isRetry ? [retryFile] : e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validImageTypes.includes(file.type)) {
      setUploadError('请选择有效的图片格式 (JPEG, PNG, GIF, WebP)');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError('');
      setFailedUploadFile(null); // 清除失败的文件
      const result = await uploadImage(file);
      const imageMarkdown = `![${file.name}](${result.url})\n`;
      setContent(prev => prev + imageMarkdown);
    } catch (error) {
      console.error('图片上传失败:', error);
      setUploadError('图片上传失败');
      setFailedUploadFile(file); // 保存失败的文件用于重试
    } finally {
      setIsUploading(false);
    }
  };

  // 手动重试上传
  const handleRetryUpload = () => {
    if (failedUploadFile) {
      handleImageUpload(null, true, failedUploadFile);
    }
  };

  // HTML转Markdown的辅助函数
  const htmlToMarkdown = (html) => {
    // 创建临时DOM元素来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 递归处理节点
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        const children = Array.from(node.childNodes).map(processNode).join('');
        
        switch (tagName) {
          case 'h1': return `# ${children}\n\n`;
          case 'h2': return `## ${children}\n\n`;
          case 'h3': return `### ${children}\n\n`;
          case 'h4': return `#### ${children}\n\n`;
          case 'h5': return `##### ${children}\n\n`;
          case 'h6': return `###### ${children}\n\n`;
          case 'p': return `${children}\n\n`;
          case 'br': return '\n';
          case 'strong':
          case 'b': return `**${children}**`;
          case 'em':
          case 'i': return `*${children}*`;
          case 'u': return `<u>${children}</u>`;
          case 's':
          case 'strike':
          case 'del': return `~~${children}~~`;
          case 'code': return `\`${children}\``;
          case 'pre': return `\`\`\`\n${children}\n\`\`\`\n\n`;
          case 'blockquote': return `> ${children}\n\n`;
          case 'ul': return `${children}\n`;
          case 'ol': return `${children}\n`;
          case 'li': 
            const parent = node.parentElement;
            const isOrdered = parent && parent.tagName.toLowerCase() === 'ol';
            const prefix = isOrdered ? '1. ' : '- ';
            return `${prefix}${children}\n`;
          case 'a':
            const href = node.getAttribute('href');
            return href ? `[${children}](${href})` : children;
          case 'img':
            const src = node.getAttribute('src');
            const alt = node.getAttribute('alt') || '图片';
            return src ? `![${alt}](${src})` : '';
          case 'table': return `${children}\n`;
          case 'tr': return `${children}\n`;
          case 'td':
          case 'th': return `| ${children} `;
          case 'div':
          case 'span': return children;
          default: return children;
        }
      }
      
      return '';
    };
    
    let markdown = processNode(tempDiv);
    
    // 清理多余的换行
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.trim();
    
    return markdown;
  };

  // 处理粘贴事件
  const handlePaste = async (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    let hasImage = false;
    let hasHtml = false;
    
    // 首先检查是否有图片
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        hasImage = true;
        break;
      }
      if (item.type === 'text/html') {
        hasHtml = true;
      }
    }

    // 处理图片粘贴
    if (hasImage) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          
          const file = item.getAsFile();
          if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
              setUploadError('不支持的图片格式。请使用 JPEG、PNG、GIF 或 WebP 格式。');
              return;
            }
            
            try {
              setIsUploading(true);
              setUploadError('');
              
              const result = await uploadImage(file);
              
              const textarea = e.target;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const imageMarkdown = `![图片](${result.url})`;
              
              const newContent = content.substring(0, start) + imageMarkdown + content.substring(end);
              setContent(newContent);
              
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
              }, 0);
              
            } catch (error) {
              console.error('图片上传失败:', error);
              setUploadError('图片上传失败，请重试');
            } finally {
              setIsUploading(false);
            }
          }
          return;
        }
      }
    }

    // 处理富文本粘贴
    if (hasHtml) {
      e.preventDefault();
      
      try {
        const htmlData = clipboardData.getData('text/html');
        if (htmlData) {
          const markdown = htmlToMarkdown(htmlData);
          
          const textarea = e.target;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          
          const newContent = content.substring(0, start) + markdown + content.substring(end);
          setContent(newContent);
          
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + markdown.length, start + markdown.length);
          }, 0);
          
          return;
        }
      } catch (error) {
        console.error('富文本粘贴失败:', error);
        // 如果富文本处理失败，回退到普通文本粘贴
      }
    }

    // 处理普通文本粘贴（默认行为）
    // 不阻止默认行为，让浏览器处理普通文本粘贴
  };

  // 获取编辑器背景色 - 直接同步卡片背景色
  const getEditorBackgroundColor = () => {
    // 如果有卡片设置的背景色，直接使用
    if (cardSettings?.backgroundColor) {
      return cardSettings.backgroundColor;
    }
    
    // 硬编码主题颜色
    const backgroundColor = isDarkMode ? '#1F2937' : '#e2e8f0';
    

    
    return backgroundColor;
  };

  // 获取编辑器CSS类名
  const getEditorClassName = () => {
    return 'note-editor-custom-bg';
  };

  // 获取编辑器文本颜色 - 使用卡片文本色或主题文本色
  const getEditorTextColor = () => {
    // 如果有卡片文本颜色设置，使用它
    if (cardSettings?.textColor) {
      return cardSettings.textColor;
    }
    
    // 硬编码主题文本颜色
    return isDarkMode ? '#e2e8f0' : '#1F2937';
  };

  // 获取主题边框颜色
  const computedStyle = getComputedStyle(document.documentElement);
  const borderColor = computedStyle.getPropertyValue('--theme-border').trim() || '#e5e7eb';

  // 获取编辑器样式
  // 获取编辑器样式
  const getEditorStyle = () => {
    
    if (cardStyle && cardSettings) {
      // 使用传入的卡片样式，但背景色使用智能逻辑
      return {
        ...cardStyle,
        backgroundColor: getEditorBackgroundColor() + ' !important',
        padding: '1rem'
      };
    }
    
    // 默认样式，也使用智能背景色，移除边框
    return {
      backgroundColor: getEditorBackgroundColor() + ' !important', 
      borderRadius: `${cardSettings?.borderRadius || 8}px`,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: '1rem'
    };
  };

  // 获取编辑器宽度类名
  const getEditorWidthClass = () => {
    // 如果有overrideWidth属性，优先使用它
    if (overrideWidth) {
      return overrideWidth;
    }
    
    try {
      const preferences = localConfigManager.getUserPreferences();
      const cardWidth = preferences.cardWidth || '70%';
      
      switch (cardWidth) {
        case '50%':
          return 'w-1/2';
        case '60%':
          return 'w-3/5';
        case '70%':
          return 'w-[70%]';
        case '80%':
          return 'w-4/5';
        case '90%':
          return 'w-[90%]';
        case '100%':
          return 'w-full';
        default:
          return 'w-[70%]';
      }
    } catch (error) {
      console.error('获取编辑器宽度设置失败:', error);
      return 'w-[70%]';
    }
  };

  // 获取工具栏按钮样式
  const getToolbarButtonStyle = () => {
    const baseStyle = {
      color: isDarkMode ? '#e2e8f0' : '#1F2937',
      opacity: 0.8
    };
    
    return baseStyle;
  };

  // 使用主题hook
  const { darkMode: isDarkMode } = useTheme();

  return (
    <form 
      ref={editorRef}
      onSubmit={handleSubmit} 
      className={`${getEditorWidthClass()} max-w-full mx-auto min-h-card p-6 card-optimized smooth-transition hover:-translate-y-1 hover:shadow-lg note-card`}
      style={{...getEditorStyle()}}
    >
      {/* 内容编辑区域 */}
      <div className="mb-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onFocus={() => {}} // 不需要设置展开状态，因为始终保持展开
          onPaste={handlePaste}
          placeholder="写点什么..."
          className="w-full p-3 focus:ring-0 focus:border-primary-500 note-editor-custom-bg note-editor-custom-text show-scrollbar"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--theme-border)',
            borderRadius: `${cardSettings?.borderRadius || 8}px`,
            resize: 'none',
            outline: 'none'
          }}
          rows={isExpanded ? 12 : 8}
          required
        />
      </div>
      
      {/* 已选标签显示 */}
      <div className="mb-3">
        {/* 已选标签显示 */}
        {Array.isArray(selectedTags) && selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map(tagName => {
              console.log('🏷️ 渲染标签:', { tagName, selectedTags });
              return (
                <span 
                  key={tagName} 
                  className={`inline-flex items-center px-2 py-1 rounded-full text-sm note-tag-custom ${getTagColorFromState(tagName)}`}
                  style={getTagStyleFromState(tagName)}
                >
                  #{tagName}
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveTag(tagName);
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                    title="移除标签"
                  >
                    <FiX size={14} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        

      </div>
      
      {/* 工具栏 */}
      <div 
        className="mb-4 p-3 note-toolbar-custom-bg"
        style={{ 
          borderRadius: `${cardSettings?.borderRadius || 8}px`,
          border: '1px solid var(--theme-border)',
          opacity: 0.95
        }}
      >
            {/* 工具栏按钮行 */}
            <div className="flex items-center justify-between">
              {/* 左侧按钮组 */}
              <div className="flex flex-wrap items-center gap-1">
                {/* 标签按钮 - 放在第一位 */}
                <div className="relative">
                  <button
                    ref={tagButtonRef}
                    type="button"
                    onClick={(e) => handleButtonClick('tag', e)}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-[3.5rem]"
                    style={getToolbarButtonStyle()}
                    title="标签"
                  >
                    <FiTag size={18} />
                    <span className="text-sm font-medium">标签</span>
                  </button>
                  {/* TagPicker 现在内嵌显示，不再作为弹出框 */}
                </div>

                {/* 任务列表按钮 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    insertTaskList();
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-[3.5rem]"
                  style={getToolbarButtonStyle()}
                  title="任务列表"
                >
                  <FiCheckSquare size={18} />
                  <span className="text-sm font-medium">任务</span>
                </button>



                {/* 图片上传按钮 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-[3.5rem]"
                  style={getToolbarButtonStyle()}
                  title="上传图片"
                >
                  <FiImage size={18} />
                  <span className="text-sm font-medium">图片</span>
                </button>

                {/* 引用按钮 */}
                <div className="relative">
                  <button
                    ref={referenceButtonRef}
                    type="button"
                    onClick={(e) => handleButtonClick('reference', e)}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-[3.5rem]"
                    style={getToolbarButtonStyle()}
                    title="引用笔记"
                  >
                    <FiLink size={18} />
                    <span className="text-sm font-medium">引用</span>
                  </button>
                  <NoteReferenceSelector
                    isOpen={showReferenceSelector}
                    triggerRef={referenceButtonRef}
                    onNoteSelect={handleNoteReference}
                    onClose={() => setShowReferenceSelector(false)}
                  />
                </div>

                {/* 表情包按钮 */}
                <div className="relative">
                  <button
                    ref={emojiButtonRef}
                    type="button"
                    onClick={(e) => handleButtonClick('emoji', e)}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-[3.5rem]"
                    style={getToolbarButtonStyle()}
                    title="表情包"
                  >
                    <FiSmile size={18} />
                    <span className="text-sm font-medium">表情</span>
                  </button>
                  <EmojiPicker
                    isOpen={showEmojiPicker}
                    triggerRef={emojiButtonRef}
                    onEmojiSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>

                {/* 心情按钮 */}
                <div className="relative">
                  <button
                    ref={moodButtonRef}
                    type="button"
                    onClick={(e) => handleButtonClick('mood', e)}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-[3.5rem]"
                    style={getToolbarButtonStyle()}
                    title="心情"
                  >
                    <FiHeart size={18} />
                    <span className="text-sm font-medium">心情</span>
                  </button>
                  <MoodSelector
                    isOpen={showMoodSelector}
                    triggerRef={moodButtonRef}
                    onMoodSelect={handleMoodSelect}
                    onClose={() => setShowMoodSelector(false)}
                  />
                </div>

                {/* 天气按钮 */}
                <div className="relative">
                  <button
                    ref={weatherButtonRef}
                    type="button"
                    onClick={(e) => handleButtonClick('weather', e)}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-[3.5rem]"
                    style={getToolbarButtonStyle()}
                    title="天气"
                  >
                    <FiCloud size={18} />
                    <span className="text-sm font-medium">天气</span>
                  </button>
                  <WeatherSelector
                    isOpen={showWeatherSelector}
                    triggerRef={weatherButtonRef}
                    onWeatherSelect={handleWeatherSelect}
                    onClose={() => setShowWeatherSelector(false)}
                  />
                </div>

                {/* 编辑工具按钮 */}
                <button
                  ref={editButtonRef}
                  type="button"
                  onClick={(e) => handleButtonClick('edit', e)}
                  className="flex items-center justify-center gap-1 px-2 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-[3.5rem]"
                  style={getToolbarButtonStyle()}
                  title="文本格式"
                >
                  <FiEdit3 size={18} />
                  <span className="text-sm font-medium">格式</span>
                </button>
              </div>

              {/* 右侧日期选择按钮 */}
              <div className="flex items-center gap-1">
                {/* 分隔线 */}
                <div 
                  className="h-4 w-px"
                  style={{
                    backgroundColor: 'var(--theme-border)',
                    opacity: 0.5
                  }}
                ></div>

                {/* 日期选择按钮 */}
                <div className="relative">
                  <button
                    ref={timeButtonRef}
                    type="button"
                    onClick={(e) => handleButtonClick('time', e)}
                    className="flex items-center justify-center px-3 py-2 rounded text-sm transition-colors hover:opacity-100 min-w-btn-action"
                    style={getToolbarButtonStyle()}
                    title={isEditMode ? "修改时间" : "选择日期"}
                  >
                    <FiCalendar size={18} className="mr-1" />
                    <span className="text-sm font-medium">
                      {format(currentTime, 'HH:mm')}
                    </span>
                  </button>
                  <TimeEditor
                    isOpen={showTimeEditor}
                    triggerRef={timeButtonRef}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    onClose={() => setShowTimeEditor(false)}
                  />
                </div>
              </div>
            </div>



            {/* 标签选择器 - 镶嵌在工具栏按钮下方的新行 */}
            <TagPicker
              isOpen={showTagPicker}
              triggerRef={tagButtonRef}
              selectedTags={selectedTags}
              onTagsChange={handleTagPickerSelect}
              onClose={() => setShowTagPicker(false)}
              cardSettings={cardSettings}
              disableOutsideClick={true}
            />

            {/* 文本格式工具栏 - 镶嵌在工具栏按钮下方的新行 */}
            <EditToolbar
              isOpen={showEditToolbar}
              triggerRef={editButtonRef}
              onFormatSelect={handleFormatSelect}
              onClose={() => setShowEditToolbar(false)}
              textareaRef={textareaRef}
              cardSettings={cardSettings}
            />
          </div>

          {/* 隐藏的文件输入 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
          />

          {isUploading && (
            <div className="text-slate-500 text-xs mb-3 flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              正在上传图片...
            </div>
          )}
          
          {uploadError && (
            <div className="text-red-500 text-xs mb-3 flex items-center gap-2">
              <span>{uploadError}</span>
              {failedUploadFile && (
                <button
                  type="button"
                  onClick={handleRetryUpload}
                  className="text-blue-500 hover:text-blue-700 underline text-xs"
                  disabled={isUploading}
                >
                  重试
                </button>
              )}
            </div>
          )}

      {/* 底部按钮区域 */}
      <div className="flex justify-end items-center gap-2 mt-4 pr-1">
        {/* 分隔线 - 与工具栏保持一致 */}
        <div 
          className="h-4 w-px mr-2"
          style={{
            backgroundColor: 'var(--theme-border)',
            opacity: 0.5
          }}
        ></div>
        
        {/* 取消按钮 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // 与点击空白取消保持一致，只调用onCancel函数
            if (onCancel) {
              onCancel();
            }
          }}
          className="flex items-center text-sm px-3 py-1.5 font-medium transition-colors duration-200 hover:opacity-80"
          style={{
            backgroundColor: 'rgba(107, 114, 128, 0.8)',
            color: 'white',
            borderRadius: cardSettings?.borderRadius || '0.375rem'
          }}
        >
          <FiX className="mr-1 h-4 w-4" />
          取消
        </button>
        
        <button
          type="submit"
          data-note-editor-submit
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="flex items-center text-sm px-3 py-1.5 font-medium transition-colors duration-200 hover:opacity-80"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            color: 'white',
            borderRadius: cardSettings?.borderRadius || '0.375rem'
          }}
          disabled={!content.trim()}
        >
          <FiSend className="mr-1 h-4 w-4" />
          {submitText}
        </button>
      </div>

      {/* 输入对话框 */}
      <InputDialog
        isOpen={showInputDialog}
        onClose={() => setShowInputDialog(false)}
        onConfirm={inputDialogConfig.onConfirm}
        title={inputDialogConfig.title}
        placeholder={inputDialogConfig.placeholder}
        maxLength={100}
      />
    </form>
  );
};

export default NoteEditor;
