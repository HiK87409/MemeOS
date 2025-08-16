import React, { useState, useEffect } from 'react';
import { FiPaperclip, FiUpload, FiDownload, FiEye, FiRefreshCw, FiLink } from 'react-icons/fi';

const AttachmentManager = ({ className = '' }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 加载附件列表
  const loadAttachments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/upload/list');
      const data = await response.json();
      
      if (data.success) {
        setAttachments(data.files);
      } else {
        console.error('获取附件列表失败:', data.error);
      }
    } catch (error) {
      console.error('获取附件列表失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  // 绑定附件（打开文件选择对话框）
  const handleBindAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      try {
        setLoading(true);
        const formData = new FormData();
        files.forEach(file => {
          formData.append('file', file);
        });
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        if (result.success) {
          // 上传成功后刷新附件列表
          await loadAttachments();
        } else {
          console.error('上传失败:', result.error);
        }
      } catch (error) {
        console.error('上传失败:', error);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };
  
  // 初始化时加载附件列表
  useEffect(() => {
    loadAttachments();
  }, []);
  
  return (
    <div className={`attachment-manager ${className}`}>
      <style jsx>{`
        .attachment-manager {
          margin-top: 20px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
          color: #fff;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .section-title h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }
        
        .attachment-count {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }
        
        .section-actions {
          display: flex;
          gap: 8px;
        }
        
        .bind-btn, .refresh-btn {
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
        
        .bind-btn:hover, .refresh-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .bind-btn:disabled, .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .attachments-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .attachment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }
        
        .attachment-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .attachment-info {
          flex: 1;
        }
        
        .attachment-preview {
          margin-bottom: 8px;
        }
        
        .attachment-image {
          max-width: 200px;
          max-height: 150px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .attachment-image:hover {
          transform: scale(1.05);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        .attachment-name {
          font-weight: 500;
          color: #fff;
          margin-bottom: 4px;
          word-break: break-all;
          font-size: 14px;
        }
        
        .attachment-meta {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .attachment-actions {
          display: flex;
          gap: 8px;
        }
        
        .attachment-link, .attachment-download {
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          color: #fff;
          text-decoration: none;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        
        .attachment-link:hover, .attachment-download:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .empty-attachments {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
          opacity: 0.3;
        }
        
        .empty-attachments p {
          margin: 0;
          font-size: 14px;
        }
        
        .loading {
          text-align: center;
          padding: 20px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }
      `}</style>
      
      {/* 附件管理区域头部 */}
      <div className="section-header">
        <div className="section-title">
          <FiPaperclip className="w-4 h-4" />
          <h3>附件管理</h3>
          <span className="attachment-count">({attachments.length})</span>
        </div>
        <div className="section-actions">
          <button 
            className="refresh-btn" 
            onClick={loadAttachments}
            disabled={loading}
            title="刷新附件列表"
          >
            <FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button 
            className="bind-btn" 
            onClick={handleBindAttachment}
            disabled={loading}
            title="绑定附件"
          >
            <FiLink className="w-3 h-3" />
            绑定附件
          </button>
        </div>
      </div>
      
      {/* 附件列表 */}
      {loading ? (
        <div className="loading">
          <FiRefreshCw className="animate-spin inline-block mr-2" />
          加载中...
        </div>
      ) : attachments.length > 0 ? (
        <div className="attachments-list">
          {attachments.map((attachment, index) => (
            <div key={index} className="attachment-item">
              <div className="attachment-info">
                {isImageFile(attachment.filename) ? (
                  <div className="attachment-preview">
                    <img 
                      src={attachment.url} 
                      alt={attachment.filename}
                      className="attachment-image"
                      onClick={() => window.open(attachment.url, '_blank')}
                    />
                  </div>
                ) : (
                  <div className="attachment-name">{attachment.filename}</div>
                )}
                <div className="attachment-meta">
                  <span className="attachment-size">
                    {formatFileSize(attachment.size)}
                  </span>
                  <span className="attachment-date">
                    {new Date(attachment.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="attachment-actions">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-link"
                  title="查看附件"
                >
                  <FiEye className="w-3 h-3" />
                  查看
                </a>
                <a
                  href={attachment.url}
                  download={attachment.filename}
                  className="attachment-download"
                  title="下载附件"
                >
                  <FiDownload className="w-3 h-3" />
                  下载
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-attachments">
          <div className="empty-icon">
            <FiPaperclip />
          </div>
          <p>暂无附件</p>
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.6 }}>
            点击"绑定附件"按钮上传文件
          </p>
        </div>
      )}
    </div>
  );
};

export default AttachmentManager;