import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiX } from 'react-icons/fi';
import NoteEditor from '../components/NoteEditor';
import { updateNote } from '../api/notesApi';


const NoteEditByIdPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const note = location.state?.note || null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理笔记保存
  const handleSubmit = async (noteData) => {
    if (!note) return;

    setIsSubmitting(true);
    try {
      await updateNote(note.id, noteData);
      // 保存成功后跳转到首页
      navigate('/', { state: { noteUpdated: true } });
    } catch (error) {
      console.error('保存笔记失败:', error);
      if (window.showToast) {
        window.showToast('保存笔记失败，请重试', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    navigate(-1);
  };

  if (!note) {
    return (
      <div className="min-h-screen bg-theme-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-theme-text mb-4">未找到笔记数据</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-surface">
      {/* 编辑器区域 */}
      <div className="w-full flex justify-center px-4 py-6 pt-12">
        <div className="w-[70%] max-w-none rounded-lg shadow-sm border border-theme-border" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <NoteEditor
            note={note}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitText="保存"
            showCancel={true}
            isEditMode={true}
            autoFocus={true}
            initialTags={note.tags || []}
            overrideWidth="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default NoteEditByIdPage;
