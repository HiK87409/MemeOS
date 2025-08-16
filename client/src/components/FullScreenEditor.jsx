import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const FullScreenEditor = ({ 
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
  isActive = false,
  onActivate = null
}) => {
  const [content, setContent] = useState(note?.content || initialContent || '');
  const [selectedTags, setSelectedTags] = useState(() => {
    if (note && Array.isArray(note.tags) && note.tags.length > 0) {
      if (typeof note.tags[0] === 'string') {
        return note.tags;
      }
      if (note.tags[0] && note.tags[0].name) {
        return note.tags.map(tag => tag.name);
      }
    }
    return initialTags || [];
  });
  
  const [selectedDate, setSelectedDate] = useState(note?.created_at ? new Date(note.created_at) : initialDate || new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [failedUploadFile, setFailedUploadFile] = useState(null); // 保存上传失败的文件用于重试
  const [tagColorMap, setTagColorMap] = useState({});
  const [colorDataLoaded, setColorDataLoaded] = useState(false);
  
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  
  // 工具栏状态
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showWeatherSelector, setShowWeatherSelector] = useState(false);
  const [showEditToolbar, setShowEditToolbar] = useState(false);
  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [currentMood, setCurrentMood] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  
  // 按钮ref
  const emojiButtonRef = useRef(null);
  const moodButtonRef = useRef(null);
  const weatherButtonRef = useRef(null);
  const editButtonRef = useRef(null);
  const timeButtonRef = useRef(null);
  const tagButtonRef = useRef(null);
  const referenceButtonRef = useRef(null);
  
  const { darkMode: isDarkMode } = useTheme();

  // 加载颜色数据
  const loadColors = async () => {
    try {
      try {
        const configColors = localConfigManager.getTagColors();
        if (Object.keys(configColors).length > 0) {
          setTagColorMap(configColors);
        } else {
          const localColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
          if (Object.keys(localColors).length > 0) {
            setTagColorMap(localColors);
          }
        }
      } catch (configError) {
        console.error('从localConfigManager加载颜色失败:', configError);
        try {
          const localColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
          if (Object.keys(localColors).length > 0) {
            setTagColorMap(localColors);
          }
        } catch (localError) {
          console.error('从本地存储加载颜色也失败:', localError);
        }
      }
      
      try {
        const serverColors = await fetchTagColors();
        setTagColorMap(prev => {
          const mergedMap = { ...serverColors, ...prev };
          if (Object.keys(serverColors).length > 0) {
            localStorage.setItem('tagColors', JSON.stringify(mergedMap));
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
      }
      
      setColorDataLoaded(true);
    } catch (error) {
      console.error('加载颜色数据失败:', error);
      setColorDataLoaded(true);
    }
  };

  useEffect(() => {
    loadColors();
  }, []);

  useEffect(() => {
    if (autoFocus && isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus, isActive]);



  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return;
      
      // Esc键退出
      if (e.key === 'Escape') {
        handleCancel();
        return;
      }
      
      // /键打开命令菜单（当不在输入状态时）
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const textarea = textareaRef.current;
        if (textarea && document.activeElement === textarea) {
          const cursorPos = textarea.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          
          // 检查光标前是否是空行或行首
          const lineStart = textBefore.lastIndexOf('\n');
          const currentLine = textBefore.substring(lineStart + 1);
          
          if (currentLine.trim() === '' || currentLine === '/') {
            e.preventDefault();
            // 这里可以打开命令菜单，暂时用标签选择器代替
            setShowTagPicker(true);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, content]);

  const handleContentChange = (newContent) => {
    setContent(newContent);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        content,
        tags: selectedTags,
        date: selectedDate,
        mood: currentMood,
        weather: currentWeather
      });
    }
  };

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  const handleTagSelect = (tagName) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setShowTagPicker(false);
  };

  const handleRemoveTag = (tagName) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagName));
  };

  const handleImageUpload = async (file, isRetry = false) => {
    try {
      setIsUploading(true);
      setUploadError('');
      setFailedUploadFile(null); // 清除失败的文件
      
      const result = await uploadImage(file);
      const imageMarkdown = `![图片](${result.url})`;
      
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + imageMarkdown + content.substring(end);
        setContent(newContent);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
        }, 0);
      }
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
      handleImageUpload(failedUploadFile, true);
    }
  };

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + emoji + content.substring(end);
      setContent(newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  const handleMoodSelect = (mood) => {
    setCurrentMood(mood);
    setShowMoodSelector(false);
  };

  const handleWeatherSelect = (weather) => {
    setCurrentWeather(weather);
    setShowWeatherSelector(false);
  };

  const insertTaskList = () => {
    const taskListText = '\n- [ ] 任务1\n- [ ] 任务2\n- [ ] 任务3\n';
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + taskListText + content.substring(end);
      setContent(newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + taskListText.length, start + taskListText.length);
      }, 0);
    }
  };

  const getTagColorFromState = (tagName) => {
    if (tagColorMap[tagName]) {
      return getTagColorClass(tagColorMap[tagName]);
    }
    return getTagColorClass(getDefaultColor());
  };

  const getTagStyleFromState = (tagName) => {
    if (tagColorMap[tagName]) {
      return getTagStyle(tagColorMap[tagName]);
    }
    return getTagStyle(getDefaultColor());
  };

  const handlePaste = async (e) => {
    const clipboardData = e.clipboardData;
    const items = clipboardData.items;
    let hasImage = false;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        hasImage = true;
        break;
      }
    }

    if (hasImage) {
      e.preventDefault();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
              setUploadError('不支持的图片格式。请使用 JPEG、PNG、GIF 或 WebP 格式。');
              return;
            }
            await handleImageUpload(file);
          }
          return;
        }
      }
    }
  };

  const getToolbarButtonStyle = () => {
    return {
      color: isDarkMode ? '#e2e8f0' : '#1F2937',
      opacity: 0.8
    };
  };

  // 如果编辑器未激活，返回null
  if (!isActive) {
    return null;
  }

  return (
    <div 
      ref={editorRef}
      className="fixed inset-0 z-50"
      style={{
        backgroundColor: isDarkMode ? '#111827' : '#ffffff'
      }}
      onClick={(e) => {
        if (e.target === editorRef.current && onActivate) {
          onActivate();
        }
      }}
    >
      {/* 全屏编辑区域 - Notion风格 */}
      <div className="h-full flex flex-col">
        {/* 主要编辑区域 */}
        <div className="flex-1 flex flex-col">
          {/* 标签显示 - 简化显示 */}
          {Array.isArray(selectedTags) && selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 px-8 pt-8 pb-2">
              {selectedTags.map(tagName => (
                <span 
                  key={tagName} 
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getTagColorFromState(tagName)}`}
                  style={getTagStyleFromState(tagName)}
                >
                  #{tagName}
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tagName);
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                    title="移除标签"
                  >
                    <FiX size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* 文本编辑区域 - Notion风格 */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onPaste={handlePaste}
            placeholder=""
            className="flex-1 w-full px-8 py-4 resize-none outline-none text-lg"
            style={{
              backgroundColor: 'transparent',
              color: isDarkMode ? '#e2e8f0' : '#1F2937',
              fontSize: '16px',
              lineHeight: '1.5',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            autoFocus
          />
        </div>
        
        {/* 浮动工具栏 - 类似Notion的/命令 */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-2">
          {/* 发布按钮 */}
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.9)', color: 'white' }}
            title={submitText}
          >
            <FiSend size={20} />
          </button>
          
          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            style={{ backgroundColor: 'rgba(107, 114, 128, 0.8)', color: 'white' }}
            title="关闭"
          >
            <FiX size={18} />
          </button>
        </div>
        
        {/* 快捷工具提示 */}
        <div className="fixed bottom-4 left-4 text-xs opacity-50" style={{ color: isDarkMode ? '#e2e8f0' : '#1F2937' }}>
          按 / 打开命令菜单 • Esc 退出
        </div>
      </div>
      
      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImageUpload(file);
          }
        }}
      />
      
      {/* 错误提示 */}
      {uploadError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>{uploadError}</span>
          {failedUploadFile && (
            <button
              type="button"
              onClick={handleRetryUpload}
              className="text-blue-200 hover:text-blue-100 underline text-sm"
              disabled={isUploading}
            >
              重试
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FullScreenEditor;