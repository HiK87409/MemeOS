import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiSun, FiMoon, FiSearch, FiX, FiTrash2, FiSave, FiList, FiArrowLeft, FiSettings } from 'react-icons/fi';
import { useTheme } from '../hooks/useTheme';
import { getTagColorClass, getTagStyle, getAllColors } from '../utils/tagColorUtils';

const Header = ({ onSearch, searchQuery = '', selectedTag, onTagChange, onOpenRecycleBin }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || '');
  const [allColors, setAllColors] = useState([]);
  const [tagColorMap, setTagColorMap] = useState({});
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 判断是否在单独页面（非首页）
  const isSinglePage = location.pathname !== '/';

  // 页面标题映射
  const getPageTitle = () => {
    const path = location.pathname;
    
    // 回收站页面 - 显示笔记数量
    if (path === '/recycle-bin') {
      const recycleBinCount = window.recycleBinCount || 0;
      return `回收站 (${recycleBinCount})`;
    }
    
    // 任务页面
    if (path === '/task/dashboard' || path.startsWith('/task/')) {
      return '任务';
    }
    
    // 备份页面
    if (path === '/enhanced-backup-manager') {
      return '备份';
    }
    
    // 统计页面
    if (path === '/font-optimization') {
      return '统计';
    }
    
    // 设置页面
    if (path === '/settings') {
      return '设置';
    }
    
    // 创建笔记页面
    if (path === '/edit') {
      return '创建笔记';
    }
    
    // 其他页面返回空字符串，不显示标题
    return '';
  };

  const pageTitle = getPageTitle();
  
  // 返回首页
  const handleGoBack = () => {
    navigate('/');
  };

  // 加载颜色数据
  useEffect(() => {
    const loadColors = async () => {
      try {
        const colors = await getAllColors();
        setAllColors(colors);
        
        // 加载标签颜色映射
        const { fetchTagColors } = await import('../api/notesApi.js');
        const tagColors = await fetchTagColors();
        
        // 服务器数据优先，同时更新本地存储
        if (Object.keys(tagColors).length > 0) {
          localStorage.setItem('tagColors', JSON.stringify(tagColors));
        }
        
        setTagColorMap(tagColors);
      } catch (error) {
        console.error('加载颜色数据失败:', error);
        // 回退到本地存储
        const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
        setTagColorMap(savedColors);
      }
    };

    loadColors();
  }, []);

  // 监听标签颜色更新事件
  useEffect(() => {
    const handleTagColorsUpdated = async (event) => {
      // 重新从服务器同步数据
      try {
        const { fetchTagColors } = await import('../api/notesApi.js');
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

    window.addEventListener('tagColorsUpdated', handleTagColorsUpdated);
    return () => {
      window.removeEventListener('tagColorsUpdated', handleTagColorsUpdated);
    };
  }, []);

  // 从状态中获取标签颜色类名
  const getTagColorFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 如果没有颜色映射，返回默认样式
    if (!colorValue) {
      return 'text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600';
    }
    
    // 如果是自定义颜色（十六进制），返回基础类，样式通过内联样式设置
    if (colorValue.startsWith('#')) {
      return 'text-white border border-gray-300 dark:border-gray-600';
    }
    
    // 预设颜色，返回基础类
    return 'text-white border border-gray-300 dark:border-gray-600';
  };

  // 从状态中获取标签样式
  const getTagStyleFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 如果没有颜色映射，返回默认背景色
    if (!colorValue) {
      return {
        backgroundColor: 'var(--theme-elevated)',
        color: 'var(--theme-text)'
      };
    }
    
    // 如果是十六进制颜色值，直接使用
    if (colorValue.startsWith('#')) {
      return {
        backgroundColor: colorValue,
        color: '#ffffff'
      };
    }
    
    // 预设颜色，直接使用十六进制值
    return {
      backgroundColor: colorValue,
      color: '#ffffff'
    };
  };
  
  // 同步外部搜索状态
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // 自动聚焦搜索框
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);


  
  // 处理搜索提交
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch && typeof onSearch === 'function') {
      onSearch(localSearchQuery.trim());
    }
    // 保持搜索框打开状态，方便用户修改搜索词
  };

  // 清除搜索
  const handleClearSearch = () => {
    setLocalSearchQuery('');
    if (onSearch && typeof onSearch === 'function') {
      onSearch('');
    }
    // 清除后自动缩小为图标
    setShowSearch(false);
  };

  // 处理搜索输入变化
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    
    // 如果内容为空，保持搜索框打开状态，让用户可以继续输入
    // 实时搜索 - 当用户停止输入500ms后自动搜索
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      if (onSearch && typeof onSearch === 'function') {
        onSearch(value.trim());
      }
      // 如果搜索内容为空且失去焦点，自动关闭
      if (!value.trim()) {
        setTimeout(() => {
          if (!searchInputRef.current || document.activeElement !== searchInputRef.current) {
            setShowSearch(false);
          }
        }, 100);
      }
    }, 500);
  };

  // 处理输入框失去焦点
  const handleSearchBlur = () => {
    // 如果搜索框为空，延迟关闭（给时间处理可能的点击事件）
    if (!localSearchQuery.trim()) {
      setTimeout(() => {
        setShowSearch(false);
      }, 150);
    }
  };

  // 处理ESC键关闭搜索
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (localSearchQuery) {
        handleClearSearch();
      } else {
        setShowSearch(false);
      }
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.user-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);



  return (
    <header 
      className="shadow-sm sticky top-0 z-10"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16">
            {/* 返回按钮 - 只在单独页面显示 */}
            {isSinglePage && (
              <button
                onClick={handleGoBack}
                className="p-4 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-theme-elevated transition-colors min-w-btn-lg min-h-btn-lg flex items-center justify-center mr-4"
                aria-label="返回首页"
                title="返回首页"
              >
                <FiArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            {/* 页面标题 */}
            {isSinglePage && pageTitle && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {pageTitle}
              </h1>
            )}
      </div>
    </header>
  );
};

export default Header;