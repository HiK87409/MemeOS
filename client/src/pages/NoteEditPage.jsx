import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiX } from 'react-icons/fi';
import NoteEditor from '../components/NoteEditor';
import { createNote } from '../api/notesApi';


const NoteEditPage = () => {
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理笔记提交
  const handleSubmit = async (noteData) => {

    setIsSubmitting(true);
    try {
      const result = await createNote(noteData);
      console.log('笔记创建成功:', result);
      
      // 创建成功后跳转到首页
      navigate('/');
    } catch (error) {
      console.error('创建笔记失败:', error);
      alert('创建笔记失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-theme-surface">
      {/* 编辑器区域 - 移除顶部导航栏 */}
      <div className="w-full flex justify-center px-4 py-6 pt-12">
        <div className="w-[70%] max-w-none rounded-lg shadow-sm border border-theme-border" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <NoteEditor
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitText="发布"
            showCancel={true}
            isEditMode={false}
            autoFocus={true}
            initialTags={[]}
            overrideWidth="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default NoteEditPage;