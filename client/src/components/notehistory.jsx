/**
 * 笔记历史记录组件
 * 显示和管理单个笔记的历史记录，支持30天保留期和回滚功能
 */

import React, { useState, useEffect } from 'react';
import { format, toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import { enhancedBackupManager } from '../utils/enhancedbackupmanager';

const NoteHistory = ({ noteId, currentContent, currentTags, onRestore }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [previewContent, setPreviewContent] = useState('');

  // 加载历史记录
  const loadHistory = async () => {
    if (!noteId) return;
    
    try {
      setLoading(true);
      const noteHistory = await enhancedBackupManager.getNoteHistory(noteId);
      setHistory(noteHistory);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [noteId]);

  // 格式化时间
  const formatTime = (timestamp) => {
    try {
      return format(toZonedTime(new Date(timestamp), 'Asia/Shanghai'), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
    } catch (error) {
      return timestamp;
    }
  };

  // 预览版本
  const handlePreview = (record) => {
    setSelectedVersion(record);
    setPreviewContent(record.content);
  };

  // 恢复版本
  const handleRestore = async (record) => {
    if (!window.confirm('确定要恢复到此版本吗？当前内容将被替换。')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // 创建历史记录
      await enhancedBackupManager.createHistoryRecord([{
        id: noteId,
        content: currentContent,
        tags: currentTags || []
      }], 'restore');
      
      // 调用父组件的恢复函数
      if (onRestore) {
        onRestore(record.content, record.tags || []);
      }
      
      // 重新加载历史记录
      await loadHistory();
      
      alert('恢复成功！');
    } catch (error) {
      console.error('恢复失败:', error);
      alert('恢复失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取操作类型的中文名称
  const getActionName = (action) => {
    switch (action) {
      case 'backup': return '备份';
      case 'restore': return '恢复';
      case 'update': return '更新';
      case 'delete': return '删除';
      default: return action;
    }
  };

  // 获取操作类型的颜色类
  const getActionColor = (action) => {
    switch (action) {
      case 'backup': return 'action-backup';
      case 'restore': return 'action-restore';
      case 'update': return 'action-update';
      case 'delete': return 'action-delete';
      default: return 'action-default';
    }
  };

  // 计算内容差异
  const getContentDiff = (oldContent, newContent) => {
    if (!oldContent || !newContent) return null;
    
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diff = [];
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine !== newLine) {
        diff.push({
          line: i + 1,
          old: oldLine,
          new: newLine
        });
      }
    }
    
    return diff;
  };

  return (
    <div className="note-history">
      <div className="history-header">
        <h3>历史记录</h3>
        <button 
          className="toggle-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '收起' : '展开'}
        </button>
      </div>
      
      {expanded && (
        <div className="history-content">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : history.length === 0 ? (
            <div className="no-history">暂无历史记录</div>
          ) : (
            <div className="history-list">
              {history.map((record, index) => {
                const diff = getContentDiff(record.content, currentContent);
                const hasChanges = diff && diff.length > 0;
                
                return (
                  <div key={record.id} className="history-item">
                    <div className="history-item-header">
                      <div className="history-info">
                        <span className={`action-type ${getActionColor(record.action)}`}>
                          {getActionName(record.action)}
                        </span>
                        <span className="history-time">
                          {formatTime(record.timestamp)}
                        </span>
                        {hasChanges && (
                          <span className="changes-indicator">
                            {diff.length} 处变更
                          </span>
                        )}
                      </div>
                      <div className="history-actions">
                        <button 
                          className="btn btn-small btn-secondary"
                          onClick={() => handlePreview(record)}
                        >
                          预览
                        </button>
                        <button 
                          className="btn btn-small btn-primary"
                          onClick={() => handleRestore(record)}
                          disabled={loading}
                        >
                          恢复
                        </button>
                      </div>
                    </div>
                    
                    {/* 标签信息 */}
                    {record.tags && record.tags.length > 0 && (
                      <div className="history-tags">
                        <span className="tags-label">标签:</span>
                        <div className="tags-list">
                          {record.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="tag">
                              {typeof tag === 'string' ? tag : tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 内容预览 */}
                    <div className="content-preview">
                      <div className="preview-header">
                        <span>内容预览:</span>
                        <span className="content-length">
                          {record.content.length} 字符
                        </span>
                      </div>
                      <div className="preview-text">
                        {record.content.length > 100 
                          ? record.content.substring(0, 100) + '...'
                          : record.content
                        }
                      </div>
                    </div>
                    
                    {/* 变更详情 */}
                    {hasChanges && (
                      <div className="changes-details">
                        <div className="changes-header">变更详情:</div>
                        <div className="changes-list">
                          {diff.slice(0, 3).map((change, changeIndex) => (
                            <div key={changeIndex} className="change-item">
                              <span className="line-number">第{change.line}行:</span>
                              {change.old && (
                                <div className="old-content">
                                  <span className="change-type">删除:</span>
                                  <span className="content-text">{change.old}</span>
                                </div>
                              )}
                              {change.new && (
                                <div className="new-content">
                                  <span className="change-type">添加:</span>
                                  <span className="content-text">{change.new}</span>
                                </div>
                              )}
                            </div>
                          ))}
                          {diff.length > 3 && (
                            <div className="more-changes">
                              还有 {diff.length - 3} 处变更...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* 版本预览弹窗 */}
              {selectedVersion && (
                <div className="version-preview-modal">
                  <div className="modal-overlay" onClick={() => setSelectedVersion(null)} />
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>版本预览</h3>
                      <button 
                        className="close-btn"
                        onClick={() => setSelectedVersion(null)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="version-info">
                        <span className="version-action">
                          {getActionName(selectedVersion.action)}
                        </span>
                        <span className="version-time">
                          {formatTime(selectedVersion.timestamp)}
                        </span>
                      </div>
                      
                      {selectedVersion.tags && selectedVersion.tags.length > 0 && (
                        <div className="version-tags">
                          <span className="tags-label">标签:</span>
                          <div className="tags-list">
                            {selectedVersion.tags.map((tag, tagIndex) => (
                              <span key={tagIndex} className="tag">
                                {typeof tag === 'string' ? tag : tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="version-content">
                        <div className="content-header">
                          <span>内容:</span>
                          <span className="content-stats">
                            {previewContent.length} 字符, 
                            {previewContent.split('\n').length} 行
                          </span>
                        </div>
                        <div className="content-text">
                          {previewContent.split('\n').map((line, index) => (
                            <div key={index} className="content-line">
                              <span className="line-number">{index + 1}</span>
                              <span className="line-content">{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button 
                        className="btn btn-secondary"
                        onClick={() => setSelectedVersion(null)}
                      >
                        关闭
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          handleRestore(selectedVersion);
                          setSelectedVersion(null);
                        }}
                        disabled={loading}
                      >
                        恢复到此版本
                      </button>
                    </div>
                  </div>
                </div>
              )}
        </div>
      )}
    </div>
  );
};

export default NoteHistory;