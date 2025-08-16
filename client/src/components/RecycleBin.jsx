import React, { useState, useEffect } from 'react';
import { FiTrash2, FiRotateCcw, FiX, FiCheck, FiAlertTriangle, FiSearch, FiArrowLeft } from 'react-icons/fi';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { 
  fetchRecycleBin, 
  restoreNote, 
  permanentDeleteNote, 
  batchRestoreNotes, 
  batchPermanentDeleteNotes,
  cleanExpiredNotes
} from '../api/notesApi.js';

const RecycleBin = () => {
  const navigate = useNavigate();
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 加载回收站数据
  const loadRecycleBin = async (search = '') => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecycleBin(search);
      // 服务器返回的数据结构是 {notes: [...], pagination: {...}}
      if (data && data.notes && Array.isArray(data.notes)) {
        setDeletedNotes(data.notes);
        // 设置全局变量供Header组件使用
        window.recycleBinCount = data.notes.length;
      } else {
        console.warn('[RecycleBin] fetchRecycleBin 返回的数据格式不正确，重置为空数组');
        setDeletedNotes([]);
        window.recycleBinCount = 0;
      }
    } catch (error) {
      console.error('加载回收站失败:', error);
      setError('加载回收站失败');
      window.recycleBinCount = 0;
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和搜索时重新加载
  useEffect(() => {
    loadRecycleBin(searchTerm);
  }, [searchTerm]);

  // 自动清理超过30天的笔记
  useEffect(() => {
    const cleanExpired = async () => {
      try {
        await cleanExpiredNotes();
        // 清理后重新加载数据
        await loadRecycleBin(searchTerm);
      } catch (error) {
        console.error('清理过期笔记失败:', error);
      }
    };

    // 组件挂载时立即执行一次清理
    cleanExpired();
    
    // 每小时检查一次是否有超过30天的笔记需要清理
    const interval = setInterval(cleanExpired, 60 * 60 * 1000);
    
    // 组件卸载时清除定时器
    return () => clearInterval(interval);
  }, []);

  // 过滤搜索结果
  const filteredNotes = Array.isArray(deletedNotes) ? deletedNotes.filter(note =>
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.tags && note.tags.some(tag => 
      (typeof tag === 'string' ? tag : tag.name).toLowerCase().includes(searchTerm.toLowerCase())
    ))
  ) : [];
  
  // 如果deletedNotes不是数组，记录警告并重置为空数组
  if (!Array.isArray(deletedNotes)) {
    console.warn('[RecycleBin] deletedNotes 不是数组，重置为空数组');
    setDeletedNotes([]);
  }

  // 处理选择笔记
  const handleSelectNote = (noteId) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedNotes.length === filteredNotes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(filteredNotes.map(note => note.note_id));
    }
  };

  // 恢复笔记 - 统一使用批量API
  const handleRestore = async (noteIds) => {
    try {
      console.log('恢复笔记 - 传入的noteIds:', noteIds);
      console.log('恢复笔记 - noteIds类型:', typeof noteIds);
      console.log('恢复笔记 - 是否为数组:', Array.isArray(noteIds));
      noteIds.forEach((id, index) => {
        console.log(`ID ${index}: 值=${id}, 类型=${typeof id}`);
      });
      
      // 统一使用批量API，兼容单个和多个操作
      const result = await batchRestoreNotes(noteIds);
      
      // 添加调试日志
      console.log('[恢复操作] API返回结果:', result);
      console.log('[恢复操作] restoredCount:', result.restoredCount);
      console.log('[恢复操作] successCount:', result.successCount);
      console.log('[恢复操作] duplicateCount:', result.duplicateCount);
      console.log('[恢复操作] errorCount:', result.errorCount);
      
      // 显示恢复成功的消息，使用API返回的实际恢复数量
      const restoredCount = result.restoredCount || result.successCount || 0;
      const duplicateCount = result.duplicateCount || 0;
      const errorCount = result.errorCount || 0;
      
      let message = '';
      if (restoredCount > 0) {
        message += `成功恢复 ${restoredCount} 条笔记`;
      }
      if (duplicateCount > 0) {
        if (message) message += '，';
        message += `跳过重复 ${duplicateCount} 条笔记`;
      }
      if (errorCount > 0) {
        if (message) message += '，';
        message += `失败 ${errorCount} 条笔记`;
      }
      
      if (message) {
        alert(message);
      } else {
        alert('恢复操作完成，但没有笔记被恢复');
      }
      
      // 重新加载回收站数据
      await loadRecycleBin(searchTerm);
      
      // 清空选择
      setSelectedNotes([]);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('恢复失败:', error);
      setError('恢复笔记失败');
    }
  };

  // 永久删除 - 统一使用批量API
  const handlePermanentDelete = async (noteIds) => {
    try {
      console.log('永久删除 - 传入的noteIds:', noteIds);
      console.log('永久删除 - noteIds类型:', typeof noteIds);
      console.log('永久删除 - 是否为数组:', Array.isArray(noteIds));
      noteIds.forEach((id, index) => {
        console.log(`ID ${index}: 值=${id}, 类型=${typeof id}`);
      });
      
      // 统一使用批量API，兼容单个和多个操作
      await batchPermanentDeleteNotes(noteIds);
      
      // 重新加载回收站数据
      await loadRecycleBin(searchTerm);
      
      // 清空选择
      setSelectedNotes([]);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('删除失败:', error);
      setError('永久删除笔记失败');
    }
  };

  // 显示确认对话框
  const showConfirm = (action, noteIds) => {
    setConfirmAction({ action, noteIds });
    setShowConfirmDialog(true);
  };

  // 执行确认的操作
  const executeConfirmedAction = () => {
    if (confirmAction) {
      if (confirmAction.action === 'restore') {
        handleRestore(confirmAction.noteIds);
      } else if (confirmAction.action === 'delete') {
        handlePermanentDelete(confirmAction.noteIds);
      }
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  // 格式化内容预览
  const formatContentPreview = (content) => {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  // 获取标签名称
  const getTagName = (tag) => {
    return typeof tag === 'string' ? tag : tag.name;
  };

  return (
    <div className="w-full min-h-screen flex flex-col">


      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-100 border border-red-400 text-red-700">
          {error}
        </div>
      )}

      {/* 工具栏 */}
      <div className="p-4 bg-theme-surface">
        <div className="flex items-center justify-between">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-text-muted" />
            <input
              type="text"
              placeholder="搜索已删除的笔记..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-theme-surface text-theme-text focus:outline-none focus:ring-0"
            />
          </div>

          {/* 批量操作按钮 */}
          {selectedNotes.length > 0 && (
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => showConfirm('restore', selectedNotes)}
                className="flex items-center space-x-1 px-3 py-2 bg-theme-success hover:bg-theme-success/90 text-white text-sm"
              >
                <FiRotateCcw className="h-4 w-4" />
                <span>恢复 ({selectedNotes.length})</span>
              </button>
              <button
                onClick={() => showConfirm('delete', selectedNotes)}
                className="flex items-center space-x-1 px-3 py-2 bg-theme-error hover:bg-theme-error/90 text-white text-sm"
              >
                <FiTrash2 className="h-4 w-4" />
                <span>永久删除 ({selectedNotes.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* 全选按钮 */}
        {filteredNotes.length > 0 && (
          <div className="mt-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-theme-primary hover:underline"
            >
              {selectedNotes.length === filteredNotes.length ? '取消全选' : '全选'}
            </button>
          </div>
        )}
      </div>

      {/* 笔记列表 */}
      <div className="flex-1 overflow-y-auto smooth-scroll-container scrollbar-smooth hide-scrollbar scrollbar-hide bg-theme-bg">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary mx-auto mb-4"></div>
            <p className="text-theme-text-muted">加载中...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12 bg-theme-surface">
            <FiTrash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-theme-text-muted">
              {searchTerm ? '没有找到匹配的笔记' : '回收站为空'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map(note => (
              <div
                key={note.note_id}
                className={`p-4 transition-colors bg-theme-surface ${
                  selectedNotes.includes(note.note_id)
                    ? 'bg-theme-primary/10'
                    : 'hover:bg-theme-hover'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* 选择框 */}
                  <input
                    type="checkbox"
                    checked={selectedNotes.includes(note.note_id)}
                    onChange={() => handleSelectNote(note.note_id)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />

                  {/* 笔记内容 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-theme-text mb-2">
                      {formatContentPreview(note.content)}
                    </p>
                    
                    {/* 标签 */}
                    {note.tags && Array.isArray(note.tags) && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {note.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-theme-hover text-theme-text-secondary text-xs"
                          >
                            #{getTagName(tag)}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* 删除时间 */}
                    <p className="text-xs text-theme-text-muted">
                      删除于: {format(toZonedTime(new Date(note.deletedAt), 'Asia/Shanghai'), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => showConfirm('restore', [note.note_id])}
                      className="p-2 text-theme-success hover:bg-theme-success/10 transition-colors"
                      title="恢复"
                    >
                      <FiRotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => showConfirm('delete', [note.note_id])}
                      className="p-2 text-theme-error hover:bg-theme-error/10 transition-colors"
                      title="永久删除"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 确认对话框 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-theme-surface p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <FiAlertTriangle className="h-6 w-6 text-yellow-500" />
              <h3 className="text-lg font-semibold text-theme-text">
                确认操作
              </h3>
            </div>
            
            <p className="text-theme-text-secondary mb-6">
              {confirmAction?.action === 'restore' 
                ? `确定要恢复 ${confirmAction.noteIds.length} 条笔记吗？`
                : `确定要永久删除 ${confirmAction.noteIds.length} 条笔记吗？此操作无法撤销。`
              }
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-theme-text-secondary hover:bg-theme-hover"
              >
                取消
              </button>
              <button
                onClick={executeConfirmedAction}
                className={`px-4 py-2 text-white ${
                  confirmAction?.action === 'restore'
                    ? 'bg-theme-success hover:bg-theme-success/90'
                    : 'bg-theme-error hover:bg-theme-error/90'
                }`}
              >
                {confirmAction?.action === 'restore' ? '恢复' : '永久删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;