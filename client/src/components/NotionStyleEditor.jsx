import React, { useState, useRef, useEffect } from 'react';
import '../styles/NotionStyleEditor.css';

const NotionStyleEditor = () => {
  const [blocks, setBlocks] = useState([
    { id: '1', type: 'heading', content: '欢迎使用 Notion 风格编辑器', level: 1 },
    { id: '2', type: 'paragraph', content: '这是一个具有极简主义设计的编辑器，专注于提供优雅的写作体验。' },
    { id: '3', type: 'paragraph', content: '点击任意块开始编辑，享受流畅的写作体验。' },
  ]);
  
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState('insert'); // 'insert' or 'overwrite'
   const [darkMode, setDarkMode] = useState(false); // 深色模式
   const editorRef = useRef(null);
  
  // 切换输入模式
  const toggleInputMode = () => {
    setInputMode(prev => prev === 'insert' ? 'overwrite' : 'insert');
  };
  
  // 切换深色模式
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // 处理块内容变化
  const handleBlockChange = (blockId, newContent) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId ? { ...block, content: newContent } : block
      )
    );
  };

  // 处理键盘事件
  const handleKeyDown = (e, blockId) => {
    // Insert 键切换输入模式
      if (e.key === 'Insert') {
        e.preventDefault();
        toggleInputMode();
      }
      
      // Ctrl/Cmd + D 切换深色模式
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleDarkMode();
      }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const currentIndex = blocks.findIndex(block => block.id === blockId);
      const newBlock = {
        id: Date.now().toString(),
        type: 'paragraph',
        content: ''
      };
      
      const newBlocks = [...blocks];
      newBlocks.splice(currentIndex + 1, 0, newBlock);
      setBlocks(newBlocks);
      
      // 延迟聚焦到新块
      setTimeout(() => {
        setActiveBlockId(newBlock.id);
        const newElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
        if (newElement) {
          newElement.focus();
        }
      }, 0);
    }
    
    if (e.key === 'Backspace' && e.target.textContent === '') {
      e.preventDefault();
      const currentIndex = blocks.findIndex(block => block.id === blockId);
      if (currentIndex > 0) {
        const newBlocks = blocks.filter(block => block.id !== blockId);
        setBlocks(newBlocks);
        
        // 聚焦到前一个块
        setTimeout(() => {
          setActiveBlockId(blocks[currentIndex - 1].id);
          const prevElement = document.querySelector(`[data-block-id="${blocks[currentIndex - 1].id}"]`);
          if (prevElement) {
            prevElement.focus();
            // 将光标移到末尾
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(prevElement);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }, 0);
      }
    }
  };

  // 渲染块内容
  const renderBlock = (block) => {
    const isActive = activeBlockId === block.id;
    
    const commonProps = {
      'data-block-id': block.id,
      contentEditable: true,
      suppressContentEditableWarning: true,
      'data-input-mode': inputMode,
      onFocus: () => setActiveBlockId(block.id),
      onBlur: () => {
        // 延迟清除活动状态，避免点击其他元素时闪烁
        setTimeout(() => {
          if (activeBlockId === block.id) {
            setActiveBlockId(null);
          }
        }, 200);
      },
      onInput: (e) => {
        // 如果是覆盖模式且是文本输入
        if (inputMode === 'overwrite' && e.inputType === 'insertText') {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (range.collapsed) {
              const textNode = range.startContainer;
              const offset = range.startOffset;
              
              // 如果光标不在文本末尾，选择并替换下一个字符
              if (textNode.textContent && offset < textNode.textContent.length) {
                e.preventDefault();
                
                // 选择下一个字符
                range.setStart(textNode, offset);
                range.setEnd(textNode, offset + 1);
                
                // 替换为新输入的字符
                range.deleteContents();
                const textNode = document.createTextNode(e.data);
                range.insertNode(textNode);
                
                // 移动光标到插入位置后
                range.setStart(textNode, 1);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                
                // 更新块内容
                handleBlockChange(block.id, e.target.textContent);
                return;
              }
            }
          }
        }
        handleBlockChange(block.id, e.target.textContent);
      },
      onKeyDown: (e) => handleKeyDown(e, block.id),
      className: `
        outline-none transition-all duration-200
        ${isActive ? 'border-l-3 border-blue-200 bg-white' : 'border-l-3 border-transparent'}
        hover:bg-gray-50 focus:bg-white
        min-h-[24px] py-2 px-3 -ml-3
        cursor-text
      `,
      style: {
        caretColor: '#3b82f6',
      }
    };

    switch (block.type) {
      case 'heading':
        const headingSize = block.level === 1 ? 'text-2xl' : 'text-xl';
        return (
          <h2 
            {...commonProps}
            className={`${commonProps.className} ${headingSize} font-semibold text-gray-800 mb-4`}
          >
            {block.content}
          </h2>
        );
      
      case 'paragraph':
        return (
          <p 
            {...commonProps}
            className={`${commonProps.className} text-base text-gray-700 leading-relaxed mb-3`}
          >
            {block.content}
          </p>
        );
      
      default:
        return (
          <div 
            {...commonProps}
            className={`${commonProps.className} text-base text-gray-700 leading-relaxed mb-3`}
          >
            {block.content}
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-[#fcfcfc]'}`} style={{ paddingTop: '48px' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&display=swap');
        
        body {
          font-family: 'Inter', 'Noto Sans SC', sans-serif;
        }
        
        [contenteditable="true"] {
          outline: none;
        }
        
        [contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #999;
        }
        
        [contenteditable="true"][data-input-mode="overwrite"] {
          caret-color: #f97316;
        }
        
        [contenteditable="true"][data-input-mode="overwrite"]::selection {
          background-color: rgba(249, 115, 22, 0.2);
        }
        
        /* 深色模式样式 */
        .dark-mode [contenteditable="true"] {
          color: #e5e7eb;
        }
        
        .dark-mode [contenteditable="true"]:empty:before {
          color: #6b7280;
        }
        
        .dark-mode [contenteditable="true"][data-input-mode="overwrite"] {
          caret-color: #fb923c;
        }
        
        .dark-mode [contenteditable="true"][data-input-mode="overwrite"]::selection {
          background-color: rgba(251, 146, 60, 0.3);
        }
        
        /* 深色模式滚动条 */
        .dark-mode ::-webkit-scrollbar-track {
          background: #374151;
        }
        
        .dark-mode ::-webkit-scrollbar-thumb {
          background: #6b7280;
        }
        
        .dark-mode ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        /* 自定义滚动条 */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-12 md:pt-16">
        {/* 编辑器容器 */}
        <div 
          ref={editorRef}
          className={`rounded-lg shadow-sm px-4 py-6 md:p-8 min-h-[600px] transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'} mx-auto max-w-full md:max-w-[720px]`}
          style={{
            boxShadow: darkMode ? '0 0 16px rgba(0, 0, 0, 0.5)' : '0 0 16px rgba(0, 0, 0, 0.03)'
          }}
        >
          {/* 块容器 */}
            <div className={`space-y-2.5 md:space-y-3 ${darkMode ? 'dark-mode' : ''}`}>
            {blocks.map((block) => (
              <div 
                key={block.id}
                className="group relative flex items-start"
              >
                {/* 拖拽手柄 */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing">
                  <div className="text-gray-400 hover:text-blue-500 transition-colors duration-200">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h12v2H2z"/>
                    </svg>
                  </div>
                </div>
                
                {/* 块内容 */}
                <div className="flex-1">
                  {renderBlock(block)}
                </div>
              </div>
            ))}
          </div>
          
          {/* 添加新块的提示 */}
            {blocks.length === 0 && (
              <div 
                className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-center py-8 cursor-text`}
                onClick={() => {
                  const newBlock = {
                    id: Date.now().toString(),
                    type: 'paragraph',
                    content: ''
                  };
                  setBlocks([newBlock]);
                  setActiveBlockId(newBlock.id);
                }}
              >
                点击开始输入...
              </div>
            )}
        </div>
        
        {/* 底部工具栏 */}
        <div className={`mt-4 md:mt-6 flex items-center justify-between text-sm transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex items-center space-x-4">
            <span className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-1">
                <path d="M8 2a6 6 0 100 12A6 6 0 008 2zM0 8a8 8 0 1116 0A8 8 0 010 8z"/>
                <path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/>
              </svg>
              添加块
            </span>
            <span className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-1">
                <path d="M2.5 1a1 1 0 00-1 1v1a1 1 0 001 1H3v9a2 2 0 002 2h6a2 2 0 002-2V4h.5a1 1 0 001-1V2a1 1 0 00-1-1H10a1 1 0 00-1-1H7a1 1 0 00-1 1H2.5zm3 4a.5.5 0 01.5.5v7a.5.5 0 01-1 0v-7a.5.5 0 01.5-.5zM8 5a.5.5 0 01.5.5v7a.5.5 0 01-1 0v-7A.5.5 0 018 5zm3 .5v7a.5.5 0 01-1 0v-7a.5.5 0 011 0z"/>
              </svg>
              删除
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 深色模式切换 */}
            <button
              onClick={toggleDarkMode}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors duration-200 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              title="按 Ctrl+D 切换深色模式"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-1">
                {darkMode ? (
                  <path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 0a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 0zm0 13a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 13zm8-5a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zM3 8a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2A.5.5 0 013 8zm10.657-5.657a.5.5 0 010 .707l-1.414 1.415a.5.5 0 11-.707-.708l1.414-1.414a.5.5 0 01.707 0zm-9.193 9.193a.5.5 0 010 .707L3.05 13.657a.5.5 0 01-.707-.707l1.414-1.414a.5.5 0 01.707 0zm9.193 2.121a.5.5 0 01-.707 0l-1.414-1.414a.5.5 0 01.707-.707l1.414 1.414a.5.5 0 010 .707zM4.464 4.465a.5.5 0 01-.707 0L2.343 3.05a.5.5 0 11.707-.707l1.414 1.414a.5.5 0 010 .708z"/>
                ) : (
                  <path d="M6 .278a.768.768 0 011.08.012l2.122 2.12a.768.768 0 01-.06 1.08L8.5 5.5a.768.768 0 01-1.08-.06L5.298 3.318a.768.768 0 010-1.08L6 .278zM8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1111.98 0A6 6 0 012 8z"/>
                )}
              </svg>
              <span className="text-xs">{darkMode ? '浅色' : '深色'}</span>
              <span className="text-xs text-gray-500">(Ctrl+D)</span>
            </button>
            
            {/* 输入模式切换 */}
            <button
              onClick={toggleInputMode}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors duration-200 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              title="按 Insert 键切换模式"
            >
              <span className="text-xs">输入模式:</span>
              <span className={`font-medium ${inputMode === 'insert' ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>
                {inputMode === 'insert' ? '插入' : '覆盖'}
              </span>
              <span className="text-xs text-gray-500">(Insert)</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs">自动保存</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotionStyleEditor;