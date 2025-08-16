import React from 'react';
import BlockSuiteEditor from '../components/BlockSuiteEditor';

const BlockSuiteEditorDemo = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            BlockSuite 编辑器演示
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            使用 BlockSuite 构建的现代化块编辑器，支持拖拽排序、命令菜单和自动保存
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              编辑器
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              输入 / 打开命令菜单，拖拽左侧手柄重新排序
            </p>
          </div>
          
          <div className="h-[600px] relative">
            <BlockSuiteEditor />
          </div>
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                块编辑
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              基于 BlockSuite 引擎的现代化块编辑体验
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 dark:text-green-400 text-sm font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                命令菜单
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              输入 / 快速插入标题、待办、分割线等
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                <span className="text-purple-600 dark:text-purple-400 text-sm font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                拖拽排序
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              拖拽左侧手柄重新排列内容块顺序
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mr-3">
                <span className="text-orange-600 dark:text-orange-400 text-sm font-bold">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                自动保存
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              防抖1.5秒自动保存到本地存储
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockSuiteEditorDemo;