import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiCheckSquare, 
  FiSquare, 
  FiCalendar, 
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiClock,
  FiTag,
  FiExternalLink
} from 'react-icons/fi';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { extractTasksFromNotes, filterTasks, searchTasks, getTaskStats, groupTasksBySource, updateTaskInNote } from '../utils/taskUtils';
import { fetchMyNotes } from '../api/notesApi';
import { useNavigate } from 'react-router-dom';
import { updateNote } from '../api/notesApi';

const NoteTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('note'); // 'note' 或 'date'
  const [showFilters, setShowFilters] = useState(false);
  const [syncingTaskId, setSyncingTaskId] = useState(null);
  
  const navigate = useNavigate();

  // 加载笔记和任务
  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const notesData = await fetchMyNotes();
      setNotes(notesData);
      
      const extractedTasks = extractTasksFromNotes(notesData);
      setTasks(extractedTasks);
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // 过滤和搜索任务
  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    // 应用过滤器
    result = filterTasks(result, filter);
    
    // 应用搜索
    result = searchTasks(result, searchTerm);
    
    return result;
  }, [tasks, filter, searchTerm]);

  // 任务统计
  const stats = useMemo(() => getTaskStats(filteredTasks), [filteredTasks]);

  // 按笔记或日期分组任务
  const groupedTasks = useMemo(() => {
    if (groupBy === 'note') {
      const groups = {};
      filteredTasks.forEach(task => {
        const noteId = task.noteId;
        if (!groups[noteId]) {
          const note = notes.find(n => n.id === noteId);
          groups[noteId] = {
            title: note?.title || '',
            note: note,
            tasks: []
          };
        }
        groups[noteId].tasks.push(task);
      });
      return Object.entries(groups).map(([noteId, group]) => ({
        id: noteId,
        ...group
      }));
    } else {
      // 按日期分组
      const groups = {};
      filteredTasks.forEach(task => {
        const date = task.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd') : '无日期';
        if (!groups[date]) {
          groups[date] = {
            title: format(new Date(task.createdAt), 'MM月dd日 EEEE', { locale: zhCN }),
            tasks: []
          };
        }
        groups[date].tasks.push(task);
      });
      return Object.entries(groups).map(([date, group]) => ({
        id: date,
        ...group
      }));
    }
  }, [filteredTasks, notes, groupBy]);

  // 切换任务完成状态（仅更新显示，不修改笔记内容）
  // 切换任务完成状态并同步到数据库
  const toggleTaskStatus = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.source !== 'note') return;

    setSyncingTaskId(taskId);

    try {
      // 获取对应的笔记
      const note = notes.find(n => n.id === task.noteId);
      if (!note) return;

      // 更新笔记内容中的任务状态
      const updatedContent = updateTaskInNote(note.content, task.lineIndex, newStatus);
      
      // 调用API更新笔记
      await updateNote(task.noteId, {
        content: updatedContent,
        updated_at: new Date().toISOString()
      });

      // 更新本地状态
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId 
            ? { ...t, completed: newStatus, completedAt: newStatus ? new Date().toISOString() : null }
            : t
        )
      );

      // 显示成功提示
      // 显示成功提示
      console.log(newStatus ? '任务已完成！' : '任务已取消完成');

      // 重新加载笔记以确保数据同步
      await loadTasks();
      
    } catch (error) {
      console.error('同步任务状态到数据库失败:', error);
      // 显示错误提示
      console.error('同步失败，请重试');
      
      // 如果失败，回滚状态
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId 
            ? { ...t, completed: !newStatus, completedAt: !newStatus ? new Date().toISOString() : null }
            : t
        )
      );
    } finally {
      setSyncingTaskId(null);
    }
  };

  // 跳转到笔记
  const navigateToNote = (noteId) => {
    navigate(`/?note=${noteId}`);
  };

  // 获取任务优先级样式
  const getPriorityStyle = (task) => {
    const text = task.text.toLowerCase();
    if (text.includes('紧急') || text.includes('重要')) return 'border-l-4 border-l-red-500';
    if (text.includes('尽快')) return 'border-l-4 border-l-orange-500';
    return 'border-l-4 border-l-gray-300';
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      <div className="max-w-6xl mx-auto p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-text mb-2">笔记任务</h1>
          <p className="text-theme-text-secondary">
            从所有笔记中提取的任务列表，共 {stats.total} 个任务
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-theme-surface p-4 rounded-lg">
            <div className="text-2xl font-bold text-theme-text">{stats.total}</div>
            <div className="text-sm text-theme-text-secondary">总任务</div>
          </div>
          <div className="bg-theme-surface p-4 rounded-lg">
            <div className="text-2xl font-bold text-theme-primary">{stats.pending}</div>
            <div className="text-sm text-theme-text-secondary">待完成</div>
          </div>
          <div className="bg-theme-surface p-4 rounded-lg">
            <div className="text-2xl font-bold text-theme-success">{stats.completed}</div>
            <div className="text-sm text-theme-text-secondary">已完成</div>
          </div>
          <div className="bg-theme-surface p-4 rounded-lg">
            <div className="text-2xl font-bold text-theme-warning">{stats.completionRate}%</div>
            <div className="text-sm text-theme-text-secondary">完成率</div>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-secondary" size={18} />
              <input
                type="text"
                placeholder="搜索任务..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-theme-surface border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-theme-surface border border-theme-border rounded-lg hover:bg-theme-hover transition-colors flex items-center gap-2"
            >
              <FiFilter size={16} />
              筛选
            </button>
            
            <button
              onClick={loadTasks}
              disabled={isLoading}
              className="px-4 py-2 bg-theme-surface border border-theme-border rounded-lg hover:bg-theme-hover transition-colors flex items-center gap-2"
            >
              <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>

        {/* 筛选选项 */}
        {showFilters && (
          <div className="bg-theme-surface p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">状态</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-bg border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary"
                >
                  <option value="all">全部</option>
                  <option value="pending">待完成</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">分组方式</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-bg border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary"
                >
                  <option value="note">按笔记分组</option>
                  <option value="date">按日期分组</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 任务列表 */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTasks.length === 0 ? (
              <div className="text-center py-12">
                <FiFileText className="mx-auto text-6xl text-theme-text-secondary mb-4" />
                <h3 className="text-lg font-medium text-theme-text mb-2">
                  {searchTerm ? '未找到匹配的任务' : '暂无任务'}
                </h3>
                <p className="text-theme-text-secondary">
                  {searchTerm ? '尝试修改搜索条件' : '在笔记中添加任务列表即可在这里查看'}
                </p>
              </div>
            ) : (
              groupedTasks.map(group => (
                <div key={group.id} className="bg-theme-surface rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-theme-text">
                      {group.title}
                      <span className="ml-2 text-sm font-normal text-theme-text-secondary">
                        ({group.tasks.length}个任务)
                      </span>
                    </h3>
                    {group.note && (
                      <button
                        onClick={() => navigateToNote(group.id)}
                        className="text-sm text-theme-primary hover:text-theme-primary/80 flex items-center gap-1"
                      >
                        <FiExternalLink size={14} />
                        查看笔记
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {group.tasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 p-3 rounded-lg bg-theme-bg/50 ${getPriorityStyle(task)} ${
                          task.completed ? 'opacity-60 bg-theme-success/10' : 'hover:bg-theme-hover/50'
                        } transition-all duration-200`}
                      >
                        <button
                          onClick={() => toggleTaskStatus(task.id, !task.completed)}
                          className={`mt-0.5 flex-shrink-0 p-1 rounded hover:bg-theme-hover transition-colors ${
                            syncingTaskId === task.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={syncingTaskId === task.id}
                        >
                          {syncingTaskId === task.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-primary"></div>
                          ) : task.completed ? (
                            <FiCheckSquare className="text-theme-success" size={18} />
                          ) : (
                            <FiSquare className="text-theme-text-secondary hover:text-theme-primary" size={18} />
                          )}
                        </button>
                        
                        <div className="flex-1">
                          <p className={`text-theme-text ${task.completed ? 'line-through' : ''}`}>
                            {task.text}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-theme-text-secondary">
                            <span className="flex items-center gap-1">
                              <FiCalendar size={14} />
                              {format(new Date(task.createdAt), 'MM-dd')}
                            </span>
                            {task.noteTitle && (
                              <span className="flex items-center gap-1">
                                <FiFileText size={14} />
                                {task.noteTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteTasksPage;