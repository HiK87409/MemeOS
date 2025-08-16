import React, { useState } from 'react';
import { FiX, FiClock, FiEdit, FiPlus, FiTrash2, FiEye, FiEyeOff, FiCopy } from 'react-icons/fi';
import { formatRelativeTime, formatFullDate } from '../utils/timeUtils';
import MarkdownRenderer from './MarkdownRenderer';

const NoteHistoryModal = ({ 
  isOpen, 
  onClose, 
  noteId, 
  noteTitle, 
  noteContent, 
  noteTags, 
  history, 
  onNoteClick 
}) => {
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!isOpen) return null;

  // 处理复制历史记录内容
  const handleCopyContent = async (content, index) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('复制内容失败:', error);
    }
  };

  // 获取操作类型的中文名称
  const getActionName = (action) => {
    switch (action) {
      case 'create': return '创建';
      case 'edit': return '编辑';
      case 'delete': return '删除';
      default: return action;
    }
  };

  // 获取操作类型的颜色
  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'text-green-600 dark:text-green-400';
      case 'edit': return 'text-blue-600 dark:text-blue-400';
      case 'delete': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // 计算内容差异（简单的文本差异）
  const calculateDiff = (oldContent, newContent) => {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diff = [];
    
    let maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === newLine) {
        diff.push({ type: 'same', content: oldLine });
      } else if (!oldLine) {
        diff.push({ type: 'added', content: newLine });
      } else if (!newLine) {
        diff.push({ type: 'removed', content: oldLine });
      } else {
        diff.push({ type: 'removed', content: oldLine });
        diff.push({ type: 'added', content: newLine });
      }
    }
    
    return diff;
  };

  // 计算标签差异
  const calculateTagDiff = (oldTags, newTags) => {
    const diff = [];
    
    // 标准化标签格式为数组
    const normalizeTags = (tags) => {
      if (!tags) return [];
      if (typeof tags === 'string') {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      if (Array.isArray(tags)) {
        return tags.map(tag => typeof tag === 'object' && tag !== null ? tag.name : tag).filter(tag => tag);
      }
      return [];
    };
    
    const oldTagsArray = normalizeTags(oldTags);
    const newTagsArray = normalizeTags(newTags);
    
    // 找出被移除的标签
    oldTagsArray.forEach(tag => {
      if (!newTagsArray.includes(tag)) {
        diff.push({ type: 'removed', content: tag });
      }
    });
    
    // 找出新增的标签
    newTagsArray.forEach(tag => {
      if (!oldTagsArray.includes(tag)) {
        diff.push({ type: 'added', content: tag });
      }
    });
    
    // 找出未变化的标签
    oldTagsArray.forEach(tag => {
      if (newTagsArray.includes(tag)) {
        diff.push({ type: 'same', content: tag });
      }
    });
    
    return diff;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--theme-elevated)' }}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-3">
            <FiClock className="text-blue-600 dark:text-blue-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                笔记历史记录
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {noteTitle || '无标题笔记'} • {history.length} 条记录
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 历史记录列表 */}
          <div className="w-1/3 overflow-y-auto">
            <div className="p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FiClock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>暂无历史记录</p>
                  <p className="text-sm mt-2">最近30天的编辑记录将显示在这里</p>
                </div>
              ) : (
                history.map((record, index) => (
                  <div
                    key={record.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedHistory?.id === record.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedHistory(record)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${getActionColor(record.operation_type)}`}>
                        {getActionName(record.operation_type)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(record.created_at)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {formatFullDate(record.created_at)}
                    </div>
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {record.content ? record.content.substring(0, 100) : '无内容'}
                      {record.content && record.content.length > 100 && '...'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 历史记录详情 */}
          <div className="flex-1 overflow-y-auto">
            {selectedHistory ? (
              <div className="p-6">
                {/* 操作栏 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(selectedHistory.operation_type)}`}>
                      {getActionName(selectedHistory.operation_type)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatFullDate(selectedHistory.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {showDiff ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      <span className="ml-1">{showDiff ? '隐藏差异' : '显示差异'}</span>
                    </button>
                    <button
                      onClick={() => handleCopyContent(selectedHistory.content, history.indexOf(selectedHistory))}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <FiCopy size={16} />
                      <span className="ml-1">
                        {copiedIndex === history.indexOf(selectedHistory) ? '已复制' : '复制'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 标签 */}
                {showDiff && noteTags ? (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">标签差异</h4>
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--theme-elevated)' }}>
                      {calculateTagDiff(noteTags, selectedHistory.tags).map((tag, index) => (
                        <span
                          key={index}
                          className={`inline-block px-2 py-1 text-xs rounded-full mr-2 mb-2 ${
                            tag.type === 'added'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : tag.type === 'removed'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          }`}
                        >
                          {tag.type === 'added' && '+ '}
                          {tag.type === 'removed' && '- '}
                          {tag.content}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  selectedHistory.tags && selectedHistory.tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">标签</h4>
                      <div className="flex flex-wrap gap-2">
                        {typeof selectedHistory.tags === 'string' 
                          ? selectedHistory.tags.split(',').map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                              >
                                {tag.trim()}
                              </span>
                            ))
                          : selectedHistory.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                              >
                                {tag}
                              </span>
                            ))
                        }
                      </div>
                    </div>
                  )
                )}

                {/* 内容 */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">内容</h4>
                  {showDiff && noteContent ? (
                    <div className="rounded-lg p-4 max-h-96 overflow-y-auto" style={{ backgroundColor: 'var(--theme-elevated)' }}>
                      {calculateDiff(noteContent, selectedHistory.content || '').map((line, index) => (
                        <div
                          key={index}
                          className={`py-1 px-2 ${
                            line.type === 'added'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : line.type === 'removed'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {line.type === 'added' && '+ '}
                          {line.type === 'removed' && '- '}
                          {line.content || ' '}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg p-4 max-h-96 overflow-y-auto" style={{ backgroundColor: 'var(--theme-elevated)' }}>
                      <MarkdownRenderer content={selectedHistory.content || ''} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <FiClock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>选择一条历史记录查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4" style={{ backgroundColor: 'var(--theme-elevated)' }}>
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>仅显示最近30天的编辑记录</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteHistoryModal;