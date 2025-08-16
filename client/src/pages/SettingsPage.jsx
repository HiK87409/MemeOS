import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiImage, FiSettings } from 'react-icons/fi';
import localConfigManager from '../utils/localConfigManager';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [userPreferences, setUserPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  // 加载用户偏好设置
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = localConfigManager.getUserPreferences();
        setUserPreferences(preferences);
      } catch (error) {
        console.error('加载用户偏好设置失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // 处理设置变化
  const handleSettingChange = async (key, value) => {
    const newPreferences = {
      ...userPreferences,
      [key]: value
    };
    
    setUserPreferences(newPreferences);
    
    try {
      await localConfigManager.setUserPreferences(newPreferences);
      setSaveStatus('保存成功');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('保存设置失败:', error);
      setSaveStatus('保存失败');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // 处理图片展开设置
  const handleImageExpandChange = async (value) => {
    await handleSettingChange('expandImages', value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在加载设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg">


      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 图片设置区域 */}
          <div className="bg-theme-surface rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <FiImage className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-theme-text">图片设置</h2>
            </div>
            
            <div className="space-y-4">
              {/* 图片展开选项 */}
              <div className="flex items-center justify-between py-3 border-b border-theme-border">
                <div>
                  <h3 className="text-sm font-medium text-theme-text">笔记图片是否展开</h3>
                  <p className="text-sm text-theme-text-secondary mt-1">
                    控制笔记中包含的图片是否默认展开显示
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="imageExpand"
                      checked={userPreferences.expandImages !== false}
                      onChange={() => handleImageExpandChange(true)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-theme-text">展开</span>
                  </label>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="imageExpand"
                      checked={userPreferences.expandImages === false}
                      onChange={() => handleImageExpandChange(false)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-theme-text">折叠</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 布局设置区域 */}
          <div className="bg-theme-surface rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <FiSettings className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-theme-text">布局设置</h2>
            </div>
            
            <div className="space-y-4">
              {/* 笔记宽度选项 */}
              <div className="flex items-center justify-between py-3 border-b border-theme-border">
                <div>
                  <h3 className="text-sm font-medium text-theme-text">笔记宽度</h3>
                  <p className="text-sm text-theme-text-secondary mt-1">
                    控制笔记卡片的显示宽度
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <select
                    value={userPreferences.cardWidth || '70%'}
                    onChange={(e) => handleSettingChange('cardWidth', e.target.value)}
                    className="px-3 py-2 border border-theme-border rounded-md bg-theme-bg text-theme-text focus:outline-none focus:ring-0"
                  >
                    <option value="50%">50% - 窄</option>
                    <option value="60%">60% - 较窄</option>
                    <option value="70%">75% - 标准</option>
                    <option value="80%">80% - 较宽</option>
                    <option value="90%">92% - 宽</option>
                    <option value="100%">100% - 全宽</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 其他设置区域（预留） */}
          <div className="bg-theme-surface rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <FiSettings className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-theme-text">其他设置</h2>
            </div>
            
            <div className="text-center py-8">
              <p className="text-theme-text-secondary">
                更多设置选项正在开发中...
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;