import React, { useState, useRef, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { debounce } from 'lodash';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableBlock from './SortableBlock';

// Zustand状态管理
const useEditorStore = create((set) => ({
  content: '',
  blocks: [],
  setContent: (content) => set({ content }),
  setBlocks: (blocks) => set({ blocks: Array.isArray(blocks) ? blocks : [] }),
  loadFromStorage: () => {
    const saved = localStorage.getItem('blocksuite-content');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // 确保 blocks 是数组
        if (data && data.blocks && !Array.isArray(data.blocks)) {
          data.blocks = [];
        }
        return data;
      } catch (e) {
        return null;
      }
    }
    return null;
  },
  saveToStorage: (data) => {
    localStorage.setItem('blocksuite-content', JSON.stringify(data));
  }
}));

// 命令菜单选项
const COMMAND_OPTIONS = [
  { id: 'heading1', label: '标题1', type: 'h1' },
  { id: 'todo', label: '待办列表', type: 'todo' },
  { id: 'divider', label: '分割线', type: 'divider' },
  { id: 'image', label: '图片', type: 'image' }
];

const BlockSuiteEditor = () => {
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandPosition, setCommandPosition] = useState({ x: 0, y: 0 });
  const [currentBlockId, setCurrentBlockId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState(null);
  
  const containerRef = useRef(null);
  const { content, blocks, setContent, setBlocks, loadFromStorage, saveToStorage } = useEditorStore();

  // 初始化编辑器
  useEffect(() => {
    const savedData = loadFromStorage();
    if (savedData && savedData.blocks && Array.isArray(savedData.blocks)) {
      setBlocks(savedData.blocks);
    } else {
      // 创建默认块
      setBlocks([
        { id: 'block-1', type: 'text', content: '欢迎使用 BlockSuite 编辑器' },
        { id: 'block-2', type: 'text', content: '输入 / 打开命令菜单' }
      ]);
    }
  }, [loadFromStorage, setBlocks]);

  // 自动保存（防抖1.5秒）
  useEffect(() => {
    const saveContent = debounce(() => {
      saveToStorage({ blocks });
    }, 1500);

    saveContent();
    return () => {
      saveContent.cancel();
    };
  }, [blocks, saveToStorage]);

  // 键盘事件处理 - /命令菜单
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        
        // 获取光标位置
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          setCommandPosition({
            x: rect.left,
            y: rect.bottom + window.scrollY
          });
          
          setShowCommandMenu(true);
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 处理块内容变化
  const handleBlockChange = useCallback((blockId, newContent) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId ? { ...block, content: newContent } : block
      )
    );
  }, [setBlocks]);

  // 处理命令选择
  const handleCommandSelect = useCallback((command) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type: command.type,
      content: getBlockContent(command.type)
    };
    
    setBlocks(prevBlocks => [...prevBlocks, newBlock]);
    setShowCommandMenu(false);
  }, [setBlocks]);

  // 拖拽传感器设置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖拽结束处理
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && Array.isArray(blocks)) {
      const oldIndex = blocks.findIndex(block => block.id === active.id);
      const newIndex = blocks.findIndex(block => block.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setBlocks(arrayMove(blocks, oldIndex, newIndex));
      }
    }
    
    setActiveId(null);
  }, [blocks, setBlocks]);

  // 过滤命令选项
  const filteredCommands = COMMAND_OPTIONS.filter(command =>
    command.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 获取块内容
  const getBlockContent = (type) => {
    switch (type) {
      case 'h1':
        return '# 标题';
      case 'todo':
        return '- [ ] 待办事项';
      case 'divider':
        return '---';
      case 'image':
        return '![图片](url)';
      default:
        return '新块';
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="block-suite-editor relative w-full h-full bg-white dark:bg-gray-900">
        {/* 编辑器容器 */}
        <div 
          ref={containerRef}
          className="w-full h-full min-h-[500px] p-4 focus:outline-none"
        >
          <SortableContext items={Array.isArray(blocks) ? blocks.map(b => b.id) : []} strategy={verticalListSortingStrategy}>
            {Array.isArray(blocks) ? blocks.map((block) => (
              <SortableBlock
                key={block.id}
                id={block.id}
                content={block.content}
                type={block.type}
                onChange={handleBlockChange}
              />
            )) : null}
          </SortableContext>
        </div>

        {/* 命令菜单 */}
        {showCommandMenu && (
          <div 
            className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
            style={{
              left: commandPosition.x,
              top: commandPosition.y,
              minWidth: '200px'
            }}
          >
            <div className="p-2">
              <input
                type="text"
                placeholder="搜索命令..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {filteredCommands.map((command) => (
                <button
                  key={command.id}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                  onClick={() => handleCommandSelect(command)}
                >
                  {command.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 点击外部关闭命令菜单 */}
        {showCommandMenu && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowCommandMenu(false)}
          />
        )}
      </div>
    </DndContext>
  );
};

export default BlockSuiteEditor;