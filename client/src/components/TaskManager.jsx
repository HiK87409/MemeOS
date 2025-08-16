import React, { useState, useEffect, useRef } from 'react';
import { 
  FiPlus, 
  FiCheck, 
  FiEdit2, 
  FiTrash2, 
  FiX,
  FiCalendar,
  FiClock,
  FiEdit3,
  FiCheckSquare,
  FiSquare,
  FiFileText,
  FiRefreshCw,
  FiSearch
} from 'react-icons/fi';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import { 
  extractTasksFromText, 
  extractTasksFromNotes, 
  mergeNotesAndStandaloneTasks,
  updateTaskInNote,
  getTaskStats,
  groupTasksBySource,
  filterTasks,
  searchTasks
} from '../utils/taskUtils';
import { fetchMyNotes } from '../api/notesApi';
import { commonColors } from '../utils/commonColors';

const TaskManager = ({ className }) => {
  // 状态管理
  const [noteTasks, setNoteTasks] = useState([]);
  const [standaloneTasks, setStandaloneTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef(null);
  


  // 从localStorage加载独立任务和回收站任务
  useEffect(() => {
    const savedTasks = localStorage.getItem('taskManager_standaloneTasks');
    if (savedTasks) {
      try {
        setStandaloneTasks(JSON.parse(savedTasks));
      } catch (error) {
        console.error('加载独立任务失败:', error);
      }
    }
    
    // 初始加载笔记任务
    loadNoteTasks();
  }, []);

  // 监听标签更新事件，当标签创建或更新时刷新笔记任务
  useEffect(() => {
    let debounceTimer;
    
    const handleTagsUpdated = (event) => {
      console.log('TaskManager: 收到标签更新事件，刷新笔记任务');
      
      // 清除之前的定时器，实现防抖
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // 设置新的定时器，延迟300ms执行
      debounceTimer = setTimeout(() => {
        loadNoteTasks();
      }, 300);
    };

    window.addEventListener('tagsUpdated', handleTagsUpdated);
    
    return () => {
      window.removeEventListener('tagsUpdated', handleTagsUpdated);
      // 清理定时器
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, []);



  // 合并任务列表
  useEffect(() => {
    const merged = mergeNotesAndStandaloneTasks(noteTasks, standaloneTasks);
    setAllTasks(merged);
  }, [noteTasks, standaloneTasks]);

  // 保存独立任务到localStorage
  const saveStandaloneTasks = (newTasks) => {
    setStandaloneTasks(newTasks);
    localStorage.setItem('taskManager_standaloneTasks', JSON.stringify(newTasks));
  };
  

  
  
  




  // 从笔记中加载任务
  const loadNoteTasks = async () => {
    setIsLoading(true);
    try {
      const notes = await fetchMyNotes();
      const extractedTasks = extractTasksFromNotes(notes);
      setNoteTasks(extractedTasks);
      
      // 合并任务
      const merged = mergeNotesAndStandaloneTasks(extractedTasks, standaloneTasks);
      setAllTasks(merged);
    } catch (error) {
      console.error('加载笔记任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新任务（独立任务）
  const addTask = () => {
    if (!newTaskText.trim()) return;
    
    const newTask = {
      id: `standalone_${Date.now()}`,
      text: newTaskText.trim(),
      completed: false,
      source: 'standalone',
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    
    const newTasks = [newTask, ...standaloneTasks];
    saveStandaloneTasks(newTasks);
    setNewTaskText('');
    
    // 确保输入框在状态更新后重新获得焦点
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // 切换任务完成状态
  const toggleTask = (taskId) => {
    // 查找任务
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.source === 'standalone') {
      // 独立任务：更新本地状态和存储
      const updatedStandaloneTasks = standaloneTasks.map(t =>
        t.id === taskId
          ? { 
              ...t, 
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null
            }
          : t
      );
      setStandaloneTasks(updatedStandaloneTasks);
      saveStandaloneTasks(updatedStandaloneTasks);
    } else if (task.source === 'note') {
      // 笔记任务：仅更新本地显示状态
      const updatedNoteTasks = noteTasks.map(t =>
        t.id === taskId
          ? { 
              ...t, 
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null
            }
          : t
      );
      setNoteTasks(updatedNoteTasks);
      // 注意：这里不会更新实际的笔记内容，只是本地显示状态
    }
  };

  // 删除任务
  const deleteTask = (taskId) => {
    // 只能删除独立任务
    const task = allTasks.find(t => t.id === taskId);
    if (!task || task.source !== 'standalone') return;
    
    // 从独立任务中移除
    const updatedTasks = standaloneTasks.filter(t => t.id !== taskId);
    setStandaloneTasks(updatedTasks);
    saveStandaloneTasks(updatedTasks);
  };



  // 开始编辑任务
  const startEdit = (task) => {
    if (task.source !== 'standalone') return;
    setEditingTask(task.id);
    setEditText(task.text);
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editText.trim()) return;
    
    // 只能编辑独立任务
    const task = allTasks.find(t => t.id === editingTask);
    if (!task || task.source !== 'standalone') return;
    
    const updatedTasks = standaloneTasks.map(task =>
      task.id === editingTask
        ? { ...task, text: editText.trim() }
        : task
    );
    setStandaloneTasks(updatedTasks);
    saveStandaloneTasks(updatedTasks);
    
    setEditingTask(null);
    setEditText('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingTask(null);
    setEditText('');
  };

  // 过滤和搜索任务
  const filteredTasks = searchTasks(filterTasks(allTasks, filter), searchTerm);

  // 统计信息
  const stats = getTaskStats(allTasks);
  
  // 分组任务（用于分组视图）
  const groupedTasks = groupTasksBySource(filteredTasks);

  return (
    <div className={`task-manager ${className}`}>
      {/* 标题和工具栏 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-theme-text">
            任务管理
          </h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={loadNoteTasks}
              disabled={isLoading}
              className="p-2 text-theme-text-secondary hover:bg-theme-hover rounded-lg transition-colors disabled:opacity-50"
              title="刷新笔记任务"
            >
              <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-2 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
              title="添加任务"
            >
              <FiPlus size={16} />
            </button>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-muted" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索任务..."
            className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg bg-theme-surface text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-0 focus:border-transparent text-sm"
          />
        </div>
        
        {/* 统计信息 */}
        <div className="flex items-center justify-between text-sm text-theme-text-secondary mb-2">
          <div className="flex items-center space-x-3">
            <>
              <span>总计: {stats.total}</span>
              <span>已完成: {stats.completed}</span>
              <span>待办: {stats.pending}</span>
            </>
          </div>
          <div className="text-xs">
            完成率: {stats.completionRate}%
          </div>
        </div>
        
        {/* 来源统计 */}
        <div className="flex items-center space-x-3 text-xs text-theme-text-muted">
          <span className="flex items-center">
            <FiFileText size={12} className="mr-1" />
            笔记: {stats.fromNotes}
          </span>
          <span>独立: {stats.standalone}</span>
        </div>
      </div>

      {/* 添加任务表单 */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-theme-hover rounded-lg border border-theme-border">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              ref={inputRef}
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="输入新任务..."
              className="flex-1 px-3 py-2 border border-theme-border rounded-md bg-theme-surface text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-0 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTask();
                }
              }}
              autoFocus
            />
            <button
              onClick={addTask}
              className="px-3 py-2 bg-theme-primary text-white rounded-md hover:bg-theme-primary/90 transition-colors"
            >
              <FiCheck size={16} />
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewTaskText('');
              }}
              className="px-3 py-2 bg-theme-text-secondary text-white rounded-md hover:bg-theme-text-secondary/90 transition-colors"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-1 bg-theme-hover rounded-lg p-1">
          {[
            { key: 'all', label: '全部' },
            { key: 'pending', label: '待办' },
            { key: 'completed', label: '已完成' },
            { key: 'fromNotes', label: '笔记任务' },
            { key: 'standalone', label: '独立任务' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key && key !== 'all' ? 'all' : key)}
              className={`px-2 py-1.5 text-xs rounded-md transition-colors ${
                filter === key
                  ? 'bg-theme-surface text-theme-text shadow-sm'
                  : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-2 max-h-96 overflow-y-auto smooth-scroll-container scrollbar-smooth">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-theme-text-muted">
            {isLoading ? '加载中...' :
             filter === 'all' ? '暂无任务' : 
             filter === 'completed' ? '暂无已完成任务' : 
             filter === 'pending' ? '暂无待办任务' :
             searchTerm ? '未找到匹配的任务' : '暂无任务'}
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className={`p-3 bg-theme-surface rounded-lg transition-all ${
                task.completed ? 'opacity-75' : ''
              }`}
            >
              {editingTask === task.id ? (
                // 编辑模式
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 px-2 py-1 border border-theme-border rounded bg-theme-surface text-theme-text"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        saveEdit();
                      } else if (e.key === 'Escape') {
                        cancelEdit();
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={saveEdit}
                    className="p-1 text-theme-success hover:bg-theme-success/10 rounded"
                  >
                    <FiCheck size={14} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 text-theme-text-secondary hover:bg-theme-hover rounded"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ) : (
                // 显示模式
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-theme-success border-theme-success text-white'
                        : 'border-theme-border hover:border-theme-success'
                    }`}
                  >
                    {task.completed && <FiCheck size={12} />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm ${
                        task.completed
                          ? 'line-through text-theme-text-muted'
                          : 'text-theme-text'
                      }`}
                    >
                      {task.text}
                    </div>
                    
                    {/* 来源标识 */}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.source === 'note' 
                          ? 'bg-theme-primary/10 text-theme-primary'
                          : 'bg-theme-hover text-theme-text-secondary'
                      }`}>
                        {task.source === 'note' ? (
                          <>
                            <FiFileText size={10} className="mr-1" />
                            笔记任务
                          </>
                        ) : (
                          '独立任务'
                        )}
                      </span>
                      
                      {task.noteTitle && (
                        <span className="text-xs text-theme-text-muted truncate max-w-32">
                          来自: {task.noteTitle}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 mt-1 text-xs text-theme-text-muted">
                      <div className="flex items-center space-x-1">
                        <FiCalendar size={12} />
                        <span>
                          {format(toZonedTime(new Date(task.createdAt), 'Asia/Shanghai'), 'MM-dd HH:mm', { locale: zhCN })}
                        </span>
                      </div>
                      
                      {task.completed && task.completedAt && (
                        <div className="flex items-center space-x-1">
                          <FiClock size={12} />
                          <span>
                            完成于 {format(toZonedTime(new Date(task.completedAt), 'Asia/Shanghai'), 'MM-dd HH:mm', { locale: zhCN })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {task.source === 'standalone' && (
                      <>

                        <button
                          onClick={() => startEdit(task)}
                          className="p-1 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-primary/10 rounded transition-colors"
                          title="编辑任务"
                        >
                          <FiEdit3 size={14} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 text-theme-text-secondary hover:text-theme-danger hover:bg-theme-danger/10 rounded transition-colors"
                          title="删除任务"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </>
                    )}
                    {task.source === 'note' && (
                      <span className="text-xs text-theme-text-muted px-2">
                        来自笔记
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      

    </div>
  );
};

export default TaskManager;