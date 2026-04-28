import { useState, useEffect, useRef } from 'react';
import { FiTag, FiChevronDown, FiCheck } from 'react-icons/fi';
import { fetchAllTags } from '../api/notesApi';
import { getTagColorClass, getTagStyle, getAllColors } from '../utils/tagColorUtils';

const TagFilter = ({ selectedTag, onTagChange, className = '' }) => {
  // 预设颜色列表
  const commonColors = [
    { name: '天蓝色', value: 'blue', hexColor: '#3B82F6' },
    { name: '翠绿色', value: 'green', hexColor: '#10B981' },
    { name: '紫罗兰', value: 'purple', hexColor: '#8B5CF6' },
    { name: '橙黄色', value: 'orange', hexColor: '#F59E0B' },
    { name: '玫瑰红', value: 'rose', hexColor: '#F43F5E' },
    { name: '青色', value: 'cyan', hexColor: '#06B6D4' },
    { name: '粉色', value: 'pink', hexColor: '#EC4899' },
    { name: '灰色', value: 'gray', hexColor: '#6B7280' },
    { name: '琥珀色', value: 'amber', hexColor: '#FBBF24' },
    { name: '靛蓝色', value: 'indigo', hexColor: '#6366F1' },
    { name: '石灰色', value: 'lime', hexColor: '#84CC16' },
    { name: '红色', value: 'red', hexColor: '#EF4444' },
    { name: '青柠色', value: 'teal', hexColor: '#14B8A6' },
    { name: '天际蓝', value: 'sky', hexColor: '#0EA5E9' },
    { name: '祖母绿', value: 'emerald', hexColor: '#059669' }
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allColors, setAllColors] = useState([]);
  const [tagColorMap, setTagColorMap] = useState(() => {
    try {
      const saved = localStorage.getItem('tagColors');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [colorDataLoaded, setColorDataLoaded] = useState(false);
  const dropdownRef = useRef(null);

  // 加载颜色数据和标签颜色映射
  useEffect(() => {
    const loadColorsAndTagColors = async () => {
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
              return {};
            }
          })()
        ]);
        
        setAllColors(colors);
        
        // 服务器数据优先，同时更新本地存储
        if (Object.keys(tagColors).length > 0) {
          localStorage.setItem('tagColors', JSON.stringify(tagColors));
        }
        
        setTagColorMap(tagColors);
        setColorDataLoaded(true);
      } catch (error) {
        console.error('加载颜色失败:', error);
        // 如果加载失败，使用默认颜色
        setAllColors([
          { name: '石板色', class: 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100', value: 'slate', hexColor: '#64748B' }
        ]);
        setTagColorMap({});
        setColorDataLoaded(true);
      }
    };
    
    loadColorsAndTagColors();
  }, []);

  // 监听标签颜色更新事件
  useEffect(() => {
    const handleTagColorsUpdated = async (event) => {
      const { tagName, color } = event.detail || {};
      
      // 优先使用事件携带的新颜色数据直接更新本地状态，避免从服务器获取旧数据导致颜色闪回默认值
      if (tagName && color) {
        setTagColorMap(prev => ({
          ...prev,
          [tagName]: color
        }));
        
        try {
          const savedColors = JSON.parse(localStorage.getItem('tagColors') || '{}');
          savedColors[tagName] = color;
          localStorage.setItem('tagColors', JSON.stringify(savedColors));
        } catch (e) {
          // ignore
        }
      }
    };

    window.addEventListener('tagColorsUpdated', handleTagColorsUpdated);
    return () => {
      window.removeEventListener('tagColorsUpdated', handleTagColorsUpdated);
    };
  }, []);

  // 不再自动关闭下拉菜单，需要手动点击按钮或选择标签才关闭
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
  //       setIsOpen(false);
  //     }
  //   };

  //   if (isOpen) {
  //     document.addEventListener('mousedown', handleClickOutside);
  //     return () => document.removeEventListener('mousedown', handleClickOutside);
  //   }
  // }, [isOpen]);

  // 加载标签列表
  useEffect(() => {
    const loadTags = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        const allTags = await fetchAllTags();
        setTags(allTags || []);
      } catch (error) {
        console.error('加载标签失败:', error);
        setTags([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTags();
  }, [isOpen]);

  const handleTagSelect = (tag) => {
    // 如果选择的是已选中的标签，则取消筛选
    if (selectedTag === tag) {
      onTagChange(null);
    } else {
      onTagChange(tag);
    }
    // 选择标签后不自动关闭菜单，保持常驻状态
    // setIsOpen(false);
  };

  // 获取标签颜色的辅助函数
  const getTagColorFromState = (tagName) => {
    const colorValue = tagColorMap[tagName];
    
    // 如果有颜色映射，返回白色文字样式
    if (colorValue) {
      return 'text-white border border-gray-300 dark:border-gray-600';
    }
    
    // 没有颜色映射，返回默认蓝色背景的白色文字样式
    return 'text-white border border-gray-300 dark:border-gray-600';
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
    
    // 如果没有颜色映射，使用默认灰色（与TagManager一致）
    return {
      backgroundColor: '#9CA3AF',
      color: '#ffffff'
    };
  };

  const clearFilter = (e) => {
    e.stopPropagation();
    onTagChange(null);
  };



  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 标签筛选按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center justify-center px-3 py-2 h-10 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-theme-elevated transition-colors"
      >
        <FiTag className="h-4 w-4 text-gray-900 dark:text-gray-100" />
        <span className="text-gray-900 dark:text-gray-100 mt-1">
          {selectedTag ? (
            <span 
              className={`text-xs ${getTagColorFromState(selectedTag)}`}
              style={getTagStyleFromState(selectedTag)}
            >
              #{selectedTag}
            </span>
          ) : (
            '选择标签'
          )}
        </span>
        <FiChevronDown className={`h-4 w-4 text-gray-900 dark:text-gray-100 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-50 max-h-80 overflow-y-auto scrollbar-hide smooth-scroll-container scrollbar-smooth">
          {/* 清除选择 */}
          <button
            type="button"
            onClick={() => {
              onTagChange('');
              // 点击显示所有标签后也不自动关闭菜单
              // setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-theme-elevated border-b border-gray-200 dark:border-gray-600"
          >
            显示所有标签
          </button>

          {/* 标签列表 */}
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">加载中...</div>
          ) : tags.length > 0 ? (
            <div className="py-1">
              {tags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    onTagChange(tag);
                    // 选择标签后不自动关闭菜单
                    // setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                  selectedTag === tag ? 'bg-theme-elevated' : ''
                }`}
                >
                  <span 
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getTagColorFromState(tag)}`}
                    style={getTagStyleFromState(tag)}
                  >
                    #{tag}
                  </span>
                  {selectedTag === tag && (
                    <FiCheck className="h-4 w-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">暂无标签</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagFilter;
