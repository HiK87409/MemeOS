import React, { useState } from 'react';
import { useFontOptimization } from '../hooks/useFontOptimization';
import FontOptimizationUtils from '../utils/fontOptimizationUtils';

const FontOptimizationPage = () => {
  const { 
    deviceType, 
    fontSize, 
    lineHeight, 
    getResponsiveFontStyle, 
    isMobile, 
    isTablet, 
    isDesktop 
  } = useFontOptimization();
  
  const [customFontSize, setCustomFontSize] = useState(16);
  const [customLineHeight, setCustomLineHeight] = useState(1.6);
  
  // 计算响应式样式
  const headingStyle = getResponsiveFontStyle({
    baseSize: 24,
    baseLineHeight: 1.3,
    weight: '600',
  });
  
  const bodyStyle = getResponsiveFontStyle({
    baseSize: 16,
    baseLineHeight: 1.6,
    weight: 'normal',
  });
  
  const customStyle = getResponsiveFontStyle({
    baseSize: customFontSize,
    baseLineHeight: customLineHeight,
    weight: 'normal',
  });
  
  // 获取设备信息
  const getDeviceInfo = () => {
    const screenWidth = window.innerWidth;
    return {
      deviceType,
      screenWidth,
      fontSize,
      lineHeight,
      isMobile: isMobile(),
      isTablet: isTablet(),
      isDesktop: isDesktop(),
    };
  };
  
  const deviceInfo = getDeviceInfo();
  
  // 预设字体大小示例
  const presetExamples = [
    { name: '标题', size: 24, lineHeight: 1.3, weight: '600' },
    { name: '副标题', size: 18, lineHeight: 1.4, weight: '500' },
    { name: '正文', size: 16, lineHeight: 1.6, weight: 'normal' },
    { name: '小字', size: 14, lineHeight: 1.5, weight: 'normal' },
    { name: '注释', size: 12, lineHeight: 1.4, weight: 'normal' },
  ];
  
  // 应用场景示例
  const useCases = [
    {
      title: '文章内容',
      description: '长篇文章需要良好的可读性，适当的字体大小和行高能够减少阅读疲劳。',
      className: 'responsive-body-text text-readable',
    },
    {
      title: '导航菜单',
      description: '导航菜单需要清晰易读，在不同设备上保持良好的可点击性。',
      className: 'responsive-nav',
    },
    {
      title: '按钮文本',
      description: '按钮文本需要醒目且易于点击，在移动设备上需要更大的点击区域。',
      className: 'responsive-button',
    },
    {
      title: '卡片内容',
      description: '卡片内容需要在有限空间内展示信息，同时保持良好的可读性。',
      className: 'responsive-card-content',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            跨设备字体大小优化方案
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            基于设备类型和屏幕尺寸的智能字体大小适配策略，确保在各种设备上都能提供最佳的阅读体验。
          </p>
        </div>
        
        {/* 设备信息面板 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            当前设备信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">设备类型</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {deviceType === 'mobile-small' && '小屏手机'}
                {deviceType === 'mobile' && '手机'}
                {deviceType === 'tablet' && '平板'}
                {deviceType === 'desktop' && '桌面'}
                {deviceType === 'large-desktop' && '大屏桌面'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">屏幕宽度</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {deviceInfo.screenWidth}px
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">基础字体大小</h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {fontSize}px
              </p>
            </div>
          </div>
        </div>

        {/* 响应式字体示例 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            响应式字体示例
          </h2>
          
          <div className="space-y-6">
            {presetExamples.map((example, index) => {
              const style = getResponsiveFontStyle({
                baseSize: example.size,
                baseLineHeight: example.lineHeight,
                weight: example.weight,
              });
              
              return (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300">
                      {example.name}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      桌面: {example.size}px → 当前: {style.fontSize.replace('px', '')}px
                    </span>
                  </div>
                  <p 
                    className="text-gray-600 dark:text-gray-300"
                    style={style}
                  >
                    这是{example.name}的示例文本，展示了在不同设备上的字体大小和行高适配效果。
                    当前字体大小为 {style.fontSize}，行高为 {style.lineHeight}。
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 自定义字体测试 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            自定义字体测试
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                基础字体大小 (px)
              </label>
              <input
                type="range"
                min="10"
                max="32"
                value={customFontSize}
                onChange={(e) => setCustomFontSize(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span>10px</span>
                <span className="font-medium">{customFontSize}px</span>
                <span>32px</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                基础行高
              </label>
              <input
                type="range"
                min="1.2"
                max="2.0"
                step="0.1"
                value={customLineHeight}
                onChange={(e) => setCustomLineHeight(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span>1.2</span>
                <span className="font-medium">{customLineHeight}</span>
                <span>2.0</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              自定义字体效果预览
            </h3>
            <p 
              className="text-gray-600 dark:text-gray-300"
              style={customStyle}
            >
              这是自定义字体的示例文本。您可以通过上方的滑块调整基础字体大小和行高，
              系统会根据当前设备类型自动计算适配的字体大小和行高。
              当前字体大小为 {customStyle.fontSize}，行高为 {customStyle.lineHeight}。
            </p>
          </div>
        </div>
        
        {/* 应用场景示例 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            应用场景示例
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {useCase.title}
                </h3>
                <p className={useCase.className + ' text-gray-600 dark:text-gray-300 mb-3'}>
                  {useCase.description}
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  使用的CSS类: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {useCase.className}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 使用说明 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            使用说明
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">1. CSS类使用</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <code className="text-sm text-gray-600 dark:text-gray-300">
                  {`<div class="text-responsive-base leading-responsive">
  响应式文本内容
</div>`}
                </code>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">2. React钩子使用</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <code className="text-sm text-gray-600 dark:text-gray-300">
                  {`import { useFontOptimization } from '../hooks/useFontOptimization';

const MyComponent = () => {
  const { getResponsiveFontStyle } = useFontOptimization();
  
  const style = getResponsiveFontStyle({
    baseSize: 16,
    baseLineHeight: 1.6,
    weight: 'normal',
  });
  
  return <div style={style}>响应式文本</div>;
};`}
                </code>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">3. 工具类使用</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <code className="text-sm text-gray-600 dark:text-gray-300">
                  {`import FontOptimizationUtils from '../utils/fontOptimizationUtils';

// 计算响应式字体大小
const fontSize = FontOptimizationUtils.calculateFontSize(16, 'mobile');

// 生成响应式样式
const style = FontOptimizationUtils.generateResponsiveFontStyle({
  baseSize: 16,
  baseLineHeight: 1.6,
});`}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FontOptimizationPage;