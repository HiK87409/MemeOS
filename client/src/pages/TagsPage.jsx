import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchNotesByTag, updateNote, deleteNote, togglePinNote } from '../api/notesApi';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import { sortByFuturePriority } from '../utils/timeUtils';

import { FiTag, FiArrowLeft } from 'react-icons/fi';
import { fromZonedTime } from 'date-fns-tz';

const TagsPage = () => {
  const { tagName } = useParams();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载标签下的笔记
  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await fetchNotesByTag(tagName);
      
      // 排序：置顶笔记在前，然后按未来优先级排序（距离当前时间越近的未来时间排在前面）
      data.sort(sortByFuturePriority);
      
      setNotes(data);
      setError(null);
    } catch (err) {
      console.error('加载笔记失败:', err);
      setError('加载笔记失败');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  // 编辑笔记
  const handleEditNote = useCallback(async (id, noteData, options = {}) => {
    try {
      await updateNote(id, noteData);
      
      if (!options.preventReload) {
        await loadNotes();
      } else {
        // 只更新本地状态中的特定笔记，保持排序和位置
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === id 
              ? { 
                  ...note, 
                  ...noteData
                }
              : note
          )
        );
      }
    } catch (err) {
      setError('更新笔记失败');
      console.error(err);
      
      // 如果更新失败，重新加载以恢复状态
      await loadNotes();
    }
  }, []);

  // 删除笔记
  const handleDeleteNote = async (id) => {
    // 找到要删除的笔记
    const noteToDelete = notes.find(note => note.id === id);
    if (!noteToDelete) {
      console.error('[TagsPage] 未找到要删除的笔记');
      return;
    }

    try {
      // 将笔记添加到回收站
      const deletedNotes = JSON.parse(localStorage.getItem('deletedNotes') || '[]');
      const deletedNote = {
        ...noteToDelete,
        deletedAt: new Date().toISOString(),
        originalId: id
      };
      deletedNotes.unshift(deletedNote);
      
      // 限制回收站大小（最多保留100个）
      if (deletedNotes.length > 100) {
        deletedNotes.splice(100);
      }
      
      localStorage.setItem('deletedNotes', JSON.stringify(deletedNotes));
      
      await deleteNote(id);
      await loadNotes(); // 重新加载笔记
    } catch (err) {
      setError('删除笔记失败');
      console.error(err);
      
      // 如果API调用失败，也要从回收站中移除
      try {
        const deletedNotes = JSON.parse(localStorage.getItem('deletedNotes') || '[]');
        const filteredNotes = deletedNotes.filter(note => note.originalId !== id);
        localStorage.setItem('deletedNotes', JSON.stringify(filteredNotes));
      } catch (storageErr) {
        console.error('[TagsPage] 清理回收站失败:', storageErr);
      }
    }
  };

  // 置顶笔记
  const handlePinNote = async (id, isPinned) => {
    // 先乐观更新UI
    const originalNotes = [...notes];
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, is_pinned: !Boolean(note.is_pinned) } : note
    );
    
    // 重新排序：置顶笔记在前，然后按未来优先级排序
    updatedNotes.sort(sortByFuturePriority);
    
    setNotes(updatedNotes);
    
    try {
      await togglePinNote(id);
    } catch (err) {
      // 如果操作失败，恢复原始状态
      setNotes(originalNotes);
      setError('置顶操作失败');
      console.error('[PIN] 置顶操作失败:', err);
    }
  };

  // 处理笔记跳转
  const handleNoteClick = (noteId) => {
    // 查找目标笔记元素
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    if (noteElement) {
      // 滚动到目标笔记 - 使用更长的平滑滚动
      noteElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // 添加高亮效果 - 使用更长的过渡时间和更丰富的动画效果
      noteElement.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      noteElement.style.transform = 'scale(1.03)';
      noteElement.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      noteElement.classList.add('shadow-card-hover');
      setTimeout(() => {
        noteElement.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        noteElement.style.transform = 'scale(1)';
        noteElement.style.boxShadow = '';
        noteElement.classList.remove('shadow-card-hover');
      }, 1500);
    }
  };

  // 返回首页
  const handleGoBack = () => {
    navigate('/');
  };

  // 初始加载
  useEffect(() => {
    if (tagName) {
      loadNotes();
    }
  }, [tagName]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleGoBack}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          返回
        </button>
        
        <div className="flex items-center space-x-2">
          <FiTag className="text-primary-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            标签: {decodeURIComponent(tagName)}
          </h1>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* 笔记列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            找到 {notes.length} 个包含标签 "{decodeURIComponent(tagName)}" 的笔记
          </p>
          {notes.map(note => (
            <div key={note.id} data-note-id={note.id} className="w-full max-w-2xl mx-auto">
              <NoteCard
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onPin={handlePinNote}
                onNoteClick={handleNoteClick}
                notes={notes}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          message={`没有找到包含标签 "${decodeURIComponent(tagName)}" 的笔记`}
          subMessage="创建一个新笔记并添加这个标签吧！"
        />
      )}
    </div>
  );
};

export default TagsPage;