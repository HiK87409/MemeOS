import React, { useState, useEffect } from 'react';
import { 
  FiArrowLeft, 
  FiSettings, 
  FiCheck, 
  FiCalendar, 
  FiStar, 
  FiTag, 
  FiPlus, 
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiChevronRight,
  FiChevronDown,
  FiArchive,
  FiFilter,
  FiShare2
} from 'react-icons/fi';
import { format, isPast, isWithinInterval, addDays, startOfToday, endOfToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const ProjectView = ({ projectId, onBack }) => {
  // 状态管理
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [groupMode, setGroupMode] = useState('date'); // date, priority, tag
  const [archivedProjects, setArchivedProjects] = useState([]);
  
  // 示例项目数据
  const sampleProject = {
    id: projectId || '1',
    name: '项目a',
    color: '#52c4b3',
    description: '这是一个重要的项目，包含多个任务和子项目',
    createdAt: new Date('2024-01-01'),
    taskCount: 8,
    completedCount: 3,
    subProjects: [
      { id: '1-1', name: '前端开发', taskCount: 4, completedCount: 2 },
      { id: '1-2', name: '后端开发', taskCount: 3, completedCount: 1 },
      { id: '1-3', name: '测试部署', taskCount: 1, completedCount: 0 },
    ]
  };

  // 示例任务数据
  const sampleTasks = [
    {
      id: '1',
      title: '完成项目需求分析',
      project: '项目a',
      subproject: '前端开发',
      dueDate: new Date(),
      completed: true,
      tags: ['需求'],
      priority: 'high',
      completedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      title: '设计ui界面',
      project: '项目a',
      subproject: '前端开发',
      dueDate: addDays(new Date(), 2),
      completed: false,
      tags: ['设计', 'ui'],
      priority: 'high'
    },
    {
      id: '3',
      title: '开发核心功能',
      project: '项目a',
      subproject: '前端开发',
      dueDate: addDays(new Date(), 5),
      completed: false,
      tags: ['开发'],
      priority: 'medium'
    },
    {
      id: '4',
      title: 'api接口设计',
      project: '项目a',
      subproject: '后端开发',
      dueDate: addDays(new Date(), 3),
      completed: true,
      tags: ['api', '后端'],
      priority: 'high',
      completedAt: new Date('2024-01-18')
    },
    {
      id: '5',
      title: '数据库设计',
      project: '项目a',
      subproject: '后端开发',
      dueDate: addDays(new Date(), 7),
      completed: false,
      tags: ['数据库'],
      priority: 'medium'
    },
    {
      id: '6',
      title: '编写测试用例',
      project: '项目a',
      subproject: '测试部署',
      dueDate: addDays(new Date(), 10),
      completed: false,
      tags: ['测试'],
      priority: 'low'
    },
    {
      id: '7',
      title: '部署到生产环境',
      project: '项目a',
      subproject: '测试部署',
      dueDate: addDays(new Date(), 15),
      completed: false,
      tags: ['部署'],
      priority: 'high'
    },
    {
      id: '8',
      title: '项目文档整理',
      project: '项目a',
      subproject: null,
      dueDate: addDays(new Date(), 20),
      completed: false,
      tags: ['文档'],
      priority: 'low'
    },
  ];

  // 示例归档项目
  const sampleArchived = [
    {
      id: 'archived-1',
      name: '旧项目a',
      color: '#95a5a6',
      taskCount: 5,
      completedCount: 5,
      archivedAt: new Date('2023-12-01')
    },
    {
      id: 'archived-2',
      name: '测试项目',
      color: '#95a5a6',
      taskCount: 3,
      completedCount: 3,
      archivedAt: new Date('2023-11-15')
    }
  ];

  useEffect(() => {
    setProject(sampleProject);
    setTasks(sampleTasks);
    setArchivedProjects(sampleArchived);
  }, [projectId]);

  // 按日期分组任务
  const groupByDate = (taskList) => {
    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisweek: [],
      nextweek: [],
      later: [],
      nodate: []
    };

    taskList.forEach(task => {
      if (!task.dueDate) {
        groups.nodate.push(task);
        return;
      }

      const now = new Date();
      const today = startOfToday(now);
      const tomorrow = addDays(today, 1);
      const endOfThisWeek = addDays(today, 7);
      const endOfNextWeek = addDays(today, 14);

      if (isPast(task.dueDate) && !task.completed) {
        groups.overdue.push(task);
      } else if (isWithinInterval(task.dueDate, { start: today, end: endOfToday(now) })) {
        groups.today.push(task);
      } else if (isWithinInterval(task.dueDate, { start: tomorrow, end: addDays(tomorrow, 1) })) {
        groups.tomorrow.push(task);
      } else if (isWithinInterval(task.dueDate, { start: addDays(tomorrow, 1), end: endOfThisWeek })) {
        groups.thisweek.push(task);
      } else if (isWithinInterval(task.dueDate, { start: endOfThisWeek, end: endOfNextWeek })) {
        groups.nextweek.push(task);
      } else {
        groups.later.push(task);
      }
    });

    return groups;
  };

  // 按优先级分组任务
  const groupByPriority = (taskList) => {
    const groups = {
      high: [],
      medium: [],
      low: []
    };

    taskList.forEach(task => {
      groups[task.priority || 'medium'].push(task);
    });

    return groups;
  };

  // 按标签分组任务
  const groupByTag = (taskList) => {
    const groups = {};
    const untagged = [];

    taskList.forEach(task => {
      if (!task.tags || task.tags.length === 0) {
        untagged.push(task);
        return;
      }

      task.tags.forEach(tag => {
        if (!groups[tag]) {
          groups[tag] = [];
        }
        groups[tag].push(task);
      });
    });

    return { ...groups, untagged };
  };

  // 获取分组后的任务
  const getGroupedTasks = () => {
    const activeTasks = tasks.filter(task => !task.completed);
    
    switch (groupMode) {
      case 'date':
        return groupByDate(activeTasks);
      case 'priority':
        return groupByPriority(activeTasks);
      case 'tag':
        return groupByTag(activeTasks);
      default:
        return groupByDate(activeTasks);
    }
  };

  // 获取分组标题
  const getGroupTitle = (groupKey) => {
    switch (groupMode) {
      case 'date':
        const dateTitles = {
          overdue: '已逾期',
          today: '今天',
          tomorrow: '明天',
          thisweek: '本周',
          nextweek: '下周',
          later: '更晚',
          nodate: '无日期'
        };
        return dateTitles[groupKey] || groupKey;
      case 'priority':
        const priorityTitles = {
          high: '高优先级',
          medium: '中优先级',
          low: '低优先级'
        };
        return priorityTitles[groupKey] || groupKey;
      case 'tag':
        return groupKey === 'untagged' ? '无标签' : `#${groupKey}`;
      default:
        return groupKey;
    }
  };

  // 获取分组颜色
  const getGroupColor = (groupKey) => {
    switch (groupMode) {
      case 'date':
        const dateColors = {
          overdue: '#ef4444',
          today: '#f59e0b',
          tomorrow: '#3b82f6',
          thisweek: '#8b5cf6',
          nextweek: '#06b6d4',
          later: '#64748b',
          nodate: '#9ca3af'
        };
        return dateColors[groupKey] || '#64748b';
      case 'priority':
        const priorityColors = {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#10b981'
        };
        return priorityColors[groupKey] || '#64748b';
      case 'tag':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  // 切换任务完成状态
  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date() : null }
        : task
    ));
  };

  // 删除任务
  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  // 归档项目
  const archiveTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, archived: true, archivedAt: new Date() }
        : task
    ));
  };

  const groupedTasks = getGroupedTasks();
  const completedTasks = tasks.filter(task => task.completed);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--theme-bg)' }}>
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 项目头部 */}
        <div className="border-b border-gray-200" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={onBack}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FiArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: project.color }}
                  />
                  <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <FiSettings className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <FiMoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* 项目进度条 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">项目进度</span>
                <span className="text-sm font-medium text-gray-800">
                  {project.completedCount}/{project.taskCount} 任务完成
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${(project.completedCount / project.taskCount) * 100}%`,
                    backgroundColor: project.color 
                  }}
                />
              </div>
            </div>
            
            {/* 分组方式选择 */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">分组方式：</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setGroupMode('date')}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                    groupMode === 'date'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600'
                  }`}
                  onMouseOver={(e) => {
                    if (groupMode !== 'date') {
                      e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (groupMode !== 'date') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <FiCalendar className="w-4 h-4" />
                  <span>按日期</span>
                </button>
                <button
                  onClick={() => setGroupMode('priority')}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                    groupMode === 'priority'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600'
                  }`}
                  onMouseOver={(e) => {
                    if (groupMode !== 'priority') {
                      e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (groupMode !== 'priority') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <FiStar className="w-4 h-4" />
                  <span>按优先级</span>
                </button>
                <button
                  onClick={() => setGroupMode('tag')}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                    groupMode === 'tag'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600'
                  }`}
                  onMouseOver={(e) => {
                    if (groupMode !== 'tag') {
                      e.currentTarget.style.backgroundColor = 'var(--theme-elevated)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (groupMode !== 'tag') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <FiTag className="w-4 h-4" />
                  <span>按标签</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* 任务列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* 活跃任务分组 */}
            <div className="space-y-6 mb-8">
              {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => {
                if (groupTasks.length === 0) return null;
                
                return (
                  <div key={groupKey} className="rounded-lg border border-gray-200 overflow-hidden" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <div 
                      className="px-4 py-3 border-b border-gray-200"
                      style={{ backgroundColor: `${getGroupColor(groupKey)}10` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundcolor: getgroupcolor(groupkey) }}
                          />
                          <h3 className="text-sm font-semibold text-gray-800">
                            {getGroupTitle(groupKey)}
                          </h3>
                          <span className="text-xs text-gray-500">
                            ({groupTasks.length})
                          </span>
                        </div>
                        <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <fiplus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {groupTasks.map(task => (
                        <div
                          key={task.id}
                          className="p-4 transition-colors duration-200"
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="flex items-start space-x-3">
                            <button
                              onClick={() => toggleTask(task.id)}
                              className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                                task.completed
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300 hover:border-green-500'
                              }`}
                            >
                              {task.completed && <FiCheck className="w-3 h-3" />}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {task.title}
                              </p>
                              
                              <div className="flex items-center space-x-4 mt-2">
                                {task.subproject && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    {task.subproject}
                                  </span>
                                )}
                                
                                {task.dueDate && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <FiCalendar className="w-3 h-3" />
                                    <span>
                                      {format(task.dueDate, 'MM-dd', { locale: zhCN })}
                                    </span>
                                  </div>
                                )}
                                
                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    {task.tags.map(tag => (
                                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                
                                {task.priority === 'high' && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    高优先级
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                onClick={() => deleteTask(task.id)}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-error)20'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 已完成任务 */}
              {completedTasks.length > 0 && (
                <div className="rounded-lg border border-gray-200 overflow-hidden" style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <div className="px-4 py-3 border-b border-gray-200" style={{ backgroundColor: 'var(--theme-elevated)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FiArchive className="w-4 h-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-800">
                          已完成任务
                        </h3>
                        <span className="text-xs text-gray-500">
                          ({completedTasks.length})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {completedTasks.map(task => (
                      <div
                        key={task.id}
                        className="p-4 transition-colors duration-200"
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-elevated)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="flex items-start space-x-3">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="mt-1 w-5 h-5 rounded-full bg-green-500 border-2 border-green-500 flex items-center justify-center"
                          >
                            <FiCheck className="w-3 h-3 text-white" />
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-through text-gray-400">
                              {task.title}
                            </p>
                            
                            <div className="flex items-center space-x-4 mt-2">
                              {task.completedAt && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <FiCalendar className="w-3 h-3" />
                                  <span>
                                    完成于 {format(task.completedAt, 'MM-dd', { locale: zhCN })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            
            {/* 归档项目 */}
            {archivedProjects.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">归档项目</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedProjects.map(archivedProject => (
                    <div
                      key={archivedProject.id}
                      className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: archivedProject.color }}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {archivedProject.name}
                          </span>
                        </div>
                        <FiArchive className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="text-xs text-gray-500">
                        {archivedProject.completedCount}/{archivedProject.taskCount} 任务完成
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
            {/* 底部操作栏 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between max-w-6xl mx-auto">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      const newTask = {
                        id: Date.now(),
                        title: '新任务',
                        completed: false,
                        dueDate: null,
                        priority: null,
                        tags: [],
                        createdAt: new Date().toISOString()
                      };
                      setTasks([...tasks, newTask]);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>添加任务</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <FiFilter className="w-4 h-4" />
                    <span>筛选</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <FiShare2 className="w-4 h-4" />
                    <span>分享</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      const projectToArchive = {
                        ...project,
                        archivedAt: new Date().toISOString()
                      };
                      setArchivedProjects([...archivedProjects, projectToArchive]);
                      // 这里应该跳转到项目列表页面
                    }}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FiArchive className="w-4 h-4" />
                    <span>归档项目</span>
                  </button>
                </div>
              </div>
            </div>
    </div>
  );
};

export default ProjectView;