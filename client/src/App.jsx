import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { EditProvider, useEdit } from './contexts/EditContext';
import { waitForInit } from './utils/localConfigManager';
import Header from './components/header';
import DynamicBackground from './components/DynamicBackground';

import { ToastContainer } from './components/Toast';
import HomePage from './pages/HomePage';
import TagsPage from './pages/TagsPage';
import DatePage from './pages/DatePage';
import CalendarView from './pages/CalendarView';


import RecycleBinPage from './pages/RecycleBinPage';
import EnhancedBackupManagerPage from './pages/enhancedbackupmanagerpage';
import Debug from './pages/Debug';
import RecycleBin from './components/RecycleBin';
import BackupManager from './components/BackupManager';
import NoteEditPage from './pages/NoteEditPage';
import FullScreenEditorDemo from './pages/FullScreenEditorDemo';
import BlockSuiteEditorDemo from './pages/BlockSuiteEditorDemo';
import FontOptimizationPage from './pages/FontOptimizationPage';
import SettingsPage from './pages/SettingsPage';

// 任务管理相关组件
import TaskDashboard from './pages/taskdashboard';
import NoteTasksPage from './pages/NoteTasksPage';
import ProjectView from './pages/projectview';
import TaskComposer from './components/TaskComposer';

import websocketService from './utils/websocket';


function AppContentWithEdit() {
  console.log('🚀 AppContentWithEdit组件开始渲染');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [dateFilter, setDateFilter] = useState(null);

  const [tags, setTags] = useState([]);

  const [currentNote, setCurrentNote] = useState(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  
  // 任务管理相关状态
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { stopEditing } = useEdit();
  
  console.log('✅ AppContentWithEdit状态初始化完成');

  // WebSocket连接初始化
  useEffect(() => {
    // 获取当前用户信息（这里需要根据实际的认证上下文调整）
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user) {
      // 初始化WebSocket连接
      websocketService.connect(user.id, user.token);
      
      // 监听连接状态变化
      const handleConnectionChange = (isConnected) => {
        setIsWebSocketConnected(isConnected);
        console.log('WebSocket连接状态:', isConnected ? '已连接' : '已断开');
      };
      
      // 监听引用更新事件
      const handleReferencesUpdated = (data) => {
        console.log('收到引用更新事件:', data);
        // 触发全局事件，通知其他组件更新引用数据
        window.dispatchEvent(new CustomEvent('NOTE_REFERENCES_UPDATED', { detail: data }));
      };
      
      // 注册事件监听器
      websocketService.on('connectionChanged', handleConnectionChange);
      websocketService.on('NOTE_REFERENCES_UPDATED', handleReferencesUpdated);
      
      return () => {
        // 清理事件监听器
        websocketService.off('connectionChanged', handleConnectionChange);
        websocketService.off('NOTE_REFERENCES_UPDATED', handleReferencesUpdated);
        
        // 断开WebSocket连接
        websocketService.disconnect();
      };
    }
  }, []);

  // 全局点击处理，点击空白区域取消编辑 - 已禁用
  // useEffect(() => {
  //   const handleGlobalClick = (event) => {
  //     // 检查点击的元素是否在编辑器或相关组件内
  //     if (!event.target.closest('.note-editor, .menu-container, .tag-selector, .date-picker, .react-datepicker, .react-datepicker-wrapper, .react-datepicker-popper, .note-card, input[type="checkbox"], .task-list-item, .prose, .mood-selector, .weather-selector, .portal-popup, [data-portal-popup], .mood-selector-popup, .weather-selector-popup')) {
  //       stopEditing();
  //     }
  //   };

  //   document.addEventListener('mousedown', handleGlobalClick);
  //   return () => {
  //     document.removeEventListener('mousedown', handleGlobalClick);
  //   };
  // }, [stopEditing]);

  // 处理搜索
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // 处理标签变化
  const handleTagChange = (tag) => {
    // 处理标签对象或标签名称
    const tagName = typeof tag === 'object' && tag !== null ? tag.name : tag;
    setSelectedTag(tagName);
  };

  // 处理标签筛选（从侧边栏触发）
  const handleTagFilter = useCallback((tag) => {
    setSelectedTag(tag);
    // 如果当前不在主页，跳转到主页并应用筛选
    if (location.pathname !== '/') {
      navigate('/');
    }
  }, [location.pathname, navigate]);

  // 绑定全局标签筛选函数
  useEffect(() => {
    window.handleTagFilter = handleTagFilter;
    return () => {
      delete window.handleTagFilter;
    };
  }, [handleTagFilter]);

  // 处理日期筛选变化
  const handleDateFilter = (date) => {
    setDateFilter(date);
  };



  // 更新标签列表
  const updateTags = (newTags) => {
    setTags(newTags || []);
  };



  // 处理笔记恢复
  const handleNoteRestore = (note) => {
    setCurrentNote(note);
    // 这里可以添加更多的恢复逻辑，比如刷新笔记列表等
  };

  // 任务管理相关函数
  const handleCreateTask = () => {
    setCurrentTask(null);
    setShowTaskComposer(true);
  };

  const handleEditTask = (task) => {
    setCurrentTask(task);
    setShowTaskComposer(true);
  };

  const handleSaveTask = (taskData) => {
    console.log('保存任务:', taskData);
    // 这里可以添加任务保存逻辑，比如保存到状态管理或数据库
    setShowTaskComposer(false);
    setCurrentTask(null);
  };

  const handleCloseTaskComposer = () => {
    setShowTaskComposer(false);
    setCurrentTask(null);
  };

  // 判断是否显示Header（在非首页页面显示）
  const shouldShowHeader = location.pathname !== '/' && !location.pathname.startsWith('/task');

  return (
    <DynamicBackground className="min-h-screen" type="bg">
      <ToastContainer />
      {shouldShowHeader && (
        <Header
          onSearch={handleSearch}
          searchQuery={searchQuery}
          selectedTag={selectedTag}
          onTagChange={handleTagChange}
        />
      )}
      
      <div className="flex">
        {/* 主内容区域 */}
        <main className="w-full">
          <Routes>
              {/* 调试页面 */}
              <Route path="/debug" element={<Debug />} />
              
              {/* 主页路由 - 不再需要保护，直接访问 */}
              <Route path="/" element={
                <HomePage 
                  onSearch={handleSearch}
                  searchQuery={searchQuery}
                  selectedTag={selectedTag}
                  onTagChange={handleTagChange}
                  updateTags={updateTags}
                  dateFilter={dateFilter}
                  onDateFilter={handleDateFilter}
                />
              } />

              <Route path="/tags/:tagName" element={<TagsPage />} />
              <Route path="/date/:date" element={<DatePage />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/tasks" element={<Navigate to="/task/dashboard" replace />} />

              <Route path="/recycle-bin" element={<RecycleBinPage />} />
              <Route path="/enhanced-backup-manager" element={<EnhancedBackupManagerPage />} />
              <Route path="/edit" element={<NoteEditPage />} />
              <Route path="/fullscreen-editor" element={<FullScreenEditorDemo />} />
              <Route path="/blocksuite-editor" element={<BlockSuiteEditorDemo />} />
              <Route path="/font-optimization" element={<FontOptimizationPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* 任务管理相关路由 */}
              <Route path="/task/dashboard" element={
                <TaskDashboard 
                  onCreateTask={handleCreateTask}
                  onEditTask={handleEditTask}
                />
              } />
              <Route path="/task/project/:projectId" element={
                <ProjectView 
                  onEditTask={handleEditTask}
                />
              } />
              <Route path="/note-tasks" element={
                <NoteTasksPage />
              } />
              
              {/* 默认重定向 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </main>
      </div>
      
      {/* 任务创建/编辑浮层 */}
      <TaskComposer
        isOpen={showTaskComposer}
        onClose={handleCloseTaskComposer}
        onSave={handleSaveTask}
        initialTask={currentTask}
        availableProjects={[
          { id: '1', name: '项目A', color: '#52C4B3' },
          { id: '2', name: '项目B', color: '#3B82F6' },
          { id: '3', name: '项目C', color: '#8B5CF6' }
        ]}
        availableTags={[
          { id: '1', name: '工作' },
          { id: '2', name: '个人' },
          { id: '3', name: '紧急' },
          { id: '4', name: '重要' }
        ]}
      />
    </DynamicBackground>
  );
}

function AppContent() {
  return (
    <EditProvider>
      <AppContentWithEdit />
    </EditProvider>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔄 正在初始化配置管理器...');
        await waitForInit();
        console.log('✅ 配置管理器初始化完成');

      } catch (error) {
        console.error('❌ 应用初始化失败:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  return (
    <ThemeProvider>
      {isInitialized ? (
        <AppContent />
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-theme-bg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">正在初始化 灰灰笔记...</p>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;