import React, { useState } from 'react';
import FullScreenEditor from '../components/FullScreenEditor';

const FullScreenEditorDemo = () => {
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorTags, setEditorTags] = useState([]);
  const [submittedNotes, setSubmittedNotes] = useState([]);

  const handleEditorSubmit = (data) => {
    console.log('提交的笔记数据:', data);
    
    const newNote = {
      id: Date.now(),
      content: data.content,
      tags: data.tags,
      date: data.date,
      mood: data.mood,
      weather: data.weather,
      createdAt: new Date()
    };
    
    setSubmittedNotes(prev => [newNote, ...prev]);
    setEditorContent(data.content);
    setEditorTags(data.tags);
    setIsEditorActive(false);
  };

  const handleEditorCancel = () => {
    setIsEditorActive(false);
  };

  const handleEditorActivate = () => {
    setIsEditorActive(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">全屏编辑器演示</h1>
        
        {/* 激活编辑器的按钮 */}
        <div className="mb-6">
          <button
            onClick={handleEditorActivate}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg"
          >
            打开全屏编辑器
          </button>
        </div>
        
        {/* 当前编辑器状态显示 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">编辑器状态</h2>
          <div className="space-y-2">
            <p><span className="font-medium">激活状态:</span> {isEditorActive ? '已激活' : '未激活'}</p>
            <p><span className="font-medium">当前内容:</span> {editorContent || '无内容'}</p>
            <p><span className="font-medium">当前标签:</span> {editorTags.length > 0 ? editorTags.join(', ') : '无标签'}</p>
          </div>
        </div>
        
        {/* 已提交的笔记列表 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">已提交的笔记 ({submittedNotes.length})</h2>
          
          {submittedNotes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无提交的笔记</p>
          ) : (
            <div className="space-y-4">
              {submittedNotes.map(note => (
                <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {note.mood && (
                        <span className="text-lg">{note.mood}</span>
                      )}
                      {note.weather && (
                        <span className="text-lg">{note.weather}</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {note.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 全屏编辑器组件 */}
      <FullScreenEditor
        isActive={isEditorActive}
        onActivate={handleEditorActivate}
        onSubmit={handleEditorSubmit}
        onCancel={handleEditorCancel}
        initialContent={editorContent}
        initialTags={editorTags}
        submitText="发布笔记"
        showCancel={true}
        autoFocus={true}
      />
    </div>
  );
};

export default FullScreenEditorDemo;