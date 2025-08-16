import React, { useState, useEffect } from 'react';
import { FiEdit3, FiBold, FiItalic, FiUnderline, FiCode, FiAlignLeft, FiAlignCenter, FiAlignRight, FiList, FiHash, FiCheckSquare } from 'react-icons/fi';
import { useTheme } from '../hooks/useTheme';

const EditToolbar = ({ onFormatSelect, onClose, isOpen, triggerRef, textareaRef, cardSettings }) => {
  const [selectedTool, setSelectedTool] = useState(null);
  
  // 使用主题hook
  const { darkMode: isDarkMode } = useTheme();

  // 当工具栏关闭时重置选中状态
  useEffect(() => {
    if (!isOpen) {
      setSelectedTool(null);
    }
  }, [isOpen]);

  // 智能获取背景色和文本颜色
  const getSmartColors = () => {
    
    if (cardSettings?.backgroundColor) {
      // 如果有自定义背景色，使用自定义颜色
      return {
        backgroundColor: cardSettings.backgroundColor,
        textColor: cardSettings.textColor || (isDarkMode ? '#ffffff' : '#000000'),
        buttonBg: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        buttonHoverBg: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        selectedBg: isDarkMode ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.7)',
        borderColor: cardSettings.borderColor || (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)')
      };
    } else {
      // 使用主题默认颜色
      return {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        textColor: isDarkMode ? '#ffffff' : '#000000',
        buttonBg: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        buttonHoverBg: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        selectedBg: isDarkMode ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.7)',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
      };
    }
  };
  
  // 使用主题颜色值
  const colors = {
    borderColor: 'var(--theme-border)',
    buttonBg: 'var(--theme-hover)',
    buttonHoverBg: 'var(--theme-hover)',
    selectedBg: 'var(--theme-primary)',
    textColor: 'var(--theme-text)'
  };

  const formatOptions = [
    { icon: FiBold, name: '粗体', format: '**', title: '粗体' },
    { icon: FiItalic, name: '斜体', format: '_', title: '斜体' },
    { icon: FiCheckSquare, name: '任务', format: '- [ ] ', title: '任务列表', isTaskList: true },
    { icon: FiUnderline, name: '下划线', format: '<u>', endFormat: '</u>', title: '下划线' },
    { icon: FiCode, name: '代码', format: '`', title: '行内代码' },
    { icon: FiHash, name: '一级标题', format: '# ', title: '一级标题', isHeader: true, level: 1 },
    { icon: FiHash, name: '二级标题', format: '## ', title: '二级标题', isHeader: true, level: 2 },
    { icon: FiHash, name: '三级标题', format: '### ', title: '三级标题', isHeader: true, level: 3 },
    { icon: FiList, name: '列表', format: '- ', title: '无序列表' },
    { icon: FiAlignLeft, name: '引用', format: '> ', title: '引用' }
  ];

  const handleFormatClick = (tool) => {
    // 设置选中状态，但不立即重置
    setSelectedTool(tool.name);
    
    if (textareaRef && textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      

      
      let newText;
      let newCursorPos;
      
      // 特殊处理标题
      if (tool.isHeader) {
        const content = textarea.value;
        const lineStart = content.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = content.indexOf('\n', start);
        const currentLine = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
        
        // 检查当前行是否已经是标题
        const headerMatch = currentLine.match(/^(#{1,6})\s*/);
        let newHeaderLevel = tool.level;
        
        if (headerMatch) {
          // 如果已经是标题，循环增加级别
          const currentLevel = headerMatch[1].length;
          if (currentLevel < 6) {
            newHeaderLevel = currentLevel + 1;
          } else {
            // 如果已经是6级标题，循环回到1级
            newHeaderLevel = 1;
          }
        }
        
        // 生成新的标题格式
        const newHeaderFormat = '#'.repeat(newHeaderLevel) + ' ';
        let lineContent = currentLine;
        
        // 移除现有的标题格式
        if (headerMatch) {
          lineContent = currentLine.substring(headerMatch[0].length);
        }
        
        // 添加新的标题格式
        newText = newHeaderFormat + lineContent;
        newCursorPos = start - (currentLine.length - newText.length);
        
        // 更新整个内容
        const beforeLine = content.substring(0, lineStart);
        const afterLine = lineEnd === -1 ? '' : content.substring(lineEnd);
        const fullText = beforeLine + newText + afterLine;
        
        onFormatSelect(fullText, newCursorPos);
        
        // 立即重置选中状态
        setSelectedTool(null);
        return;
      }
      
      // 特殊处理任务列表
      if (tool.isTaskList) {
        const taskTemplate = '- [ ] 任务1\n- [ ] 任务2';
        
        if (selectedText) {
          // 如果有选中文本，将选中文本替换为任务模板
          newText = taskTemplate;
          newCursorPos = start + taskTemplate.length;
        } else {
          // 如果没有选中文本，在当前位置插入任务模板
          newText = taskTemplate;
          newCursorPos = start + taskTemplate.length;
        }
        
        // 更新文本
        const beforeText = textarea.value.substring(0, start);
        const afterText = textarea.value.substring(end);
        const fullText = beforeText + newText + afterText;
        
        // 触发格式选择回调
        onFormatSelect(fullText, newCursorPos);
        
        // 立即重置选中状态
        setSelectedTool(null);
        return;
      }
      
      if (tool.endFormat) {
        // 有结束格式的情况（如下划线）
        newText = tool.format + selectedText + tool.endFormat;
        newCursorPos = start + tool.format.length + selectedText.length + tool.endFormat.length;
      } else if (tool.format.includes('-') || tool.format.includes('>')) {
        // 行级格式（标题、列表、引用）
        if (selectedText) {
          // 有选中文本时，处理每一行
          const lines = selectedText.split('\n');
          const formattedLines = lines.map(line => {
            if (line.trim() === '') return line;
            return tool.format + line;
          });
          newText = formattedLines.join('\n');
          newCursorPos = start + newText.length;
        } else {
          // 没有选中文本时，在当前行开头添加格式
          const content = textarea.value;
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = content.indexOf('\n', start);
          const currentLine = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
          
          // 如果当前行已经有相同格式，则移除；否则添加
          if (currentLine.startsWith(tool.format)) {
            newText = currentLine.substring(tool.format.length);
            newCursorPos = start - tool.format.length;
          } else {
            newText = tool.format + currentLine;
            newCursorPos = start + tool.format.length;
          }
          
          // 更新整个内容
          const beforeLine = content.substring(0, lineStart);
          const afterLine = lineEnd === -1 ? '' : content.substring(lineEnd);
          const fullText = beforeLine + newText + afterLine;
          
          onFormatSelect(fullText, newCursorPos);
          
          // 立即重置选中状态
          setSelectedTool(null);
          return;
        }
      } else {
        // 包围格式（粗体、斜体、代码）
        if (selectedText) {
          // 有选中文本时，包围选中文本
          newText = tool.format + selectedText + tool.format;
          newCursorPos = start + tool.format.length + selectedText.length + tool.format.length;
        } else {
          // 没有选中文本时，插入格式标记并将光标放在中间
          newText = tool.format + tool.format;
          newCursorPos = start + tool.format.length;
        }
      }
      
      // 更新文本
      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);
      const fullText = beforeText + newText + afterText;
      
      // 触发格式选择回调
      onFormatSelect(fullText, newCursorPos);
    }
    
    // 立即重置选中状态
    setSelectedTool(null);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="mt-3 pt-3 border-t"
      style={{
        borderColor: colors.borderColor,
        backgroundColor: 'var(--theme-surface)'
      }}
    >
      {/* 横向显示格式工具 */}
      <div className="flex flex-wrap gap-2">
        {formatOptions.map((tool, index) => {
          const IconComponent = tool.icon;
          const isSelected = selectedTool === tool.name;
          
          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFormatClick(tool);
              }}
              title={tool.title}
              className="flex items-center justify-center w-9 h-9 rounded transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: isSelected 
                  ? colors.selectedBg
                  : colors.buttonBg,
                color: isSelected 
                  ? 'white' 
                  : colors.textColor,
                borderRadius: cardSettings?.borderRadius || '0.5rem',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isSelected ? 'transparent' : colors.borderColor,
                boxShadow: isSelected 
                  ? '0 2px 8px rgba(59, 130, 246, 0.3)' 
                  : '0 1px 3px rgba(0, 0, 0, 0.1)',
                opacity: isSelected ? 1 : 0.8
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.target.style.backgroundColor = colors.buttonHoverBg;
                  e.target.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.target.style.backgroundColor = colors.buttonBg;
                  e.target.style.opacity = '0.8';
                }
              }}
            >
              {tool.isHeader ? (
                <div className="flex items-center justify-center">
                  <IconComponent className="w-3 h-3" />
                  <span className="text-xs ml-0.5 font-bold">{tool.level}</span>
                </div>
              ) : (
                <IconComponent className="w-4 h-4" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EditToolbar;