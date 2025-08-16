// 任务提取和同步工具函数

/**
 * 从Markdown文本中提取任务
 * @param {string} content - Markdown内容
 * @param {string} noteId - 笔记ID
 * @param {string} noteTitle - 笔记标题
 * @returns {Array} 提取的任务列表
 */
export const extractTasksFromText = (content, noteId, noteTitle = '') => {
  if (!content) return [];
  
  const lines = content.split('\n');
  const tasks = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('- [ ]') || trimmedLine.startsWith('- [x]')) {
      const isCompleted = trimmedLine.startsWith('- [x]');
      const taskText = trimmedLine.replace(/^- \[[ x]\] /, '').trim();
      
      if (taskText) {
        tasks.push({
          id: `${noteId}_${index}`,
          text: taskText,
          completed: isCompleted,
          source: 'note',
          noteId: noteId,
          noteTitle: noteTitle,
          lineIndex: index,
          createdAt: new Date().toISOString(),
          completedAt: isCompleted ? new Date().toISOString() : null
        });
      }
    }
  });
  
  return tasks;
};

/**
 * 从所有笔记中提取任务
 * @param {Array} notes - 笔记列表
 * @returns {Array} 所有提取的任务
 */
export const extractTasksFromNotes = (notes) => {
  const allTasks = [];
  
  notes.forEach(note => {
    const tasks = extractTasksFromText(note.content, note.id, note.title);
    allTasks.push(...tasks);
  });
  
  return allTasks;
};

/**
 * 合并笔记任务和独立任务
 * @param {Array} noteTasks - 从笔记提取的任务
 * @param {Array} standaloneTasks - 独立创建的任务
 * @returns {Array} 合并后的任务列表
 */
export const mergeNotesAndStandaloneTasks = (noteTasks, standaloneTasks) => {
  // 创建一个Map来去重，优先保留笔记中的任务
  const taskMap = new Map();
  
  // 先添加独立任务
  standaloneTasks.forEach(task => {
    if (task.source === 'standalone') {
      taskMap.set(task.id, task);
    }
  });
  
  // 再添加笔记任务，会覆盖同ID的独立任务
  noteTasks.forEach(task => {
    taskMap.set(task.id, task);
  });
  
  return Array.from(taskMap.values());
};

/**
 * 更新笔记中的任务状态
 * @param {string} content - 原始内容
 * @param {number} lineIndex - 行索引
 * @param {boolean} isCompleted - 是否完成
 * @returns {string} 更新后的内容
 */
export const updateTaskInNote = (content, lineIndex, isCompleted) => {
  const lines = content.split('\n');
  
  if (lineIndex >= 0 && lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
      lines[lineIndex] = isCompleted 
        ? line.replace('- [ ]', '- [x]')
        : line.replace('- [x]', '- [ ]');
    }
  }
  
  return lines.join('\n');
};

/**
 * 获取任务统计信息
 * @param {Array} tasks - 任务列表
 * @returns {Object} 统计信息
 */
export const getTaskStats = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const fromNotes = tasks.filter(task => task.source === 'note').length;
  const standalone = total - fromNotes;
  
  return {
    total,
    completed,
    pending,
    fromNotes,
    standalone,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
};

/**
 * 按来源分组任务
 * @param {Array} tasks - 任务列表
 * @returns {Object} 分组后的任务
 */
export const groupTasksBySource = (tasks) => {
  const noteGroups = {};
  const standaloneTasks = [];
  
  tasks.forEach(task => {
    if (task.source === 'note' && task.noteId) {
      const noteId = task.noteId;
      if (!noteGroups[noteId]) {
        noteGroups[noteId] = {
          noteTitle: task.noteTitle,
          tasks: []
        };
      }
      noteGroups[noteId].tasks.push(task);
    } else {
      standaloneTasks.push(task);
    }
  });
  
  return {
    noteGroups,
    standaloneTasks
  };
};

/**
 * 过滤任务
 * @param {Array} tasks - 任务列表
 * @param {string} filter - 过滤条件 ('all', 'completed', 'pending', 'fromNotes', 'standalone')
 * @returns {Array} 过滤后的任务
 */
export const filterTasks = (tasks, filter) => {
  switch (filter) {
    case 'completed':
      return tasks.filter(task => task.completed);
    case 'pending':
      return tasks.filter(task => !task.completed);
    case 'fromNotes':
      return tasks.filter(task => task.source === 'note');
    case 'standalone':
      return tasks.filter(task => task.source === 'standalone');
    default:
      return tasks;
  }
};

/**
 * 搜索任务
 * @param {Array} tasks - 任务列表
 * @param {string} searchTerm - 搜索词
 * @returns {Array} 搜索结果
 */
export const searchTasks = (tasks, searchTerm) => {
  if (!searchTerm.trim()) return tasks;
  
  const term = searchTerm.toLowerCase();
  return tasks.filter(task => 
    task.text.toLowerCase().includes(term) ||
    (task.noteTitle && task.noteTitle.toLowerCase().includes(term))
  );
};