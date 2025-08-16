import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiLink, FiCalendar } from 'react-icons/fi';
import { fetchMyNotesWithPagination } from '../api/notesApi';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import PortalPopup from './PortalPopup';

const NoteReferenceSelector = ({ isOpen, triggerRef, onNoteSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectorRef = useRef(null);
  const searchInputRef = useRef(null);

  // 搜索笔记
  const searchNotes = async (query = '') => {
    try {
      setLoading(true);
      const response = await fetchMyNotesWithPagination(query, 1, 20);
      setNotes(response.notes || []);
      setSelectedIndex(0);
    } catch (error) {
      console.error('搜索笔记失败:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始化时加载最近的笔记
  useEffect(() => {
    if (isOpen) {
      searchNotes();
      // 聚焦搜索框
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // 搜索查询变化时重新搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchNotes(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 键盘导航
  const handleKeyDown = (e) => {
    if (!isOpen || notes.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, notes.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (notes[selectedIndex]) {
          handleNoteSelect(notes[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  // 选择笔记
  const handleNoteSelect = (note) => {
    onNoteSelect(note);
    onClose();
  };

  // PortalPopup 会处理点击外部关闭的逻辑

  // 获取笔记预览文本
  const getNotePreview = (content) => {
    // 移除markdown格式
    const plainText = content
      .replace(/[#*`_~\[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
  };

  // 获取笔记标题
  const getNoteTitle = (content) => {
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();
    
    // 如果第一行是标题格式
    if (firstLine?.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '');
    }
    
    // 否则取前50个字符作为标题
    const plainText = firstLine?.replace(/[#*`_~\[\]()]/g, '').trim();
    return plainText?.length > 50 ? plainText.substring(0, 50) + '...' : plainText || '无标题';
  };

  return (
    <PortalPopup
      isOpen={isOpen}
      triggerRef={triggerRef}
      onClose={onClose}
      className="w-note-selector"
      position="bottom-left"
      offset={{ x: 0, y: 8 }}
    >
      <div
        ref={selectorRef}
        className="max-h-80 rounded-lg shadow-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-elevated)',
          borderColor: 'var(--theme-border)',
        }}
      >
      {/* 搜索框 */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索笔记进行引用..."
            className="w-full px-3 py-2 pl-9 pr-8 text-sm rounded-md focus:outline-none focus:ring-0"
            style={{
              backgroundColor: 'var(--theme-elevated)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
              border: '1px solid'
            }}
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <FiX className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* 笔记列表 */}
      <div className="max-h-64 overflow-y-auto scrollbar-hide smooth-scroll-container scrollbar-smooth">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            搜索中...
          </div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? '未找到匹配的笔记' : '暂无笔记'}
          </div>
        ) : (
          notes.map((note, index) => (
            <div
              key={note.id}
              onClick={() => handleNoteSelect(note)}
              className={`p-3 cursor-pointer border-b transition-colors ${
                index === selectedIndex
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : 'hover:bg-theme-elevated'
              }`}
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FiLink className="h-3 w-3 text-primary-500 flex-shrink-0" />
                    <h4 className="text-sm font-medium truncate" style={{ color: 'var(--theme-text)' }}>
                      {getNoteTitle(note.content)}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {getNotePreview(note.content)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <FiCalendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {format(toZonedTime(new Date(note.created_at), 'Asia/Shanghai'), 'MM-dd HH:mm')}
                    </span>
                    {note.tags && typeof note.tags === 'string' && (
                      <div className="flex gap-1">
                        {note.tags.split(',').slice(0, 2).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="inline-block px-1.5 py-0.5 text-xs rounded bg-theme-elevated text-gray-600 dark:text-gray-300"
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                        {note.tags.split(',').length > 2 && (
                          <span className="text-xs text-gray-400">...</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

        {/* 提示信息 */}
        {notes.length > 0 && (
          <div className="p-2 border-t text-xs text-gray-500 dark:text-gray-400" style={{ borderColor: 'var(--theme-border)' }}>
            使用 ↑↓ 键导航，Enter 键选择，Esc 键关闭
          </div>
        )}
      </div>
    </PortalPopup>
  );
};

export default NoteReferenceSelector;