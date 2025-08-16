import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiArrowRight, FiArrowLeft, FiLink, FiRefreshCw, FiArrowUpLeft, FiArrowDownRight } from 'react-icons/fi';
import { fetchNoteReferences } from '../api/notesApi';
import { formatFullDate } from '../utils/timeUtils';

// 动画类名（已禁用）
const ANIMATION_CLASSES = {
  backdropEnter: '',
  backdropExit: '',
  modalEnter: '',
  modalExit: '',
  duration: ''
};

const ReferencesModal = ({ isOpen, onClose, noteId, noteTitle, onNoteClick, triggerPosition = null }) => {
  const [references, setReferences] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  // 处理显示状态和位置计算
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimating(true);
      
      // 始终使用默认屏幕中央显示
      setModalPosition({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
    } else {
      setIsAnimating(false);
      // 立即移除DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, triggerPosition]);

  // 加载引用关系数据
  useEffect(() => {
    if (isOpen && noteId) {
      loadReferences();
      
      // 添加轮询机制，每30秒更新一次引用数据
      const pollInterval = setInterval(loadReferences, 30000);
      
      // 清理函数
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [isOpen, noteId]);

  const loadReferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNoteReferences(noteId);
      setReferences(data);
    } catch (err) {
      setError('加载引用关系失败');
      console.error('加载引用关系失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理笔记点击
  const handleNoteClick = (clickedNoteId) => {
    if (onNoteClick) {
      onNoteClick(clickedNoteId);
    }
    onClose();
  };

  // 获取笔记标题
  const getNoteTitle = (content) => {
    if (!content) return '无标题';
    
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();
    
    // 如果第一行是标题格式
    if (firstLine?.startsWith('#')) {
      let title = firstLine.replace(/^#+\s*/, '');
      // 移除HTML标签但保留内容
      title = title.replace(/<[^>]*>/g, '');
      return title.trim() || '无标题';
    }
    
    // 如果是任务列表格式，保留任务内容作为标题
    if (firstLine?.match(/^[-*+]\s+/)) {
      let taskContent = firstLine.replace(/^[-*+]\s+/, '').trim();
      // 移除HTML标签但保留内容
      taskContent = taskContent.replace(/<[^>]*>/g, '');
      return taskContent?.length > 50 ? taskContent.substring(0, 50) + '...' : taskContent || '无标题';
    }
    
    // 否则取前50个字符作为标题
    let plainText = firstLine?.replace(/[#*`_~\[\]()]/g, '').trim();
    // 移除HTML标签但保留内容
    plainText = plainText?.replace(/<[^>]*>/g, '').trim();
    return plainText?.length > 50 ? plainText.substring(0, 50) + '...' : plainText || '无标题';
  };

  if (!shouldRender) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000]" onClick={onClose}></div>
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-references-modal w-full mx-4 max-h-[80vh] overflow-hidden ${ANIMATION_CLASSES.duration} ${isAnimating ? ANIMATION_CLASSES.modalEnter : ANIMATION_CLASSES.modalExit}`}
        style={{
          backgroundColor: 'var(--theme-elevated)',
          border: '1px solid var(--theme-border)',
          transformOrigin: 'center',
          position: 'fixed',
          zIndex: 10001,
          ...modalPosition
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="flex items-center">
            <FiLink className="mr-3" size={20} style={{ color: 'var(--theme-primary)' }} />
            <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-text)' }}>
              双向链接
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadReferences}
              disabled={loading}
              className="p-2 rounded-md transition-colors"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-elevated)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              title="刷新双向链接"
            >
              <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md transition-colors"
              style={{ color: 'var(--theme-text-secondary)' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-elevated)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh] smooth-scroll-container scrollbar-smooth">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--theme-primary)' }}></div>
              <span className="ml-3" style={{ color: 'var(--theme-text-secondary)' }}>加载中...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--theme-error)' }}>{error}</p>
              <button
                onClick={loadReferences}
                className="mt-4 px-4 py-2 rounded-md transition-colors"
                style={{ 
                  backgroundColor: 'var(--theme-primary)', 
                  color: 'white' 
                }}
              >
                重试
              </button>
            </div>
          ) : (
            <div className="space-y-6">


              {/* 被引用关系（谁引用了这个笔记） */}
              <div>
                <div className="flex items-center mb-4">
                  <FiArrowDownRight className="mr-2" style={{ color: 'var(--theme-primary)' }} />
                  <h3 className="text-lg font-medium" style={{ color: 'var(--theme-text)' }}>
                    被引用 ({references.incoming?.length || 0})
                  </h3>
                </div>
                {references.incoming && references.incoming.length > 0 ? (
                  <div className="space-y-3">
                    {references.incoming.map((ref) => (
                      <div
                        key={`incoming-${ref.id}`}
                        className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md"
                        style={{ 
                          backgroundColor: 'var(--theme-surface)',
                          borderColor: 'var(--theme-border)'
                        }}
                        onClick={() => handleNoteClick(ref.from_note_id)}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-elevated)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
                      >
                        <h4 className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                          {getNoteTitle(ref.from_note_content)}
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                          引用文本: "{ref.reference_text}"
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                          创建时间: {formatFullDate(ref.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4" style={{ color: 'var(--theme-text-secondary)' }}>
                    暂无其他笔记引用此笔记
                  </p>
                )}
              </div>

              {/* 引用关系（这个笔记引用了谁） */}
              <div>
                <div className="flex items-center mb-4">
                  <FiArrowUpLeft className="mr-2" style={{ color: 'var(--theme-primary)' }} />
                  <h3 className="text-lg font-medium" style={{ color: 'var(--theme-text)' }}>
                    引用 ({references.outgoing?.length || 0})
                  </h3>
                </div>
                {references.outgoing && references.outgoing.length > 0 ? (
                  <div className="space-y-3">
                    {references.outgoing.map((ref) => (
                      <div
                        key={`outgoing-${ref.id}`}
                        className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md"
                        style={{ 
                          backgroundColor: 'var(--theme-surface)',
                          borderColor: 'var(--theme-border)'
                        }}
                        onClick={() => handleNoteClick(ref.to_note_id)}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--theme-elevated)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--theme-surface)'}
                      >
                        <h4 className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                          {getNoteTitle(ref.to_note_content)}
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                          引用文本: "{ref.reference_text}"
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                          创建时间: {formatFullDate(ref.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4" style={{ color: 'var(--theme-text-secondary)' }}>
                    此笔记暂未引用其他笔记
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default ReferencesModal;