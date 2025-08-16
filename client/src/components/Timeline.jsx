import React, { useState, useEffect } from 'react';
import { FiClock, FiImage, FiFile, FiEye, FiLink } from 'react-icons/fi';

const Timeline = ({ className = '' }) => {
  const [attachments, setAttachments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [timelineItems, setTimelineItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 检查是否为图片文件
  const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  };
  
  // 检查文件是否被笔记使用
  const isFileUsedInNotes = (filename) => {
    return notes.some(note => {
      if (!note.content) return false;
      // 检查笔记内容中是否包含文件名或文件路径
      const content = note.content.toLowerCase();
      const searchTerms = [
        filename.toLowerCase(),
        `/uploads/${filename}`.toLowerCase(),
        filename.split('.')[0].toLowerCase() // 不带扩展名的文件名
      ];
      return searchTerms.some(term => content.includes(term));
    });
  };
  
  // 获取使用文件的笔记
  const getNotesUsingFile = (filename) => {
    return notes.filter(note => {
      if (!note.content) return false;
      const content = note.content.toLowerCase();
      const searchTerms = [
        filename.toLowerCase(),
        `/uploads/${filename}`.toLowerCase(),
        filename.split('.')[0].toLowerCase()
      ];
      return searchTerms.some(term => content.includes(term));
    });
  };
  
  // 格式化相对时间
  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return new Date(date).toLocaleDateString();
  };
  
  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载附件列表
      const attachmentsResponse = await fetch('/api/upload/list');
      const attachmentsData = await attachmentsResponse.json();
      if (attachmentsData.success) {
        setAttachments(attachmentsData.files);
      }
      
      // 加载笔记列表
      const notesResponse = await fetch('/api/notes/my');
      const notesData = await notesResponse.json();
      if (notesData.success) {
        setNotes(notesData.notes || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 生成时间线项目
  useEffect(() => {
    if (attachments.length > 0 && notes.length > 0) {
      const items = [];
      
      // 添加附件项目
      attachments.forEach(attachment => {
        const usedInNotes = isFileUsedInNotes(attachment.filename);
        const usingNotes = getNotesUsingFile(attachment.filename);
        
        items.push({
          id: `attachment-${attachment.filename}`,
          type: 'attachment',
          timestamp: attachment.createdAt,
          data: attachment,
          usedInNotes,
          usingNotes
        });
      });
      
      // 添加笔记项目
      notes.forEach(note => {
        items.push({
          id: `note-${note.id}`,
          type: 'note',
          timestamp: note.created_at,
          data: note
        });
      });
      
      // 按时间排序
      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setTimelineItems(items);
    }
  }, [attachments, notes]);
  
  // 初始化时加载数据
  useEffect(() => {
    loadData();
  }, []);
  
  return (
    <div className={`timeline ${className}`}>
      <style jsx>{`
        .timeline {
          margin-top: 20px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .timeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          color: #fff;
        }
        
        .timeline-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .timeline-title h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }
        
        .refresh-btn {
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .refresh-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .timeline-list {
          position: relative;
          padding-left: 30px;
        }
        
        .timeline-list::before {
          content: '';
          position: absolute;
          left: 8px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .timeline-item {
          position: relative;
          margin-bottom: 20px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }
        
        .timeline-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .timeline-item::before {
          content: '';
          position: absolute;
          left: -22px;
          top: 20px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--theme-primary);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .timeline-item.attachment::before {
          background: var(--theme-warning);
        }
        
        .timeline-item.used::before {
          background: var(--theme-success);
        }
        
        .timeline-item.unused::before {
          background: var(--theme-error);
        }
        
        .timeline-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        
        .timeline-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        
        .timeline-info {
          flex: 1;
        }
        
        .timeline-title-text {
          font-weight: 500;
          color: #fff;
          margin-bottom: 4px;
          font-size: 14px;
        }
        
        .timeline-meta {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
        }
        
        .timeline-description {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.4;
        }
        
        .usage-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          margin-top: 8px;
        }
        
        .usage-status.used {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        
        .usage-status.unused {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .attachment-preview {
          margin-top: 8px;
        }
        
        .attachment-image {
          max-width: 120px;
          max-height: 80px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .attachment-image:hover {
          transform: scale(1.05);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        .using-notes {
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .using-notes strong {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .note-snippet {
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
          margin-top: 4px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .loading {
          text-align: center;
          padding: 20px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }
        
        .empty-timeline {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
          opacity: 0.3;
        }
        
        .empty-timeline p {
          margin: 0;
          font-size: 14px;
        }
      `}</style>
      
      {/* 时间线头部 */}
      <div className="timeline-header">
        <div className="timeline-title">
          <FiClock className="w-4 h-4" />
          <h3>时间线</h3>
        </div>
        <button 
          className="refresh-btn" 
          onClick={loadData}
          disabled={loading}
          title="刷新时间线"
        >
          <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
      
      {/* 时间线内容 */}
      {loading ? (
        <div className="loading">
          <FiRefreshCw className="animate-spin inline-block mr-2" />
          加载中...
        </div>
      ) : timelineItems.length > 0 ? (
        <div className="timeline-list">
          {timelineItems.map((item) => (
            <div 
              key={item.id} 
              className={`timeline-item ${item.type} ${item.type === 'attachment' ? (item.usedInNotes ? 'used' : 'unused') : ''}`}
            >
              <div className="timeline-content">
                <div className="timeline-icon">
                  {item.type === 'attachment' ? (
                    isImageFile(item.data.filename) ? (
                      <FiImage size={14} />
                    ) : (
                      <FiFile size={14} />
                    )
                  ) : (
                    <FiFile size={14} />
                  )}
                </div>
                <div className="timeline-info">
                  <div className="timeline-title-text">
                    {item.type === 'attachment' ? (
                      <span>{item.data.filename}</span>
                    ) : (
                      <span>笔记: {item.data.content.substring(0, 50)}{item.data.content.length > 50 ? '...' : ''}</span>
                    )}
                  </div>
                  <div className="timeline-meta">
                    <span>{formatRelativeTime(item.timestamp)}</span>
                    {item.type === 'attachment' && (
                      <span>{formatFileSize(item.data.size)}</span>
                    )}
                  </div>
                  <div className="timeline-description">
                    {item.type === 'attachment' ? (
                      <>
                        {isImageFile(item.data.filename) && (
                          <div className="attachment-preview">
                            <img 
                              src={item.data.url} 
                              alt={item.data.filename}
                              className="attachment-image"
                              onClick={() => window.open(item.data.url, '_blank')}
                            />
                          </div>
                        )}
                        <div className={`usage-status ${item.usedInNotes ? 'used' : 'unused'}`}>
                          {item.usedInNotes ? (
                            <>
                              <FiEye size={12} />
                              已被笔记使用
                            </>
                          ) : (
                            <>
                              <FiLink size={12} />
                              未被使用
                            </>
                          )}
                        </div>
                        {item.usedInNotes && item.usingNotes.length > 0 && (
                          <div className="using-notes">
                            <strong>使用此文件的笔记:</strong>
                            {item.usingNotes.map((note, index) => (
                              <div key={index} className="note-snippet">
                                {note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <span>{item.data.content.substring(0, 100)}{item.data.content.length > 100 ? '...' : ''}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-timeline">
          <div className="empty-icon">
            <FiClock />
          </div>
          <p>暂无时间线记录</p>
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.6 }}>
            上传附件或创建笔记后将在此显示
          </p>
        </div>
      )}
    </div>
  );
};

export default Timeline;