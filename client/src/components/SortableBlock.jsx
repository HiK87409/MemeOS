import React, { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableBlock = ({ id, content, type, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  // 处理内容变化
  const handleContentChange = useCallback((newContent) => {
    setEditContent(newContent);
    onChange(id, newContent);
  }, [id, onChange]);

  // 处理编辑完成
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    handleContentChange(editContent);
  }, [editContent, handleContentChange]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditContent(content);
    }
  }, [content, handleBlur]);

  // 渲染块内容
  const renderBlockContent = () => {
    if (isEditing) {
      return (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0 resize-none"
          rows={Math.max(1, editContent.split('\n').length)}
          autoFocus
        />
      );
    }

    return (
      <div 
        className="p-2 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md min-h-[40px]"
        onClick={() => setIsEditing(true)}
      >
        {content.split('\n').map((line, index) => (
          <div key={index} className="py-1">
            {line}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="relative group mb-2"
      {...attributes}
    >
      {/* 拖拽手柄 - 左侧20px宽区域 */}
      <div 
        {...listeners}
        className="absolute left-0 top-0 w-5 h-full cursor-move flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-l-md"
        style={{ touchAction: 'none' }}
      >
        <div className="text-gray-400 dark:text-gray-500 text-xs">
          ≡
        </div>
      </div>
      
      {/* 块内容 */}
      <div className="pl-6 pr-2 border border-gray-200 dark:border-gray-700 rounded-md hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
        {renderBlockContent()}
      </div>
      
      {/* 拖拽时的蓝色指示线 */}
      {isDragging && (
        <div className="absolute left-0 right-0 h-0.5 bg-blue-500 top-0"></div>
      )}
    </div>
  );
};

export default SortableBlock;