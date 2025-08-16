import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiPlus, FiCalendar, FiTag, FiUser, FiClock, FiCheck } from 'react-icons/fi';
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const TaskComposer = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialTask = null,
  availableProjects = [],
  availableTags = []
}) => {
  // 状态管理
  const [title, setTitle] = useState('');
  const [parsedInfo, setParsedInfo] = useState({
    dueDate: null,
    tags: [],
    project: null,
    assignee: null
  });
  const [notes, setNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionType, setSuggestionType] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const titleRef = useRef(null);
  const suggestionsRef = useRef(null);

  // 初始化任务数据
  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setParsedInfo({
        dueDate: initialTask.dueDate || null,
        tags: initialTask.tags || [],
        project: initialTask.project || null,
        assignee: initialTask.assignee || null
      });
      setNotes(initialTask.notes || '');
    } else {
      resetForm();
    }
  }, [initialTask, isOpen]);

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setParsedInfo({
      dueDate: null,
      tags: [],
      project: null,
      assignee: null
    });
    setNotes('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // 解析标题中的信息
  const parseTitle = (text) => {
    const info = {
      dueDate: null,
      tags: [],
      project: null,
      assignee: null
    };

    // 解析日期关键词
    const dateKeywords = {
      'today': new Date(),
      'tomorrow': addDays(new Date(), 1),
      'tom': addDays(new Date(), 1),
      'yesterday': addDays(new Date(), -1),
      'next week': addDays(new Date(), 7),
      'next month': addDays(new Date(), 30)
    };

    // 解析时间格式 (due 18:00)
    const timeRegex = /due\s+(\d{1,2}):(\d{2})/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      info.dueDate = date;
    }

    // 解析日期关键词
    Object.entries(dateKeywords).forEach(([keyword, date]) => {
      if (text.toLowerCase().includes(keyword)) {
        info.dueDate = date;
      }
    });

    // 解析项目 (@项目名)
    const projectRegex = /@(\S+)/g;
    const projectMatches = [...text.matchAll(projectRegex)];
    if (projectMatches.length > 0) {
      const projectName = projectMatches[0][1];
      const project = availableProjects.find(p => 
        p.name.toLowerCase().includes(projectName.toLowerCase())
      );
      if (project) {
        info.project = project;
      }
    }

    // 解析标签 (#标签名)
    const tagRegex = /#(\S+)/g;
    const tagMatches = [...text.matchAll(tagRegex)];
    tagMatches.forEach(match => {
      const tagName = match[1];
      const tag = availableTags.find(t => 
        t.name.toLowerCase().includes(tagName.toLowerCase())
      );
      if (tag && !info.tags.find(t => t.id === tag.id)) {
        info.tags.push(tag);
      }
    });

    return info;
  };

  // 处理标题输入
  const handleTitleChange = (e) => {
    const newText = e.target.value;
    setTitle(newText);
    setCursorPosition(e.target.selectionStart);

    // 解析信息
    const parsed = parseTitle(newText);
    setParsedInfo(parsed);

    // 检查是否需要显示建议
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newText.substring(0, cursorPos);
    
    // 检查项目建议 (@)
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    if (lastAtSymbol !== -1 && lastAtSymbol === cursorPos - 1) {
      showProjectSuggestions();
      return;
    }

    // 检查标签建议 (#)
    const lastHashSymbol = textBeforeCursor.lastIndexOf('#');
    if (lastHashSymbol !== -1 && lastHashSymbol === cursorPos - 1) {
      showTagSuggestions();
      return;
    }

    // 检查日期建议 (due)
    const lastDue = textBeforeCursor.toLowerCase().lastIndexOf('due');
    if (lastDue !== -1 && lastDue === cursorPos - 3) {
      showDateSuggestions();
      return;
    }

    setShowSuggestions(false);
  };

  // 显示项目建议
  const showProjectSuggestions = () => {
    setSuggestions(availableProjects);
    setSuggestionType('project');
    setShowSuggestions(true);
  };

  // 显示标签建议
  const showTagSuggestions = () => {
    setSuggestions(availableTags);
    setSuggestionType('tag');
    setShowSuggestions(true);
  };

  // 显示日期建议
  const showDateSuggestions = () => {
    const dateSuggestions = [
      { id: 'today', name: '今天', date: new Date() },
      { id: 'tomorrow', name: '明天', date: addDays(new Date(), 1) },
      { id: 'next-week', name: '下周', date: addDays(new Date(), 7) },
      { id: 'next-month', name: '下月', date: addDays(new Date(), 30) }
    ];
    setSuggestions(dateSuggestions);
    setSuggestionType('date');
    setShowSuggestions(true);
  };

  // 选择建议
  const selectSuggestion = (suggestion) => {
    const textBeforeCursor = title.substring(0, cursorPosition);
    const textAfterCursor = title.substring(cursorPosition);
    
    let insertText = '';
    let deleteCount = 0;
    
    switch (suggestionType) {
      case 'project':
        insertText = `${suggestion.name}`;
        deleteCount = 1; // 删除 @ 符号
        break;
      case 'tag':
        insertText = `${suggestion.name}`;
        deleteCount = 1; // 删除 # 符号
        break;
      case 'date':
        insertText = ` ${format(suggestion.date, 'MM-dd', { locale: zhCN })}`;
        deleteCount = 3; // 删除 due
        break;
    }
    
    const newTitle = textBeforeCursor.substring(0, textBeforeCursor.length - deleteCount) + 
                   insertText + 
                   textAfterCursor;
    
    setTitle(newTitle);
    setShowSuggestions(false);
    
    // 重新解析
    const parsed = parseTitle(newTitle);
    setParsedInfo(parsed);
    
    // 聚焦回输入框
    setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.focus();
        const newCursorPosition = cursorPosition - deleteCount + insertText.length;
        titleRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleClose();
    } else if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // 这里可以添加键盘导航逻辑
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // 这里可以添加键盘导航逻辑
      }
    }
  };

  // 保存任务
  const handleSave = () => {
    if (!title.trim()) return;

    const taskData = {
      id: initialTask?.id || Date.now().toString(),
      title: title.trim(),
      dueDate: parsedInfo.dueDate,
      tags: parsedInfo.tags,
      project: parsedInfo.project,
      assignee: parsedInfo.assignee,
      notes: notes.trim(),
      completed: initialTask?.completed || false,
      createdAt: initialTask?.createdAt || new Date(),
      updatedAt: new Date()
    };

    onSave(taskData);
    handleClose();
  };

  // 关闭弹窗
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 格式化日期显示
  const formatDateDisplay = (date) => {
    if (!date) return '';
    
    if (isToday(date)) return '今天';
    if (isTomorrow(date)) return '明天';
    
    return format(date, 'MM-dd', { locale: zhCN });
  };

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          titleRef.current && !titleRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-t-2xl shadow-2xl transform transition-all duration-300 ease-out">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {initialTask ? '编辑任务' : '新建任务'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* 标题行 */}
          <div className="relative">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              placeholder="输入任务标题..."
              maxLength={60}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-transparent transition-all duration-200"
              autoFocus
            />
            <div className="absolute right-3 top-3 text-xs text-gray-400">
              {title.length}/60
            </div>
          </div>
          
          {/* 自动解析行 */}
          <div className="flex flex-wrap gap-2 min-h-[32px] p-2 bg-gray-50 rounded-lg">
            {parsedInfo.dueDate && (
              <div className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                <FiCalendar className="w-3 h-3" />
                <span>{formatDateDisplay(parsedInfo.dueDate)}</span>
              </div>
            )}
            
            {parsedInfo.project && (
              <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                <span>@{parsedInfo.project.name}</span>
              </div>
            )}
            
            {parsedInfo.tags.map(tag => (
              <div key={tag.id} className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                <FiTag className="w-3 h-3" />
                <span>#{tag.name}</span>
              </div>
            ))}
            
            {parsedInfo.assignee && (
              <div className="flex items-center space-x-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                <FiUser className="w-3 h-3" />
                <span>{parsedInfo.assignee.name}</span>
              </div>
            )}
            
            {!parsedInfo.dueDate && !parsedInfo.project && parsedInfo.tags.length === 0 && !parsedInfo.assignee && (
              <div className="flex items-center space-x-1 px-3 py-1 text-gray-400 text-sm">
                <FiClock className="w-3 h-3" />
                <span>输入 @项目名 #标签 due 时间 来自动解析</span>
              </div>
            )}
          </div>
          
          {/* 富文本笔记 */}
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加笔记..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-transparent transition-all duration-200 resize-none"
            />
          </div>
          
          {/* 建议列表 */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute z-10 w-64 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto"
            >
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-2"
                >
                  {suggestionType === 'project' && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: suggestion.color || '#52C4B3' }}
                    />
                  )}
                  {suggestionType === 'tag' && (
                    <FiTag className="w-4 h-4 text-gray-400" />
                  )}
                  {suggestionType === 'date' && (
                    <FiCalendar className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700">
                    {suggestion.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 底部操作 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            按 Enter 保存，Esc 取消
          </div>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              title.trim()
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FiCheck className="w-4 h-4" />
            <span>{initialTask ? '保存' : '创建'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskComposer;