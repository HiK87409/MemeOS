import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiCheck, 
  FiCalendar, 
  FiClock, 
  FiInbox, 
  FiStar, 
  FiArchive, 
  FiChevronRight,
  FiChevronDown,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiSearch,
  FiX,
  FiFlag,
  FiCopy,
  FiMove
} from 'react-icons/fi';
import { format, isToday, isTomorrow, isWithinInterval, addDays, startOfToday, endOfToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import axios from 'axios';

const TaskDashboard = () => {
  // 状态管理
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedList, setSelectedList] = useState('inbox'); // 默认选择收件箱
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedRepeat, setSelectedRepeat] = useState('');
  
  // 右键菜单状态管理
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    task: null
  });
  
  // 收件箱状态管理
  const [inboxItems, setInboxItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 智能列表配置
  const smartLists = [
    { id: 'inbox', name: '收件箱', icon: FiInbox, color: '#3498db' }, // 将收件箱移到第一位
    { id: 'today', name: '今日', icon: FiCalendar, color: '#52c4b3' },
    { id: 'scheduled', name: '计划日程', icon: FiClock, color: '#f39c12' },
    { id: 'someday', name: '某天', icon: FiStar, color: '#9b59b6' },
    { id: 'completed', name: '已完成', icon: FiArchive, color: '#95a5a6' },
  ];

  // 示例数据初始化
  useEffect(() => {
    // 全局点击事件监听器，用于隐藏右键菜单
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        hideContextMenu();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);
  
  useEffect(() => {
    // 模拟任务数据
    const sampleTasks = [
      {
        id: '1',
        title: '完成项目报告',
        project: '项目a',
        dueDate: new Date(),
        completed: false,
        important: true,
        tags: ['办公'],
        priority: 'high'
      },
      {
        id: '2',
        title: '团队会议',
        project: '项目a',
        dueDate: new Date(),
        completed: false,
        important: false,
        tags: ['会议'],
        priority: 'medium'
      },
      {
        id: '3',
        title: '代码审查',
        project: '项目b',
        dueDate: addDays(new Date(), 1),
        completed: false,
        important: false,
        tags: ['开发'],
        priority: 'high'
      },
      {
        id: '4',
        title: '学习新技术',
        project: null,
        dueDate: null,
        completed: false,
        important: false,
        tags: ['学习'],
        priority: 'low'
      },
    ];

    // 模拟项目数据
    const sampleProjects = [
      {
        id: '1',
        name: '项目a',
        color: '#52c4b3',
        taskCount: 5,
        completedCount: 2,
        subProjects: [
          { id: '1-1', name: '前端开发', taskCount: 3, completedCount: 1 },
          { id: '1-2', name: '后端开发', taskCount: 2, completedCount: 1 },
        ]
      },
      {
        id: '2',
        name: '项目b',
        color: '#3498db',
        taskCount: 3,
        completedCount: 1,
        subProjects: []
      },
      {
        id: '3',
        name: '个人学习',
        color: '#9b59b6',
        taskCount: 2,
        completedCount: 0,
        subProjects: []
      },
    ];

    setTasks(sampleTasks);
    setProjects(sampleProjects);
    
    // 加载收件箱数据
    loadInboxData();
  }, []);
  
  // 收件箱API调用函数
  const loadInboxData = async () => {
    try {
      // 获取收件箱列表
      const response = await axios.get('/api/inbox');
      setInboxItems(response.data.data);
      
      // 获取未读数量
      const unreadResponse = await axios.get('/api/inbox/unread-count');
      setUnreadCount(unreadResponse.data.data.count);
    } catch (error) {
      console.error('加载收件箱数据失败:', error);
    }
  };
  
  const createInboxItem = async (title, content = '', source = 'card', sourceId = null) => {
    try {
      const response = await axios.post('/api/inbox', {
        title,
        content,
        source,
        source_id: sourceId
      });
      
      // 更新收件箱列表和未读数量
      setInboxItems(prev => [response.data.data, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      return response.data.data;
    } catch (error) {
      console.error('创建收件箱项目失败:', error);
      return null;
    }
  };
  
  const markInboxItemAsRead = async (id) => {
    try {
      await axios.patch(`/api/inbox/${id}/read`);
      
      // 更新收件箱列表和未读数量
      setInboxItems(prev => prev.map(item => 
        item.id === id ? { ...item, is_read: true } : item
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };
  
  // 右键菜单处理函数
  const handleContextMenu = (e, task) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      task: task
    });
  };
  
  const hideContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      task: null
    });
  };
  
  const toggleTaskImportant = (taskId) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, important: !task.important } : task
    ));
    hideContextMenu();
  };
  
  const toggleTaskCompleted = (taskId) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
    hideContextMenu();
  };
  
  const setTaskDueToday = (taskId) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, dueDate: new Date() } : task
    ));
    hideContextMenu();
  };
  
  const setTaskDueTomorrow = (taskId) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, dueDate: addDays(new Date(), 1) } : task
    ));
    hideContextMenu();
  };
  
  const setTaskCustomDate = (taskId, date) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, dueDate: new Date(date) } : task
    ));
    hideContextMenu();
  };
  
  const moveTaskToList = (taskId, listId) => {
    // 这里可以根据需要实现移动逻辑
    console.log(`移动任务 ${taskId} 到列表 ${listId}`);
    hideContextMenu();
  };
  
  const deleteTask = (taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    hideContextMenu();
  };

  // 获取当前列表的任务
  const getFilteredTasks = () => {
    const now = new Date();
    
    // 如果选择的是收件箱，返回收件箱项目
    if (selectedList === 'inbox') {
      return inboxItems;
    }
    
    switch (selectedList) {
      case 'today':
        return tasks.filter(task => 
          !task.completed && task.dueDate && isToday(task.dueDate)
        );
      case 'scheduled':
        return tasks.filter(task => 
          !task.completed && task.dueDate && !isToday(task.dueDate)
        );
      case 'someday':
        return tasks.filter(task => 
          !task.completed && task.dueDate && task.dueDate > addDays(now, 1)
        );
      case 'completed':
        return tasks.filter(task => task.completed);
      default:
        return tasks;
    }
  };

  // 计算今日进度
  const getTodayProgress = () => {
    const todayTasks = tasks.filter(task => 
      task.dueDate && isToday(task.dueDate)
    );
    const completed = todayTasks.filter(task => task.completed).length;
    const total = todayTasks.length;
    
    return total > 0 ? (completed / total) * 100 : 0;
  };

  // 解析自然语言输入
  const parseNaturalLanguage = (text) => {
    const parsed = {
      title: text,
      dueDate: null,
      tags: [],
      project: null
    };

    // 解析日期
    const dateMatches = text.match(/\b(due|截止|到期)\s+(\d{1,2}:\d{2}|今天|明天|today|tomorrow)\b/i);
    if (dateMatches) {
      const dateStr = dateMatches[2];
      if (dateStr.includes('今天') || dateStr.includes('today')) {
        parsed.dueDate = new Date();
      } else if (dateStr.includes('明天') || dateStr.includes('tomorrow')) {
        parsed.dueDate = addDays(new Date(), 1);
      } else if (dateStr.includes(':')) {
        const [hours, minutes] = dateStr.split(':').map(Number);
        const newDate = new Date();
        newDate.setHours(hours, minutes, 0, 0);
        parsed.dueDate = newDate;
      }
    }

    // 解析标签
    const tagMatches = text.match(/#([^\s#]+)/g);
    if (tagMatches) {
      parsed.tags = tagMatches.map(tag => tag.substring(1));
    }

    // 解析项目
    const projectMatches = text.match(/@([^\s@]+)/g);
    if (projectMatches) {
      parsed.project = projectMatches[0].substring(1);
    }

    return parsed;
  };

  // 创建新任务
  const createTask = () => {
    if (!newTaskText.trim()) return;

    const parsed = parseNaturalLanguage(newTaskText);
    
    // 处理日期和时间
    let dueDate = parsed.dueDate;
    if (selectedDate) {
      const date = new Date(selectedDate);
      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
      }
      dueDate = date;
    }

    const newTask = {
      id: Date.now().toString(),
      title: parsed.title,
      project: parsed.project || selectedProject,
      dueDate: dueDate,
      completed: false,
      tags: parsed.tags,
      priority: 'medium',
      repeat: selectedRepeat
    };

    setTasks([newTask, ...tasks]);
    
    // 同时创建收件箱项目
    createInboxItem(parsed.title, `来源: 卡片创建\n项目: ${parsed.project || selectedProject || '无'}\n截止日期: ${dueDate ? format(dueDate, 'yyyy-MM-dd HH:mm') : '无'}\n标签: ${parsed.tags.join(', ') || '无'}`, 'card', newTask.id);
    
    setNewTaskText('');
    setSelectedDate('');
    setSelectedTime('');
    setSelectedRepeat('');
    setShowAdvancedOptions(false);
    setShowTaskComposer(false);
  };

  // 切换任务完成状态
  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date() : null }
        : task
    ));
  };



  // 切换项目展开状态
  const toggleProject = (projectId) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // 渲染环形进度指示器
  const renderCircularProgress = (progress) => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 50 50">
          <circle
            cx="25"
            cy="25"
            r={radius}
            stroke="var(--theme-border)"
            stroke-width="4"
            fill="none"
          />
          <circle
            cx="25"
            cy="25"
            r={radius}
            stroke="var(--theme-primary)"
            stroke-width="4"
            fill="none"
            stroke-dasharray={strokeDasharray}
            stroke-dashoffset={strokeDashoffset}
            stroke-linecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
           {Math.round(progress)}%
          </div>
      </div>
    );
  };

  // 渲染项目树
  const renderProjectTree = (projectList, level = 0) => {
    return projectList.map(project => (
      <div key={project.id} className="mb-1">
        <div 
          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
            selectedList === project.id ? '' : ''
          }`}
          style={{ 
            paddingLeft: `${level * 16 + 8}px`,
            backgroundColor: selectedList === project.id ? 'var(--theme-primary)20' : 'transparent'
          }}
          onMouseOver={(e) => {
            if (selectedList !== project.id) {
              e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
            }
          }}
          onMouseOut={(e) => {
            if (selectedList !== project.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
            onClick={() => setSelectedList(project.id)}
        >
          <div className="flex items-center space-x-2">
            {project.subProjects && project.subProjects.length > 0 && (
              <button 
                onClick={(e) => {
                   e.stopPropagation();
                   toggleProject(project.id);
                  }}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--theme-text-tertiary)' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {expandedProjects.has(project.id) ? (
                   <FiChevronDown className="w-4 h-4" />
                  ) : (
                   <FiChevronRight className="w-4 h-4" />
                  )}
              </button>
            )}
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: project.color }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{project.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
              {project.completedCount}/{project.taskCount}
            </span>
            {project.taskCount > 0 && (
              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--theme-border)' }}>
                <div 
                  className="h-full transition-all duration-300"
                  style={{ 
                      width: `${(project.completedCount / project.taskCount) * 100}%`,
                     backgroundColor: project.color 
                    }}
                />
              </div>
            )}
          </div>
        </div>
        
        {project.subProjects && project.subProjects.length > 0 && expandedProjects.has(project.id) && (
          <div className="ml-2">
            {renderProjectTree(project.subProjects, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const filteredTasks = getFilteredTasks();
  const todayProgress = getTodayProgress();

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--theme-bg)' }}>
      {/* 左侧边栏 */}
        <div className="w-64 border-r border-gray-200 flex flex-col" style={{ backgroundColor: 'var(--theme-surface)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
          <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>任务管理</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* 智能列表 */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-text-tertiary)' }}>
              智能列表
            </h2>
            <div className="space-y-1">
              {smartLists.map(list => {
                const icon = React.createElement(list.icon, { 
                  className: `w-4 h-4 ${selectedList === list.id ? 'text-white' : ''}` 
                });
                
                return (
                  <div
                key={list.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          selectedList === list.id 
            ? 'text-white' 
            : ''
        }`}
                style={{ 
          backgroundColor: selectedList === list.id ? list.color : 'transparent',
          color: selectedList === list.id ? 'white' : 'var(--theme-text)'
        }}
                onMouseOver={(e) => {
                  if (selectedList !== list.id) {
                    e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedList !== list.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                onClick={() => setSelectedList(list.id)}
              >
                    <div className="flex items-center space-x-3">
                      {icon}
                      <span className="text-sm font-medium">{list.name}</span>
                      {list.id === 'inbox' && unreadCount > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--theme-error)', color: 'white' }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {list.id === 'today' && renderCircularProgress(todayProgress)}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 项目文件夹 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-tertiary)' }}>
                项目
              </h2>
              <button 
                className="transition-colors"
                style={{ color: 'var(--theme-text-secondary)' }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--theme-text)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
               {renderProjectTree(projects)}
              </div>
          </div>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部栏 */}
        <div className="px-6 py-4" style={{ backgroundColor: 'var(--theme-surface)', borderBottom: '1px solid var(--theme-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
                 {smartLists.find(l => l.id === selectedList)?.name || '项目任务'}
                </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
                {filteredTasks.length} 个任务
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--theme-text-secondary)' }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = 'var(--theme-text)';
                  e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'var(--theme-text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FiSearch className="w-5 h-5" />
              </button>
              <button 
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--theme-text-secondary)' }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = 'var(--theme-text)';
                  e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'var(--theme-text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => setShowTaskComposer(true)}
              >
                <FiPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* 任务列表 */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-text-tertiary)' }}>
              <FiInbox className="w-16 h-16 mb-4" />
              <p className="text-lg">
                {selectedList === 'inbox' ? '收件箱为空' : '暂无任务'}
              </p>
              <p className="text-sm mt-1">
                {selectedList === 'inbox' ? '创建任务后会自动出现在这里' : '点击 + 按钮创建新任务'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(item => {
                // 如果是收件箱项目，使用不同的渲染方式
                if (selectedList === 'inbox') {
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border hover:shadow-md transition-all duration-200 ${!item.is_read ? 'border-l-4' : ''}`}
                      style={{ 
                        backgroundColor: 'var(--theme-elevated)',
                        borderColor: 'var(--theme-border)',
                        borderLeftColor: !item.is_read ? 'var(--theme-primary)' : 'var(--theme-border)'
                      }}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => markInboxItemAsRead(item.id)}
                          className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                            item.is_read ? '' : ''
                          }`}
                          style={{ 
                            backgroundColor: item.is_read ? 'var(--theme-text-tertiary)' : 'var(--theme-primary)',
                            borderColor: item.is_read ? 'var(--theme-text-tertiary)' : 'var(--theme-primary)',
                            color: 'white'
                          }}
                        >
                          {item.is_read && <FiCheck className="w-3 h-3" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.is_read ? '' : 'font-medium'}`} style={{ color: item.is_read ? 'var(--theme-text-secondary)' : 'var(--theme-text)' }}>
                            {item.title}
                          </p>
                          
                          {item.content && (
                            <p className="text-xs mt-1 whitespace-pre-line" style={{ color: 'var(--theme-text-tertiary)' }}>
                              {item.content}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--theme-elevated)', color: 'var(--theme-text)' }}>
                                来源: {item.source === 'card' ? '卡片' : item.source}
                              </span>
                            </div>
                            
                            {item.created_at && (
                              <div className="flex items-center space-x-1 text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
                                <FiClock className="w-3 h-3" />
                                <span>
                                  {format(new Date(item.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 右键菜单替代了删除按钮 */}
                      </div>
                    </div>
                  );
                }
                
                // 原有的任务渲染逻辑
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border hover:shadow-md transition-all duration-200"
                    style={{ 
                      backgroundColor: 'var(--theme-elevated)',
                      borderColor: 'var(--theme-border)'
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => toggleTask(item.id)}
                        className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                          item.completed ? '' : ''
                        }`}
                        style={{ 
                          backgroundColor: item.completed ? 'var(--theme-success)' : 'transparent',
                          borderColor: item.completed ? 'var(--theme-success)' : 'var(--theme-border)',
                          color: item.completed ? 'white' : 'transparent'
                        }}
                        onMouseOver={(e) => {
                          if (!item.completed) {
                            e.currentTarget.style.borderColor = 'var(--theme-success)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!item.completed) {
                            e.currentTarget.style.borderColor = 'var(--theme-border)';
                          }
                        }}
                      >
                        {item.completed && <FiCheck className="w-3 h-3" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.completed ? 'line-through' : ''}`} style={{ color: item.completed ? 'var(--theme-text-tertiary)' : 'var(--theme-text)' }}>
                          {item.title}
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-2">
                          {item.project && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--theme-primary)20', color: 'var(--theme-primary)' }}>
                              @{item.project}
                            </span>
                          )}
                          
                          {item.dueDate && (
                            <div className="flex items-center space-x-1 text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
                              <FiClock className="w-3 h-3" />
                              <span>
                                {format(item.dueDate, 'MM-dd HH:mm', { locale: zhCN })}
                              </span>
                            </div>
                          )}
                          
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              {item.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--theme-elevated)', color: 'var(--theme-text)' }}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 右键菜单替代了编辑和删除按钮 */}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      

      
      {/* 任务创建浮层 */}
      {showTaskComposer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="w-full max-w-2xl rounded-t-2xl shadow-2xl transform transition-all duration-300" style={{ backgroundColor: 'var(--theme-surface)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>新建任务</h3>
                <button 
                  onClick={() => setShowTaskComposer(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--theme-text-secondary)' }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = 'var(--theme-text)';
                    e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = 'var(--theme-text-secondary)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* 主要输入区域 */}
                <div className="flex items-end space-x-3 mb-3">
                  <div className="flex-1 relative">
                    {/* SVG图标放在输入框内部左侧，+号和圆圈互斥显示 */}
                    {newTaskText === '' ? (
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center justify-center">
                        <FiPlus className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
                      </div>
                    ) : (
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none w-5 h-5 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--theme-text)', backgroundColor: 'transparent' }} />
                    )}
                    
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createTask()}
                      placeholder="添加新任务..."
                      className="w-full pl-12 pr-4 py-3 bg-transparent border-2 rounded-full focus:outline-none transition-all duration-200"
                      style={{ 
                        color: 'var(--theme-text)', 
                        borderColor: 'var(--theme-border)',
                        boxShadow: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--theme-primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px var(--theme-primary)20';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--theme-border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      autoFocus
                    />
                  </div>
                </div>
                
                {/* 快捷选项按钮 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {/* 列表按钮 */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          const listDropdown = document.getElementById('list-dropdown');
                          listDropdown.classList.toggle('hidden');
                        }}
                        className="flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors duration-200"
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-surface)'}
                      >
                        <FiInbox className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
                        <span className="text-sm" style={{ color: 'var(--theme-text)' }}>列表</span>
                        <FiChevronDown className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)' }} />
                      </button>
                      <div id="list-dropdown" className="hidden absolute bottom-full left-0 mb-2 w-48 rounded-lg shadow-lg z-50" style={{ backgroundColor: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}>
                        <div className="py-2">
                          {smartLists.map(list => {
                            const icon = React.createElement(list.icon, { className: "w-4 h-4", style: { color: 'var(--theme-text-secondary)' } });
                            return (
                              <button
                                key={list.id}
                                onClick={() => {
                                  setSelectedList(list.id);
                                  document.getElementById('list-dropdown').classList.add('hidden');
                                }}
                                className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                                style={{ color: 'var(--theme-text)' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {icon}
                                <span className="text-sm" style={{ color: 'var(--theme-text)' }}>{list.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* 日期按钮 */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          const dateInput = document.getElementById('date-input');
                          dateInput.focus();
                        }}
                        className="flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors duration-200"
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-surface)'}
                      >
                        <FiCalendar className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
                        <span className="text-sm" style={{ color: 'var(--theme-text)' }}>日期</span>
                      </button>
                      <input
                        id="date-input"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="absolute bottom-full left-0 mb-2 w-48 px-3 py-2 border rounded-lg focus:outline-none opacity-0 pointer-events-none"
                        style={{ 
                          backgroundColor: 'var(--theme-surface)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-text)',
                          boxShadow: 'none'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.boxShadow = '0 0 0 2px var(--theme-primary)20';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    
                    {/* 时间按钮 */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          const timeInput = document.getElementById('time-input');
                          timeInput.focus();
                        }}
                        className="flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors duration-200"
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-surface)'}
                      >
                        <FiClock className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
                        <span className="text-sm" style={{ color: 'var(--theme-text)' }}>时间</span>
                      </button>
                      <input
                        id="time-input"
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="absolute bottom-full left-0 mb-2 w-48 px-3 py-2 border rounded-lg focus:outline-none opacity-0 pointer-events-none"
                        style={{ 
                          backgroundColor: 'var(--theme-surface)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-text)',
                          boxShadow: 'none'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.boxShadow = '0 0 0 2px var(--theme-primary)20';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    
                    {/* 重复按钮 */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          const repeatDropdown = document.getElementById('repeat-dropdown');
                          repeatDropdown.classList.toggle('hidden');
                        }}
                        className="flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors duration-200"
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-surface)'}
                      >
                        <FiArchive className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
                        <span className="text-sm" style={{ color: 'var(--theme-text)' }}>重复</span>
                        <FiChevronDown className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)' }} />
                      </button>
                      <div id="repeat-dropdown" className="hidden absolute bottom-full left-0 mb-2 w-48 rounded-lg shadow-lg z-50" style={{ backgroundColor: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}>
                        <div className="py-2">
                          {[
                            { value: '', label: '不重复' },
                            { value: 'daily', label: '每天' },
                            { value: 'weekly', label: '每周' },
                            { value: 'monthly', label: '每月' },
                            { value: 'yearly', label: '每年' }
                          ].map(option => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setSelectedRepeat(option.value);
                                document.getElementById('repeat-dropdown').classList.add('hidden');
                              }}
                              className="w-full px-4 py-2 text-left text-sm transition-colors"
                              style={{ color: 'var(--theme-text)' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 当前选择状态显示 */}
                  <div className="flex items-center space-x-2 text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
                    {selectedDate && (
                      <span className="flex items-center space-x-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--theme-primary)20', color: 'var(--theme-primary)' }}>
                        <FiCalendar className="w-3 h-3" />
                        <span>{selectedDate}</span>
                      </span>
                    )}
                    {selectedTime && (
                      <span className="flex items-center space-x-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--theme-success)20', color: 'var(--theme-success)' }}>
                        <FiClock className="w-3 h-3" />
                        <span>{selectedTime}</span>
                      </span>
                    )}
                    {selectedRepeat && (
                      <span className="flex items-center space-x-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--theme-accent)20', color: 'var(--theme-accent)' }}>
                        <FiArchive className="w-3 h-3" />
                        <span>{selectedRepeat === 'daily' ? '每天' : selectedRepeat === 'weekly' ? '每周' : selectedRepeat === 'monthly' ? '每月' : '每年'}</span>
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 自动解析预览 */}
                {newTaskText && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-elevated)' }}>
                    <p className="text-xs mb-2" style={{ color: 'var(--theme-text-tertiary)' }}>自动解析：</p>
                    <div className="flex flex-wrap gap-2">
                      {parseNaturalLanguage(newTaskText).dueDate && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--theme-primary)20', color: 'var(--theme-primary)' }}>
                          <FiClock className="w-3 h-3 mr-1" />
                          {format(parseNaturalLanguage(newTaskText).dueDate, 'MM-dd HH:mm')}
                        </span>
                      )}
                      {parseNaturalLanguage(newTaskText).project && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--theme-success)20', color: 'var(--theme-success)' }}>
                          @{parseNaturalLanguage(newTaskText).project}
                        </span>
                      )}
                      {parseNaturalLanguage(newTaskText).tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--theme-accent)20', color: 'var(--theme-accent)' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 操作按钮 */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowTaskComposer(false)}
                    className="px-4 py-2 rounded-lg font-medium transition-colors"
                    style={{ color: 'var(--theme-text-secondary)' }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--theme-text)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
                  >
                    取消
                  </button>
                  <button
                    onClick={createTask}
                    disabled={!newTaskText.trim()}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      newTaskText.trim() ? '' : 'cursor-not-allowed'
                    }`}
                    style={{ 
                      backgroundColor: newTaskText.trim() ? 'var(--theme-primary)' : 'var(--theme-border)',
                      color: newTaskText.trim() ? 'white' : 'var(--theme-text-tertiary)'
                    }}
                    onMouseOver={(e) => {
                      if (newTaskText.trim()) {
                        e.currentTarget.style.backgroundColor = 'var(--theme-primary)80';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (newTaskText.trim()) {
                        e.currentTarget.style.backgroundColor = 'var(--theme-primary)';
                      }
                    }}
                  >
                    创建任务
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 rounded-lg shadow-lg border"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            minWidth: '200px'
          }}
          onClick={hideContextMenu}
        >
          <div className="py-1">
            {/* 根据任务类型显示不同的菜单选项 */}
            {selectedList === 'inbox' ? (
              // 收件箱项目的菜单选项
              <>
                {/* 标记为已读/未读 */}
                <button
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                  style={{ color: 'var(--theme-text)' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => markInboxItemAsRead(contextMenu.task.id)}
                >
                  <FiCheck className="w-4 h-4" style={{ color: contextMenu.task.is_read ? 'var(--theme-success)' : 'var(--theme-text-secondary)' }} />
                  <span className="text-sm">标记为{contextMenu.task.is_read ? '未读' : '已读'}</span>
                </button>
                
                <div className="border-t my-1" style={{ borderColor: 'var(--theme-border)' }} />
                
                {/* 删除收件箱项目 */}
                <button
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                  style={{ color: 'var(--theme-error)' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-error)20'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => {
                    setInboxItems(prev => prev.filter(i => i.id !== contextMenu.task.id));
                    if (!contextMenu.task.is_read) {
                      setUnreadCount(prev => Math.max(0, prev - 1));
                    }
                    hideContextMenu();
                  }}
                >
                  <FiTrash2 className="w-4 h-4" />
                  <span className="text-sm">从收件箱中删除</span>
                </button>
              </>
            ) : (
              // 普通任务的菜单选项
              <>
                {/* 标记为重要 */}
                <button
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                  style={{ color: 'var(--theme-text)' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => toggleTaskImportant(contextMenu.task.id)}
                >
                  <FiStar className="w-4 h-4" style={{ color: contextMenu.task.important ? 'var(--theme-warning)' : 'var(--theme-text-secondary)' }} />
                  <span className="text-sm">标记为重要</span>
                </button>
                
                {/* 标记为已完成 */}
                <button
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                  style={{ color: 'var(--theme-text)' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => toggleTaskCompleted(contextMenu.task.id)}
                >
                  <FiCheck className="w-4 h-4" style={{ color: contextMenu.task.completed ? 'var(--theme-success)' : 'var(--theme-text-secondary)' }} />
                  <span className="text-sm">标记为已完成</span>
                </button>
              </>
            )}
            
            {/* 只在普通任务中显示日期和移动选项 */}
            {selectedList !== 'inbox' && (
              <>
                <div className="border-t my-1" style={{ borderColor: 'var(--theme-border)' }} />
                
                {/* 今天到期 */}
                <button
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                  style={{ color: 'var(--theme-text)' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setTaskDueToday(contextMenu.task.id)}
                >
                  <FiCalendar className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm">今天到期</span>
                </button>
                
                {/* 明天到期 */}
                <button
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                  style={{ color: 'var(--theme-text)' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setTaskDueTomorrow(contextMenu.task.id)}
                >
                  <FiCalendar className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                  <span className="text-sm">明天到期</span>
                </button>
                
                {/* 选择日期 */}
                <div className="relative">
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                    style={{ color: 'var(--theme-text)' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FiClock className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
                    <span className="text-sm">选择日期</span>
                  </button>
                  <input
                    type="date"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setTaskCustomDate(contextMenu.task.id, e.target.value)}
                  />
                </div>
                
                <div className="border-t my-1" style={{ borderColor: 'var(--theme-border)' }} />
                
                {/* 将任务移动到（列表） */}
                <div className="relative group">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors"
                    style={{ color: 'var(--theme-text)' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div className="flex items-center space-x-3">
                      <FiMove className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
                      <span className="text-sm">将任务移动到（列表）</span>
                    </div>
                    <FiChevronRight className="w-3 h-3" style={{ color: 'var(--theme-text-tertiary)' }} />
                  </button>
                  <div className="absolute left-full top-0 ml-1 w-48 rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                    <div className="py-1">
                      {smartLists.map(list => {
                        const icon = React.createElement(list.icon, { className: "w-4 h-4", style: { color: 'var(--theme-text-secondary)' } });
                        return (
                          <button
                            key={list.id}
                            onClick={() => moveTaskToList(contextMenu.task.id, list.id)}
                            className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
                            style={{ color: 'var(--theme-text)' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {icon}
                            <span className="text-sm">{list.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="border-t my-1" style={{ borderColor: 'var(--theme-border)' }} />
                
                {/* 删除任务/收件箱项目 */}
            <button
              className="w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors"
              style={{ color: 'var(--theme-error)' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-error)20'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => deleteTask(contextMenu.task.id)}
            >
              <FiTrash2 className="w-4 h-4" />
              <span className="text-sm">
                {selectedList === 'inbox' ? '从收件箱中删除' : '删除任务'}
              </span>
            </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDashboard;