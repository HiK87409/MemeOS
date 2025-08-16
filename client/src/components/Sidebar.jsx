import { FiX, FiHome, FiTag, FiCheckSquare, FiDatabase, FiShield, FiType } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';

import TagManager from './TagManager';
import TaskManager from './TaskManager';
import { useState, useEffect } from 'react';
import { fetchNoteDates } from '../api/notesApi';

const Sidebar = ({ isOpen, closeSidebar, tags, updateTags, dateFilter, onDateFilter }) => {
  const location = useLocation();

  const [noteDates, setNoteDates] = useState([]);

  // 加载有笔记的日期
  const loadNoteDates = async () => {
    try {
      const dates = await fetchNoteDates();
      setNoteDates(dates);
    } catch (error) {
      console.error('加载笔记日期失败:', error);
    }
  };

  useEffect(() => {
    loadNoteDates();
  }, []);
  
  return (
    <>
      {/* 移动端遮罩层 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* 侧边栏 */}
      <aside 
        className={`
          w-80 shadow-lg
          lg:block lg:relative lg:shadow-none lg:h-auto
          ${isOpen ? 'fixed top-0 left-0 z-30 h-full translate-x-0 lg:translate-x-0' : 'fixed top-0 left-0 z-30 h-full -translate-x-full lg:hidden'}
        `}
        style={{ backgroundColor: 'var(--theme-surface)' }}
      >
        <div 
          className="p-4 flex justify-between items-center lg:hidden bg-transparent"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <h2 
            className="text-lg font-semibold drop-shadow-sm"
            style={{ color: 'var(--theme-text)' }}
          >
            菜单
          </h2>
          <button 
            onClick={closeSidebar}
            className="p-2 rounded-md transition-all duration-200"
            style={{ 
              color: 'var(--theme-text)',
              ':hover': { backgroundColor: 'var(--theme-elevated)' }
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-elevated)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            aria-label="关闭菜单"
          >
            <FiX className="h-5 w-5 drop-shadow-sm" />
          </button>
        </div>
        
        {/* 桌面端顶部间距 */}
        <div className="hidden lg:block h-16"></div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <Link 
                to="/" 
                className="flex items-center p-3 rounded-lg transition-all duration-200"
                style={{
                  color: 'var(--theme-text)',
                  backgroundColor: location.pathname === '/' ? 'var(--theme-elevated)' : 'transparent',
                  boxShadow: location.pathname === '/' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/') {
                    e.target.style.backgroundColor = 'var(--theme-elevated)';
                    e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/') {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.boxShadow = 'none';
                  }
                }}
                onClick={() => closeSidebar()}
              >
                <FiHome className="mr-3 h-5 w-5 drop-shadow-sm" />
                <span className="drop-shadow-sm">首页</span>
              </Link>
            </li>
            
            {/* TagManager - 仅在小屏幕上显示 */}
            <li className="pt-4 lg:hidden">
              <div 
                className="pt-4 sidebar-tag-manager rounded-lg p-3"
                style={{ 
                  borderTop: '1px solid var(--theme-border)',
                  backgroundColor: 'var(--theme-elevated)'
                }}
              >
                <TagManager 
                  onTagsChange={updateTags}
                  onDateChange={onDateFilter}
                  selectedDate={dateFilter}
                  noteDates={noteDates}
                />
              </div>
            </li>
            
            {/* 备份管理 */}
            <li className="pt-4">
              <h3 
                className="text-sm font-semibold opacity-80 uppercase tracking-wider mb-3 px-2 drop-shadow-sm"
                style={{ color: 'var(--theme-text)' }}
              >
                数据管理
              </h3>
              <ul className="space-y-1">

                  <li>
                    <Link 
                      to="/enhanced-backup-manager" 
                      className="flex items-center p-3 rounded-lg transition-all duration-200"
                      style={{
                        color: 'var(--theme-text)',
                        backgroundColor: location.pathname === '/enhanced-backup-manager' ? 'var(--theme-elevated)' : 'transparent',
                        boxShadow: location.pathname === '/enhanced-backup-manager' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (location.pathname !== '/enhanced-backup-manager') {
                          e.target.style.backgroundColor = 'var(--theme-elevated)';
                          e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (location.pathname !== '/enhanced-backup-manager') {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                      onClick={() => closeSidebar()}
                    >
                      <FiDatabase className="mr-3 h-5 w-5 drop-shadow-sm" />
                      <span className="drop-shadow-sm"></span>
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/font-optimization" 
                      className="flex items-center p-3 rounded-lg transition-all duration-200"
                      style={{
                        color: 'var(--theme-text)',
                        backgroundColor: location.pathname === '/font-optimization' ? 'var(--theme-elevated)' : 'transparent',
                        boxShadow: location.pathname === '/font-optimization' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (location.pathname !== '/font-optimization') {
                          e.target.style.backgroundColor = 'var(--theme-elevated)';
                          e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (location.pathname !== '/font-optimization') {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                      onClick={() => closeSidebar()}
                    >
                      <FiType className="mr-3 h-5 w-5 drop-shadow-sm" />
                      <span className="drop-shadow-sm">字体优化</span>
                    </Link>
                  </li>
                </ul>
              </li>

            
            {/* TaskManager - 任务管理器 */}
            <li className="pt-4">
              <div 
                className="pt-4 sidebar-task-manager rounded-lg p-3"
                style={{ 
                  backgroundColor: 'var(--theme-elevated)'
                }}
              >
                <TaskManager />
              </div>
            </li>
            
            {tags.length > 0 && (
              <li className="pt-4">
                <h3 
                  className="text-sm font-semibold opacity-80 uppercase tracking-wider mb-3 px-2 drop-shadow-sm"
                  style={{ color: 'var(--theme-text)' }}
                >
                  标签
                </h3>
                <ul className="space-y-1">
                  {tags.map(tag => (
                    <li key={tag} className="flex items-center">
                      {/* 标签图标 - 点击筛选 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // 触发标签筛选功能
                          if (window.handleTagFilter) {
                            window.handleTagFilter(tag);
                          }
                          closeSidebar();
                        }}
                        className="p-2 rounded-lg transition-all duration-200 mr-1"
                        style={{ color: 'var(--theme-text)' }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'var(--theme-elevated)';
                          e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.boxShadow = 'none';
                        }}
                        title={`筛选标签: ${tag}`}
                      >
                        <FiTag className="h-4 w-4 drop-shadow-sm" />
                      </button>
                      
                      {/* 标签名称 - 跳转到标签页面 */}
                      <Link 
                        to={`/tags/${tag}`} 
                        className="flex-1 flex items-center p-3 pl-1 rounded-lg transition-all duration-200"
                        style={{
                          color: 'var(--theme-text)',
                          backgroundColor: location.pathname === `/tags/${tag}` ? 'var(--theme-elevated)' : 'transparent',
                          boxShadow: location.pathname === `/tags/${tag}` ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (location.pathname !== `/tags/${tag}`) {
                            e.target.style.backgroundColor = 'var(--theme-elevated)';
                            e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (location.pathname !== `/tags/${tag}`) {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        onClick={() => closeSidebar()}
                      >
                        <span className="drop-shadow-sm">{tag}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </nav>
        
        {/* 底部关闭按钮 */}
        <div className="lg:hidden">
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            <button 
              onClick={closeSidebar}
              className="w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200"
              style={{ 
                backgroundColor: 'var(--theme-elevated)',
                color: 'var(--theme-text)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--theme-primary)';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--theme-elevated)';
                e.target.style.color = 'var(--theme-text)';
              }}
              aria-label="关闭菜单"
            >
              <FiX className="h-5 w-5 mr-2" />
              <span>关闭菜单</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;