import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCalendar } from 'react-icons/fi';
import { fetchNotesByDateExact, updateNote, deleteNote } from '../api/notesApi';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const DatePage = () => {
  const { date } = useParams();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // 加载特定日期的笔记
  const loadNotes = async () => {
    try {
      setLoading(true);
      console.log(`加载日期 ${date} 的笔记`);
      const data = await fetchNotesByDateExact(date);
      console.log(`获取到 ${data.length} 条笔记`);
      setNotes(data);
      setError(null);
    } catch (err) {
      setError('加载笔记失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载
  useEffect(() => {
    if (date) {
      loadNotes();
    } else {
      setError('无效的日期参数');
    }
  }, [date]);
  
  // 编辑笔记
  const handleEditNote = async (id, noteData) => {
    try {
      await updateNote(id, noteData);
      await loadNotes(); // 重新加载笔记
    } catch (err) {
      setError('更新笔记失败');
      console.error(err);
    }
  };
  
  // 删除笔记
  const handleDeleteNote = async (id) => {
    // 找到要删除的笔记
    const noteToDelete = notes.find(note => note.id === id);
    if (!noteToDelete) {
      console.error('[DatePage] 未找到要删除的笔记');
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
      setNotes(notes.filter(note => note.id !== id));
    } catch (err) {
      setError('删除笔记失败');
      console.error(err);
      
      // 如果API调用失败，也要从回收站中移除
      try {
        const deletedNotes = JSON.parse(localStorage.getItem('deletedNotes') || '[]');
        const filteredNotes = deletedNotes.filter(note => note.originalId !== id);
        localStorage.setItem('deletedNotes', JSON.stringify(filteredNotes));
      } catch (storageErr) {
        console.error('[DatePage] 清理回收站失败:', storageErr);
      }
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

  // 格式化日期显示
  const formatDateString = (dateString) => {
    try {
      const dateObj = parseISO(dateString);
      return format(dateObj, 'yyyy年MM月dd日 EEEE', { locale: zhCN });
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div>
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-3 p-2 rounded-md hover:bg-theme-elevated">
          <FiArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center">
          <FiCalendar className="mr-2 h-5 w-5 text-primary-500" />
          <h2 className="text-2xl font-bold">{formatDateString(date)}</h2>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-4">
          {notes.map(note => (
            <div key={note.id} data-note-id={note.id} className="w-full max-w-2xl mx-auto">
              <NoteCard
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onNoteClick={handleNoteClick}
                notes={notes}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          message={`${formatDateString(date)}没有笔记`}
          subMessage="这一天还没有创建笔记"
        />
      )}
    </div>
  );
};

export default DatePage;
