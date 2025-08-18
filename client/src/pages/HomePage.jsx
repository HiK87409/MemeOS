import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiX, FiArrowUp, FiSun, FiMoon, FiSave, FiSidebar, FiTrash2, FiCalendar, FiCheckSquare, FiSettings, FiFileText, FiRotateCcw, FiPaperclip } from 'react-icons/fi';
import { useSmartPosition } from '../hooks/useDynamicPosition';
import { fetchMyNotes, fetchMyNotesWithPagination, fetchMyNotesByTagWithPagination, createNote, updateNote, deleteNote, fetchAllTags, fetchNoteDates, togglePinNote, fetchTagColors } from '../api/notesApi';
import NoteForm from '../components/NoteForm';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import DynamicBackground from '../components/DynamicBackground';
import { useTheme } from '../hooks/useTheme';

import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import { sortByFuturePriority } from '../utils/timeUtils';
import localConfigManager from '../utils/localConfigManager';

import TagManager from '../components/TagManager';
import AttachmentManager from '../components/AttachmentManager';
import RealCalendarFilter from '../components/RealCalendarFilter';
import CalendarFilterView from '../components/CalendarFilterView';
import CompactCalendarFilter from '../components/CompactCalendarFilter';



const HomePage = ({ updateTags, dateFilter, onDateFilter, selectedTag, onTagChange }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [noteDates, setNoteDates] = useState([]);
  const [availableTags, setAvailableTags] = useState([]); // 可用标签列表
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false); // 左侧边栏显示状态
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false); // 右侧边栏显示状态
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false); // 左侧边栏收起状态（仅图标模式）
  const [showAttachmentPage, setShowAttachmentPage] = useState(false); // 显示附件页面状态


  const [showDropdown, setShowDropdown] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  
  // 标签颜色相关状态
  const [tagColorMap, setTagColorMap] = useState({});
  const [colorDataLoaded, setColorDataLoaded] = useState(false);
  
  // 滚动相关状态
  const [totalNotes, setTotalNotes] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef(null);
  
  const { darkMode: isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // 预设颜色列表
  const commonColors = [
    { name: '蓝色', value: 'blue', hexColor: '#3B82F6' },
    { name: '绿色', value: 'green', hexColor: '#10B981' },
    { name: '红色', value: 'red', hexColor: '#EF4444' },
    { name: '黄色', value: 'yellow', hexColor: '#F59E0B' },
    { name: '紫色', value: 'purple', hexColor: '#8B5CF6' },
    { name: '粉色', value: 'pink', hexColor: '#EC4899' },
    { name: '青色', value: 'cyan', hexColor: '#06B6D4' },
    { name: '橙色', value: 'orange', hexColor: '#F97316' },
    { name: '灰色', value: 'gray', hexColor: '#6B7280' },
    { name: '靛蓝', value: 'indigo', hexColor: '#6366F1' },
    { name: '石灰', value: 'lime', hexColor: '#84CC16' },
    { name: '翠绿', value: 'emerald', hexColor: '#059669' },
    { name: '天蓝', value: 'sky', hexColor: '#0EA5E9' },
    { name: '玫瑰', value: 'rose', hexColor: '#F43F5E' },
    { name: '琥珀', value: 'amber', hexColor: '#D97706' },
    { name: '青柠', value: 'teal', hexColor: '#14B8A6' }
  ];
  
  // 使用智能定位hook来动态定位+按钮到卡片列表右下角
   const { style: buttonStyle } = useSmartPosition('.notes-list-container', {
     defaultPosition: 'bottom-right',
     mobilePosition: 'bottom-right', 
     desktopPosition: 'bottom-right'
   });
  
  // 检测是否为小屏幕
  const isSmallScreen = useCallback(() => {
    return window.innerWidth < 1024; // lg断点
  }, []);
  
  // 处理筛选按钮点击
  const handleFilterClick = useCallback(() => {
    if (isSmallScreen()) {
      // 小屏幕下：关闭左侧边栏，打开右侧边栏，确保在主页
      setLeftSidebarOpen(false);
      setRightSidebarOpen(true);
      
      // 如果当前不在主页，跳转到主页
      if (window.location.pathname !== '/') {
        navigate('/');
      }
    } else {
      // 大屏幕下：正常切换右侧边栏
      setRightSidebarOpen(!rightSidebarOpen);
    }
  }, [isSmallScreen, rightSidebarOpen, navigate]);
  
  // 处理标签筛选的函数
  const handleTagFilter = useCallback((tagInput) => {
    // 处理标签对象或标签名称
    const tagName = typeof tagInput === 'object' && tagInput !== null ? tagInput.name : tagInput;
    
    if (onTagChange && typeof onTagChange === 'function') {
      onTagChange(tagInput); // 传递完整的标签对象或名称
    }
    
    // 触发标签筛选状态变化事件，让TagManager同步选中状态
    window.dispatchEvent(new CustomEvent('tagFilterChanged', {
      detail: { tagName }
    }));
  }, [onTagChange]);
  
  // 设置全局函数供TagManager调用
  useEffect(() => {
    window.handleTagFilter = handleTagFilter;
    
    return () => {
      delete window.handleTagFilter;
    };
  }, [handleTagFilter]);
  
  // 编辑笔记
  const handleEditNote = useCallback(async (id, noteData, options = {}) => {
    try {
      await updateNote(id, noteData);
      
      if (!options.preventReload) {
        // 重新加载所有笔记
        await loadNotes();
        await refreshTags();
      } else {
        // 只更新本地状态中的特定笔记，保持排序和位置
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === id 
              ? { 
                  ...note, 
                  ...noteData
                }
              : note
          )
        );
      }
    } catch (err) {
      setError('更新笔记失败');
      console.error(err);
      
      // 如果更新失败，重新加载以恢复状态
      await loadNotes();
    }
  });

  // 搜索笔记
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === '' || 
      note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });
  
  // 删除笔记（移动到回收站）
  const handleDeleteNote = async (id) => {
    console.log('[HomePage] handleDeleteNote被调用，笔记ID:', id);
    
    // 找到要删除的笔记
    const noteToDelete = notes.find(note => note.id === id);
    if (!noteToDelete) {
      console.error('[HomePage] 未找到要删除的笔记');
      return;
    }
    
    console.log('[HomePage] 开始删除流程，移动到回收站');
    const originalNotes = [...notes];
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));

    try {
      // 调用API删除笔记（服务器会处理移动到回收站的逻辑）
      console.log('[HomePage] 调用deleteNote API');
      await deleteNote(id);
      console.log('[HomePage] deleteNote API调用成功');
      await refreshTags();
      console.log('[HomePage] 删除完成，已移动到回收站，标签已刷新');
    } catch (err) {
      // 从错误响应中提取更具体的消息
      const errorMessage = err.response?.data?.message || '删除笔记失败，请重试';
      setError(errorMessage);
      console.error('[DELETE] 删除笔记失败:', err.response?.data || err);
      setNotes(originalNotes);
    }
  };

  // 置顶笔记
  const handlePinNote = async (id, isPinned) => {
    // 先乐观更新UI
    const originalNotes = [...notes];
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, is_pinned: !Boolean(note.is_pinned) } : note
    );
    
    // 重新排序：置顶笔记在前，然后按未来优先级排序
    updatedNotes.sort(sortByFuturePriority);
    
    setNotes(updatedNotes);
    
    try {
      await togglePinNote(id);
    } catch (err) {
      // 如果操作失败，恢复原始状态
      setNotes(originalNotes);
      setError('置顶操作失败');
      console.error('[PIN] 置顶操作失败:', err);
    }
  };

  // 处理笔记跳转
  const handleNoteClick = (noteId) => {
    console.log('[跳转] handleNoteClick被调用，笔记ID:', noteId, '类型:', typeof noteId);
    console.log('[跳转] 当前路径:', window.location.pathname);
    
    // 如果当前不在主页，先跳转到主页并带上note参数
    if (window.location.pathname !== '/') {
      console.log('[跳转] 不在主页，跳转到主页并带上note参数');
      navigate(`/?note=${noteId}`);
      return;
    }
    
    // 查找目标笔记元素
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    console.log('[跳转] 查找笔记元素:', noteElement, '选择器:', `[data-note-id="${noteId}"]`);
    
    if (noteElement) {
      console.log('[跳转] 找到笔记元素，开始滚动和高亮');
      // 滚动到目标笔记 - 使用更长的平滑滚动
      noteElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // 添加高亮效果 - 使用更长的过渡时间和更丰富的动画效果
      noteElement.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      noteElement.style.transform = 'scale(1.03)';
      noteElement.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      noteElement.classList.add('shadow-card-hover');
      setTimeout(() => {
        noteElement.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        noteElement.style.transform = 'scale(1)';
        noteElement.style.boxShadow = '';
        noteElement.classList.remove('shadow-card-hover');
      }, 1500);
    } else {
      console.log('[跳转] 未找到笔记元素，可用笔记:', notes.map(n => `${n.id}:${n.title}`));
    }
  };
  



  

  
  // 加载标签颜色数据
  useEffect(() => {
    const loadTagColors = async () => {
      try {
        const tagColors = await fetchTagColors();
        
        // 服务器数据优先，同时更新本地存储
        if (Object.keys(tagColors).length > 0) {
          localStorage.setItem('tagColors', JSON.stringify(tagColors));
        }
        
        setTagColorMap(tagColors);
        setColorDataLoaded(true);
      } catch (error) {
        console.error('加载标签颜色失败:', error);
        // 如果加载失败，使用本地存储的数据
        const savedColors = localStorage.getItem('tagColors');
        if (savedColors) {
          setTagColorMap(JSON.parse(savedColors));
        }
        setColorDataLoaded(true);
      }
    };
    
    loadTagColors();
  }, []);
  
  // 监听标签颜色更新事件
  useEffect(() => {
    const handleTagColorsUpdated = async (event) => {
      // 重新从服务器同步数据
      try {
        const updatedTagColors = await fetchTagColors();
        
        // 更新本地状态和存储
        setTagColorMap(updatedTagColors);
        localStorage.setItem('tagColors', JSON.stringify(updatedTagColors));
      } catch (error) {
        console.error('同步标签颜色失败:', error);
        // 如果同步失败，至少更新当前标签的颜色
        const { tagName, color } = event.detail || {};
        if (tagName && color) {
          setTagColorMap(prev => ({
            ...prev,
            [tagName]: color
          }));
        }
      }
    };

    // 监听标签筛选变化事件
    const handleTagFilterChanged = (event) => {
      const { tagName } = event.detail || {};
      console.log('🎯 HomePage收到标签筛选变化事件:', { tagName });
      // 这里可以添加额外的UI更新逻辑
    };

    // 监听筛选清除事件
    const handleFilterCleared = () => {
      console.log('🎯 HomePage收到筛选清除事件');
      // 强制重新渲染以更新UI状态
      setForceRender(prev => prev + 1);
    };

    window.addEventListener('tagColorsUpdated', handleTagColorsUpdated);
    window.addEventListener('tagFilterChanged', handleTagFilterChanged);
    window.addEventListener('filterCleared', handleFilterCleared);
    
    return () => {
      window.removeEventListener('tagColorsUpdated', handleTagColorsUpdated);
      window.removeEventListener('tagFilterChanged', handleTagFilterChanged);
      window.removeEventListener('filterCleared', handleFilterCleared);
    };
  }, []);
  
  // 获取标签颜色的辅助函数
  const getTagStyleFromState = (tagName) => {
    if (!tagName) {
      return {
        backgroundColor: '#6B7280', // 默认灰色
        color: '#ffffff'
      };
    }
    
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
      backgroundColor: '#6B7280', // 默认灰色
      color: '#ffffff'
    };
  };
  
  // 获取需要筛选的标签列表（包括父子标签关系）
  const getTagsToFilter = useCallback((tagInput, allTags) => {
    if (!tagInput || !allTags) return [];
    
    // 处理标签输入，可能是字符串或对象
    const tagName = typeof tagInput === 'string' ? tagInput : tagInput.name;
    if (!tagName) return [];
    
    console.log('getTagsToFilter输入:', { tagInput, tagName, allTags: allTags.slice(0, 3) }); // 调试日志
    
    const tagsToFilter = new Set([tagName]);
    
    // 递归函数来收集所有子标签
    const collectChildren = (tag) => {
      console.log('collectChildren调用:', { tag }); // 调试日志
      
      // 基于parentId查找子标签
      const childTags = allTags.filter(t => t.parentId === tag.id);
      console.log('找到子标签:', childTags); // 调试日志
      
      childTags.forEach(child => {
        const childName = typeof child === 'string' ? child : child.name;
        if (childName && !tagsToFilter.has(childName)) {
          tagsToFilter.add(childName);
          console.log('添加子标签到筛选列表:', childName); // 调试日志
          
          // 递归处理子标签的子标签
          collectChildren(child);
        }
      });
    };
    
    // 查找目标标签
    const targetTag = allTags.find(tag => {
      if (typeof tag === 'string') {
        return tag === tagName;
      }
      return tag.name === tagName;
    });
    
    if (targetTag) {
      // 收集所有子标签（包括嵌套的子标签）
      collectChildren(targetTag);
      
      // 查找所有父标签
      const findParents = (currentTagName, visited = new Set()) => {
        if (visited.has(currentTagName)) return;
        visited.add(currentTagName);
        
        // 找到当前标签对象
        const currentTag = allTags.find(tag => {
          if (typeof tag === 'string') {
            return tag === currentTagName;
          }
          return tag.name === currentTagName;
        });
        
        if (currentTag && currentTag.parentId) {
          // 基于parentId查找父标签
          const parentTag = allTags.find(tag => tag.id === currentTag.parentId);
          if (parentTag) {
            const parentName = typeof parentTag === 'string' ? parentTag : parentTag.name;
            if (parentName && !tagsToFilter.has(parentName)) {
              tagsToFilter.add(parentName);
              console.log('添加父标签到筛选列表:', parentName); // 调试日志
              // 递归查找父标签的父标签
              findParents(parentName, visited);
            }
          }
        }
      };
      
      // 查找所有父标签（包括多级父标签）
      findParents(tagName);
    }
    
    const result = Array.from(tagsToFilter);
    console.log('getTagsToFilter最终结果:', result); // 调试日志
    return result;
  }, []);
  
  // 加载笔记
  const loadNotes = useCallback(async (query = '') => {
    try {
      setLoading(true);
      
      // 直接加载所有笔记，不使用分页
      let response = await fetchMyNotes(query);
      
      // 提取notes数组
      let data = [];
      if (response && Array.isArray(response.notes)) {
        data = response.notes;
      } else if (Array.isArray(response)) {
        // 兼容旧的API格式
        data = response;
      } else {
        console.error('API返回的数据格式不正确:', response);
        data = [];
      }
      
      // 如果有日期筛选，进行筛选
      if (dateFilter) {
        try {
          data = data.filter(note => {
            // 只检查created_at字段
            const checkDate = (dateStr) => {
              if (!dateStr) return false;
              
              let noteDate;
              if (dateStr.includes('T') && dateStr.includes('Z')) {
                // ISO格式: 2025-08-03T03:32:55.000Z (UTC时间)
                noteDate = parseISO(dateStr);
                // 使用系统时区
                noteDate = new Date(noteDate.getTime() + noteDate.getTimezoneOffset() * 60000);
              } else if (dateStr.includes('-') && dateStr.includes(':')) {
                // SQLite格式: 2025-08-04 07:12:32
                // 直接解析为本地时间
                noteDate = new Date(dateStr);
              } else {
                // 其他格式，尝试直接解析
                noteDate = new Date(dateStr);
              }
              
              // 格式化为YYYY-MM-DD进行比较
              const noteDateString = format(noteDate, 'yyyy-MM-dd');
              return noteDateString === dateFilter;
            };
            
            // 只检查创建日期
            return checkDate(note.created_at);
          });
        } catch (err) {
          console.error('日期筛选错误:', err);
          data = [];
        }
      }
      
      // 如果有标签筛选，进行筛选
      if (selectedTag) {
        try {
          // 获取需要筛选的所有标签（包括父子标签关系）
          const tagsToFilter = getTagsToFilter(selectedTag, availableTags);
          console.log('标签筛选:', { selectedTag, tagsToFilter });
          
          data = data.filter(note => {
            if (!note.tags) return false;
            
            // 处理字符串格式的标签
            if (typeof note.tags === 'string') {
              const noteTags = note.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
              return noteTags.some(tag => tagsToFilter.includes(tag));
            }
            
            // 处理数组格式的标签
            if (Array.isArray(note.tags)) {
              return note.tags.some(tag => {
                const tagName = typeof tag === 'string' ? tag : (tag.name || tag);
                return tagsToFilter.includes(tagName);
              });
            }
            
            return false;
          });
        } catch (err) {
          console.error('标签筛选错误:', err);
          data = [];
        }
      }
      
      // 排序：置顶笔记在前，然后按未来优先级排序（距离当前时间越近的未来时间排在前面）
      try {
        data.sort(sortByFuturePriority);
      } catch (err) {
        console.error('排序错误:', err);
        data = [];
      }
      
      setNotes(data);
      setTotalNotes(data.length);
      
      setError(null);
    } catch (err) {
      console.error('加载笔记失败:', err);
      setError('加载笔记失败');
      setNotes([]);
      setTotalNotes(0);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, selectedTag, availableTags, getTagsToFilter]);

  // 加载可用标签
  const loadAvailableTags = async () => {
    try {
      // 使用localConfigManager获取包含父子标签关系的完整标签数据
      const tags = localConfigManager.getTags();
      setAvailableTags(tags);
      if (updateTags && typeof updateTags === 'function') {
        updateTags(tags); // 同时更新全局标签
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  };

  // 加载有笔记的日期
  const loadNoteDates = async () => {
    try {
      const dates = await fetchNoteDates();
      setNoteDates(dates);
    } catch (error) {
      console.error('加载笔记日期失败:', error);
    }
  };



  // 回到顶部
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // 处理搜索框外部点击
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };

    if (showSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearch]);

  // 滚动监听
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop } = scrollContainerRef.current;
    
    // 显示/隐藏回到顶部按钮
    setShowBackToTop(scrollTop > 300);
  }, []);



  // 备份管理器处理函数


  // 处理笔记恢复
  const handleNoteRestore = async (note) => {
    try {
      // 重新创建笔记
      const restoredNote = await createNote({
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        mood: note.mood,
        weather: note.weather,
        is_pinned: note.is_pinned || false
      });
      
      // 从回收站移除
      let deletedNotes;
      try {
        deletedNotes = JSON.parse(localStorage.getItem('deletedNotes') || '[]');
        // 确保 deletedNotes 是数组
        if (!Array.isArray(deletedNotes)) {
          console.warn('[handleNoteRestore] deletedNotes 不是数组，重置为空数组');
          deletedNotes = [];
        }
      } catch (parseErr) {
        console.error('[handleNoteRestore] 解析 deletedNotes 失败:', parseErr);
        deletedNotes = [];
      }
      
      const filteredNotes = deletedNotes.filter(n => n.originalId !== note.originalId);
      localStorage.setItem('deletedNotes', JSON.stringify(filteredNotes));
      
      // 重新加载笔记列表
      await loadNotes();
      await refreshTags();
      
      return restoredNote;
    } catch (err) {
      console.error('恢复笔记失败:', err);
      setError('恢复笔记失败');
      throw err;
    }
  };


  
  // 当筛选条件改变时重新加载笔记
  useEffect(() => {
    setNotes([]);
    loadNotes();
  }, [dateFilter, selectedTag, loadNotes]);

  // 处理URL参数中的note参数，实现笔记跳转
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const noteId = urlParams.get('note');
    
    if (noteId && !loading && notes.length > 0) {
      // 延迟执行以确保DOM已经渲染完成
      setTimeout(() => {
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
          // 滚动到目标笔记
          noteElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // 添加高亮效果
          noteElement.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
          noteElement.style.transform = 'scale(1.03)';
          noteElement.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
          noteElement.classList.add('shadow-card-hover');
          setTimeout(() => {
            noteElement.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            noteElement.style.transform = 'scale(1)';
            noteElement.style.boxShadow = '';
            noteElement.classList.remove('shadow-card-hover');
          }, 1500);
          
          // 清除URL参数以避免重复跳转
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      }, 500);
    }
  }, [location.search, loading, notes]);

  // 添加滚动监听
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // 刷新标签数据
  const refreshTags = async () => {
    try {
      // 使用localConfigManager获取包含父子标签关系的完整标签数据
      const tags = localConfigManager.getTags();
      setAvailableTags(tags);
      if (updateTags && typeof updateTags === 'function') {
        updateTags(tags); // 同时更新全局标签
      }
    } catch (error) {
      console.error('刷新标签失败:', error);
    }
  };

  // 初始加载 - 加载标签和日期数据
  useEffect(() => {
    loadAvailableTags();
    loadNoteDates();
  }, []);

  // 页面获得焦点时刷新标签数据（确保标签数据最新）
useEffect(() => {
  const handleFocus = () => {
    refreshTags();
  };

  window.addEventListener('focus', handleFocus);
  return () => {
    window.removeEventListener('focus', handleFocus);
  };
}, []);

// 设置全局刷新函数
useEffect(() => {
  // 设置全局刷新函数，供其他组件调用
  window.refreshNotes = async () => {
    await loadNotes();
  };
  
  window.refreshTags = async () => {
    await refreshTags();
  };
  
  // 清理函数
  return () => {
    delete window.refreshNotes;
    delete window.refreshTags;
  };
}, [loadNotes, refreshTags]);



  return (
    <div className="flex min-h-screen">
      {/* 遮罩层 - 仅在小屏幕且侧边栏打开时显示 */}
      {(leftSidebarOpen || rightSidebarOpen) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-5 lg:hidden"
          onClick={() => {
            setLeftSidebarOpen(false);
            setRightSidebarOpen(false);
          }}
        />
      )}
      
      {/* 左侧边栏 - 新建 */}
      <div 
        className={`${leftSidebarCollapsed ? 'w-16' : 'w-40'} h-screen flex flex-col fixed left-0 top-0 z-20 transform transition-all duration-500 ease-out shadow-2xl lg:shadow-none bg-theme-surface ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* 左侧边栏内容 - 可以添加导航、快捷功能等 */}
        <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden hide-scrollbar scrollbar-hide">
          <div className="flex flex-col space-y-1 w-full"> {/* 减小按钮间距 */}
            {/* 笔记按钮 - 返回笔记列表 */}
            <button 
              onClick={() => {
                if (window.location.pathname !== '/') {
                  navigate('/');
                } else {
                  // 如果已经在主页，刷新笔记列表并滚动到顶部
                  loadNotes();
                  refreshTags();
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                  }
                }
              }} 
              className="w-full flex items-center justify-start px-3 py-3 h-12 rounded-lg hover:bg-theme-hover transition-colors text-theme-text group" 
              title="返回笔记列表"
            > 
              <FiFileText className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" /> 
              {!leftSidebarCollapsed && <span className="font-medium ml-3">笔记</span>} 
            </button>

            {/* 浅色模式按钮 */}
            <button 
              onClick={toggleDarkMode} 
              className="w-full flex items-center justify-start px-3 py-3 h-12 rounded-lg hover:bg-theme-hover transition-colors text-theme-text group" 
              title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'} 
            > 
              <FiSun className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" /> 
              {!leftSidebarCollapsed && <span className="font-medium ml-3">{isDarkMode ? '浅色' : '深色'}</span>} 
            </button> 
            
            {/* 任务管理按钮 */}
            <button 
              onClick={() => navigate('/note-tasks')} 
              className="w-full flex items-center justify-start px-3 py-3 h-12 rounded-lg hover:bg-theme-hover transition-colors text-theme-text group" 
            > 
              <FiCheckSquare className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" /> 
              {!leftSidebarCollapsed && <span className="font-medium ml-3">任务</span>} 
            </button> 
            
            {/* 备份管理按钮 */}
            <button 
              onClick={() => navigate('/enhanced-backup-manager')} 
              className="w-full flex items-center justify-start px-3 py-3 h-12 rounded-lg hover:bg-theme-hover transition-colors text-theme-text group" 
            > 
              <FiSave className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" /> 
              {!leftSidebarCollapsed && <span className="font-medium ml-3">备份</span>} 
            </button> 
            
            {/* 附件按钮 - 已隐藏 */}
            {/* <button 
              onClick={() => {
                setShowAttachmentPage(!showAttachmentPage);
                setRightSidebarOpen(false); // 关闭右侧边栏
              }}
              className={`w-full flex items-center justify-start px-3 py-3 h-12 rounded-lg transition-colors text-theme-text group ${showAttachmentPage ? 'bg-theme-primary/20 text-theme-primary' : 'hover:bg-theme-hover'}`}
              title="附件管理"
            > 
              <FiPaperclip className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" /> 
              {!leftSidebarCollapsed && <span className="font-medium ml-3">附件</span>} 
            </button> */} 
            
            {/* 统计按钮 */}
            <button className="w-full flex items-center justify-start px-3 py-3 h-12 rounded-lg hover:bg-theme-hover transition-colors text-theme-text group"> 
              <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> 
              </svg> 
              {!leftSidebarCollapsed && <span className="font-medium ml-3">统计</span>} 
            </button> 
            
            {/* 回收站按钮 */}
            <button 
              onClick={() => navigate('/recycle-bin')} 
              className="w-full flex items-center justify-start px-3 py-3 h-12 rounded-lg hover:bg-theme-hover transition-colors text-theme-text group" 
            > 
              <FiTrash2 className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" /> 
              {!leftSidebarCollapsed && <span className="font-medium ml-3">回收站</span>} 
            </button> 
            
            {/* 设置按钮 */}
            <button 
              onClick={() => navigate('/settings')} 
              className="w-full flex items-center justify-start px-3 py-3 h-12 rounded-lg hover:bg-theme-hover transition-colors text-theme-text group"
            > 
              <FiSettings className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" /> 
              {!leftSidebarCollapsed && <span className="font-medium ml-3">设置</span>} 
            </button> 
          </div> 
        </div> 

        {/* 底部快捷操作 */}
        <div className="flex-shrink-0 p-4 bg-theme-surface border-t border-theme-border">
          <div className="flex justify-center">
            <button 
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              title="收起侧边栏"
            >
              <svg className={`w-5 h-5 transition-transform ${leftSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 中间主内容区域 */}
      <DynamicBackground className="flex-1 flex flex-col min-h-screen lg:ml-40 lg:mr-80 md:ml-0 md:mr-0 sm:ml-0 sm:mr-0" type="bg">

        
        {/* 笔记列表区域 */}
        <div className="flex-1 overflow-y-auto scroll-smooth hide-scrollbar smooth-scroll-container scrollbar-smooth scrollbar-hide notes-list-container" ref={scrollContainerRef}>
          
          {/* 搜索和主题切换区域 - 顶部 */}
          <div className="sticky top-0 z-10 bg-theme-surface/80 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center justify-between">
              {/* 左侧标题 */}
              <h1 className="text-xl font-bold text-theme-text">灰灰笔记</h1>
              
              {/* 右侧搜索和主题切换 */}
              <div className="flex items-center gap-3">
                {/* 搜索图标和输入框 - 内嵌到同一行 */}
                <div className="relative" ref={searchRef}>
                  {!showSearch ? (
                    <button
                      onClick={() => setShowSearch(true)}
                      className="p-2 rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                      title="搜索笔记"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  ) : (
                    <div className="flex items-center bg-theme-surface rounded-lg shadow-lg">
                      <svg className="w-4 h-4 text-theme-text-secondary ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="搜索笔记..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-48 px-2 py-1 bg-transparent text-sm text-theme-text placeholder-theme-text-secondary focus:outline-none focus:ring-0 border-0 shadow-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                        className="p-1 hover:bg-theme-hover rounded-full transition-colors"
                        title="关闭搜索"
                      >
                        <svg className="w-4 h-4 text-theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 刷新按钮 */}
                <button
                  onClick={() => {
                    loadNotes();
                    refreshTags();
                  }}
                  className="p-2 rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                  title="刷新笔记列表"
                >
                  <FiRotateCcw className="w-5 h-5" />
                </button>
                
                {/* 深色/浅色切换按钮 */}
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                  title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
                >
                  {isDarkMode ? (
                    <FiSun className="w-5 h-5" />
                  ) : (
                    <FiMoon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-6">
            
            {/* 附件页面 - 已隐藏，不再显示 */}
            {false ? (
              <div className="flex-1 p-4">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-theme-text mb-2">附件管理</h1>
                    <p className="text-theme-text-secondary">管理您的所有附件文件</p>
                  </div>
                  <AttachmentManager />
                </div>
              </div>
            ) : (
              <>
                {/* 筛选状态显示和清除按钮 */}
                {(dateFilter || selectedTag || searchQuery) && (
                  <div className="mb-6 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-theme-text-muted">当前筛选:</span>
                    
                    {/* 搜索关键词标签 */}
                    {searchQuery && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        <span>搜索: {searchQuery}</span>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="ml-1 hover:bg-yellow-200 rounded-full p-0.5 transition-colors"
                          title="清除搜索"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    )}
                    
                    {/* 日期筛选标签 */}
                    {dateFilter && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-theme-primary/10 text-theme-primary rounded-full text-sm">
                        <span>日期: {format(new Date(dateFilter), 'yyyy-MM-dd')}</span>
                        <button
                          onClick={() => onDateFilter(null)}
                          className="ml-1 hover:bg-theme-primary/20 rounded-full p-0.5 transition-colors"
                          title="清除日期筛选"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    )}
                    
                    {/* 标签筛选标签 */}
                    {selectedTag && (
                      <div 
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                        style={colorDataLoaded ? getTagStyleFromState(selectedTag) : {
                          backgroundColor: '#6B7280',
                          color: '#ffffff'
                        }}
                      >
                        <span>标签: #{selectedTag}</span>
                        <button
                          onClick={() => onTagChange(null)}
                          className="ml-1 hover:bg-black/20 dark:hover:bg-white/20 rounded-full p-0.5 transition-colors"
                          title="清除标签筛选"
                        >
                          <FiX size={12} className="text-white" />
                        </button>
                      </div>
                    )}
                    
                    {/* 清除所有筛选按钮 */}
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        onDateFilter(null);
                        onTagChange(null);
                        
                        // 触发筛选清除事件，确保UI状态同步
                        window.dispatchEvent(new CustomEvent('filterCleared'));
                      }}
                      className="px-3 py-1 bg-theme-hover text-theme-text-secondary rounded-full text-sm hover:bg-theme-hover/80 transition-colors"
                      title="清除所有筛选"
                    >
                      清除所有
                    </button>
                  </div>
                )}
                
                {/* 错误提示 */}
                {error && (
                  <div className="bg-theme-danger/10 border-l-4 border-theme-danger text-theme-danger p-4 rounded mb-6" role="alert">
                    <p>{error}</p>
                  </div>
                )}

                {/* 笔记列表 */}
                {loading ? (
                  <div className="fixed inset-0 flex items-center justify-center z-10 animate-in fade-in-0 duration-300">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-500 shadow-lg mx-auto mb-4"></div>
                      <p className="text-xl font-medium text-theme-text">笔记正在加载...</p>
                    </div>
                  </div>
                ) : filteredNotes.length > 0 ? (
                  <>
                    <div className="flex flex-col items-center space-y-paper-vertical">
                      {filteredNotes.map((note, index) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onEdit={handleEditNote}
                          onDelete={handleDeleteNote}
                          onPin={handlePinNote}
                          onNoteClick={handleNoteClick}
                          notes={filteredNotes}
                          data-note-id={note.id}
                          style={{
                            animationDelay: `${index * 100}ms`,
                            animationFillMode: 'both'
                          }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState 
                    message={searchQuery ? "没有找到匹配的笔记" : "还没有笔记"}
                    subMessage={searchQuery ? "尝试其他关键词" : "开始创建你的第一个笔记吧！"}
                  />
                )}
              </>
            )}
          </div>
        </div>
        
        {/* 悬浮于所有卡片之上的创建笔记按钮 - 根据右侧边栏状态调整位置 */}
        <div className={`fixed bottom-8 z-[99999] ${showAttachmentPage ? 'right-8' : 'right-[calc(20rem+2rem)]'}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/edit');
            }}
            className="bg-yellow-400 hover:bg-yellow-500 text-white p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 group"
            title="创建新笔记"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

      </DynamicBackground>

        {/* 回到顶部按钮 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-theme-surface hover:bg-theme-hover text-theme-text border border-theme-border p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-theme-border focus:ring-offset-2 group"
          title="回到顶部"
        >
          <FiArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* 右侧边栏 - 原来的标签管理区域 */}
      {!showAttachmentPage && (
        <div 
          className={`w-80 h-screen flex flex-col fixed right-0 top-0 z-20 transform transition-all duration-500 ease-out shadow-2xl lg:shadow-none bg-theme-surface hide-scrollbar scrollbar-hide ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
        >
          {/* 标签管理区域 */}
          <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden hide-scrollbar scrollbar-hide">
            <TagManager 
              onTagsChange={(tags) => {
                setAvailableTags(tags);
                if (updateTags && typeof updateTags === 'function') {
                  updateTags(tags);
                }
              }}
              onDateChange={onDateFilter}
              selectedDate={dateFilter}
              noteDates={noteDates}
            />
          </div>

          {/* 底部快捷操作 */}
          <div className="flex-shrink-0 p-4 bg-white/10 dark:bg:black/10">
            <div className="text-xs text-theme-text opacity-70 drop-shadow-sm">
              {totalNotes}条笔记
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;