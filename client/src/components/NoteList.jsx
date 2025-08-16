import React from 'react';
import NoteCard from './NoteCard';

const NoteList = ({ notes, onEdit, onDelete, loading }) => {
  // 确保标签是数组格式
  const getTagsArray = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">暂无笔记</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map(note => (
        <div key={note.id} className="bg-theme-surface rounded-lg shadow p-4">
          <NoteCard 
            note={note} 
            onEdit={onEdit} 
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
};

export default NoteList;