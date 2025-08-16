import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SiYuanEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

const SiYuanStyleEditor: React.FC<SiYuanEditorProps> = ({
  content = '',
  onChange,
  placeholder = '开始输入...'
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [focusedBlock, setFocusedBlock] = useState<number | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // 检测系统主题偏好
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);
    
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    
    darkModeQuery.addEventListener('change', handleThemeChange);
    return () => darkModeQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // 处理内容变化
  const handleContentChange = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    onChange?.(newContent);
  }, [onChange]);

  // 处理块聚焦
  const handleBlockFocus = (index: number) => {
    setFocusedBlock(index);
  };

  // 处理块悬停
  const handleBlockHover = (index: number | null) => {
    setHoveredBlock(index);
  };

  // 将内容分割为块
  const contentBlocks = content.split('\n\n').filter(block => block.trim() !== '');

  return (
    <div className={`siyuan-editor-container ${isDarkMode ? 'dark' : ''}`}>
      <style jsx>{`
        :root {
          --bg-primary: #FFFFFF;
          --bg-secondary: #FAFAFA;
          --text-primary: #333333;
          --text-secondary: #666666;
          --accent-color: #60A5FA;
          --hover-bg: rgba(0, 0, 0, 0.02);
          --shadow-1: 0 1px 1px rgba(0, 0, 0, 0.01);
          --shadow-2: 0 4px 8px rgba(0, 0, 0, 0.02);
          --shadow-3: 0 8px 24px rgba(0, 0, 0, 0.015);
          --max-width: 720px;
          --block-spacing: 12px;
          --block-padding: 24px;
          --font-size: 16px;
          --line-height: 1.75;
          --font-weight: 400;
          --transition-duration: 300ms;
        }

        .dark {
          --bg-primary: #1A1A1A;
          --bg-secondary: #2A2A2A;
          --text-primary: #E0E0E0;
          --text-secondary: #B0B0B0;
          --hover-bg: rgba(255, 255, 255, 0.05);
          --shadow-1: 0 1px 1px rgba(0, 0, 0, 0.3);
          --shadow-2: 0 4px 8px rgba(0, 0, 0, 0.4);
          --shadow-3: 0 8px 24px rgba(0, 0, 0, 0.5);
        }

        .siyuan-editor-container {
          background-color: var(--bg-secondary);
          min-height: 100vh;
          font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          transition: all var(--transition-duration) ease;
          padding: 20px 0;
        }

        .siyuan-editor {
          max-width: var(--max-width);
          margin: 0 auto;
          background-color: var(--bg-primary);
          border-radius: 8px;
          box-shadow: var(--shadow-1), var(--shadow-2), var(--shadow-3);
          padding: var(--block-padding);
          transition: all var(--transition-duration) ease;
        }

        .editor-block {
          margin-bottom: var(--block-spacing);
          padding: 8px 0;
          position: relative;
          transition: background-color var(--transition-duration) ease;
          border-radius: 4px;
        }

        .editor-block:last-child {
          margin-bottom: 0;
        }

        .editor-block:hover {
          background-color: var(--hover-bg);
        }

        .editor-block.focused::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: var(--accent-color);
          border-radius: 1px;
          transition: all var(--transition-duration) ease;
        }

        .editor-content {
          font-size: var(--font-size);
          line-height: var(--line-height);
          font-weight: var(--font-weight);
          color: var(--text-primary);
          outline: none;
          min-height: 1.5em;
          word-wrap: break-word;
          transition: color var(--transition-duration) ease;
        }

        .editor-content:empty:before {
          content: attr(data-placeholder);
          color: var(--text-secondary);
          pointer-events: none;
        }

        .editor-content:focus {
          outline: none;
        }

        /* 字体加载 */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400&display=swap');
      `}</style>
      
      <div className="siyuan-editor" ref={editorRef}>
        {contentBlocks.length > 0 ? (
          contentBlocks.map((block, index) => (
            <div 
              key={index}
              className={`editor-block ${focusedBlock === index ? 'focused' : ''}`}
              onMouseEnter={() => handleBlockHover(index)}
              onMouseLeave={() => handleBlockHover(null)}
              onClick={() => handleBlockFocus(index)}
            >
              <div
                className="editor-content"
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentChange}
                data-placeholder={index === 0 ? placeholder : ''}
                onFocus={() => handleBlockFocus(index)}
                onBlur={() => setFocusedBlock(null)}
              >
                {block}
              </div>
            </div>
          ))
        ) : (
          <div 
            className={`editor-block ${focusedBlock === 0 ? 'focused' : ''}`}
            onMouseEnter={() => handleBlockHover(0)}
            onMouseLeave={() => handleBlockHover(null)}
            onClick={() => handleBlockFocus(0)}
          >
            <div
              className="editor-content"
              contentEditable
              suppressContentEditableWarning
              onInput={handleContentChange}
              data-placeholder={placeholder}
              onFocus={() => handleBlockFocus(0)}
              onBlur={() => setFocusedBlock(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SiYuanStyleEditor;