import React, { useState, useEffect } from 'react';
import { FiSave, FiRotateCcw, FiX, FiClock, FiDownload, FiUpload, FiTrash2, FiCheck } from 'react-icons/fi';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import EnhancedBackupManager from '../utils/enhancedbackupmanager';

const BackupManager = ({ isOpen, onClose, currentNote, onRestore }) => {
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupInterval, setBackupInterval] = useState(5); // 分钟
  const [backupManager] = useState(() => new EnhancedBackupManager());

  // 从EnhancedBackupManager加载备份数据
  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  // 加载备份数据
  const loadBackups = async () => {
    try {
      const allBackups = await backupManager.getAllBackups();
      // 如果当前有选中的笔记，只显示该笔记的备份
      if (currentNote) {
        const noteBackups = allBackups.filter(backup => 
          backup.notes && backup.notes.some(note => note.id === currentNote.id)
        );
        setBackups(noteBackups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } else {
        setBackups(allBackups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (error) {
      console.error('加载备份失败:', error);
      setBackups([]);
    }
  };

  // 初始化备份设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await backupManager.getSettings();
        setAutoBackupEnabled(settings.autoBackup !== false);
        setBackupInterval(settings.backupInterval || 5);
      } catch (error) {
        console.error('加载备份设置失败:', error);
      }
    };
    
    loadSettings();
  }, []);

  // 自动备份逻辑
  useEffect(() => {
    let interval;
    if (autoBackupEnabled && backupInterval > 0) {
      interval = setInterval(async () => {
        if (currentNote) {
          try {
            const result = await backupManager.createBackup(currentNote.id, 'auto');
            if (result.success) {
              // 重新加载备份列表
              await loadBackups();
            } else {
              console.error('自动备份失败:', result.error);
            }
          } catch (error) {
            console.error('自动备份失败:', error);
          }
        }
      }, backupInterval * 60 * 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoBackupEnabled, backupInterval, currentNote]);

  // 保存备份设置
  const saveBackupSettings = async () => {
    try {
      const settings = {
        autoBackup: autoBackupEnabled,
        backupInterval: backupInterval
      };
      await backupManager.saveSettings(settings);
    } catch (error) {
      console.error('保存备份设置失败:', error);
    }
  };

  // 创建手动备份
  const createManualBackup = async () => {
    if (!currentNote) return;

    try {
      const result = await backupManager.createBackup(currentNote.id, 'manual');
      if (result.success) {
        // 重新加载备份列表
        await loadBackups();
      } else {
        console.error('创建备份失败:', result.error);
      }
    } catch (error) {
      console.error('创建备份失败:', error);
    }
  };

  // 创建自动备份
  const createAutoBackup = async (note) => {
    try {
      // 检查自动备份设置
      const settings = await backupManager.getSettings();
      if (!settings.autoBackup) {
        return;
      }

      // 获取当前笔记的所有备份
      const allBackups = await backupManager.getAllBackups();
      const noteBackups = allBackups.filter(b => b.noteId === note.id);
      
      // 检查是否需要创建新备份（内容有变化）
      const lastBackup = noteBackups[0];
      const hasContentChanged = !lastBackup || 
        !lastBackup.notes || 
        !lastBackup.notes[0] || 
        lastBackup.notes[0].content !== note.content;

      if (hasContentChanged) {
        // 创建新备份
        const result = await backupManager.createBackup({
          noteId: note.id,
          type: 'auto',
          description: '自动备份'
        });

        if (result.success) {
          // 检查自动备份数量限制
          const autoBackups = noteBackups.filter(b => b.type === 'auto');
          if (autoBackups.length > 30) {
            // 删除最旧的自动备份
            const sortedAutoBackups = autoBackups.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const toDelete = sortedAutoBackups.slice(0, autoBackups.length - 30);
            
            for (const backupToDelete of toDelete) {
              await backupManager.deleteBackup(backupToDelete.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('创建自动备份失败:', error);
    }
  };

  // 恢复到指定备份
  const restoreToBackup = async (backup) => {
    try {
      const result = await backupManager.restoreBackup(backup.id);
      if (result.success) {
        if (onRestore) {
          // 从恢复的备份数据中获取当前笔记的数据
          const restoredNote = backup.notes.find(note => note.id === currentNote.id);
          if (restoredNote) {
            onRestore({
              ...currentNote,
              content: restoredNote.content,
              tags: restoredNote.tags,
              created_at: restoredNote.created_at
            });
          }
        }
        setShowConfirmDialog(false);
        setSelectedBackup(null);
        onClose();
      } else {
        console.error('恢复备份失败:', result.error);
      }
    } catch (error) {
      console.error('恢复备份失败:', error);
    }
  };

  // 删除备份
  const deleteBackup = async (backupId) => {
    try {
      const result = await backupManager.deleteBackup(backupId);
      if (result.success) {
        // 重新加载备份列表
        await loadBackups();
      } else {
        console.error('删除备份失败:', result.error);
      }
    } catch (error) {
      console.error('删除备份失败:', error);
    }
  };

  // 导出备份
  const exportBackups = async () => {
    try {
      const result = await backupManager.exportAllBackups();
      if (result.success) {
        const dataBlob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `灰灰笔记-backups-${format(toZonedTime(new Date(), 'Asia/Shanghai'), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        console.error('导出备份失败:', result.error);
      }
    } catch (error) {
      console.error('导出备份失败:', error);
    }
  };

  // 导出Markdown格式
  const exportMarkdown = async () => {
    try {
      const backups = await backupManager.getAllBackups();
      let markdownContent = '# 灰灰笔记备份\n\n';
      markdownContent += `导出时间: ${format(toZonedTime(new Date(), 'Asia/Shanghai'), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}\n\n`;
      markdownContent += '---\n\n';

      // 按笔记ID分组
      const backupsByNote = {};
      backups.forEach(backup => {
        if (!backupsByNote[backup.noteId]) {
          backupsByNote[backup.noteId] = [];
        }
        backupsByNote[backup.noteId].push(backup);
      });

      Object.keys(backupsByNote).forEach(noteId => {
        const noteBackups = backupsByNote[noteId];
        if (noteBackups.length > 0) {
          markdownContent += `## 笔记 ID: ${noteId}\n\n`;
          
          noteBackups.forEach((backup, index) => {
            const backupDate = format(toZonedTime(new Date(backup.timestamp), 'Asia/Shanghai'), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
            markdownContent += `### 备份 ${index + 1} - ${backup.type === 'manual' ? '手动' : '自动'}备份\n\n`;
            markdownContent += `**备份时间:** ${backupDate}\n\n`;
            
            // 获取笔记内容
            if (backup.notes && backup.notes.length > 0) {
              const note = backup.notes[0];
              markdownContent += `**创建时间:** ${format(toZonedTime(new Date(note.created_at), 'Asia/Shanghai'), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}\n\n`;
              
              if (note.tags && note.tags.length > 0) {
                const tagNames = note.tags.map(tag => typeof tag === 'string' ? tag : tag.name).join(', ');
                markdownContent += `**标签:** ${tagNames}\n\n`;
              }
              
              markdownContent += '### 内容\n\n';
              markdownContent += `${note.content}\n\n`;
            }
            markdownContent += '---\n\n';
          });
        }
      });

      const dataBlob = new Blob([markdownContent], { type: 'text/markdown' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `灰灰笔记-backups-${format(toZonedTime(new Date(), 'Asia/Shanghai'), 'yyyy-MM-dd')}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出Markdown失败:', error);
    }
  };

  // 导入备份
  const importBackups = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // 直接传递File对象给backupManager.importBackups方法
      const result = await backupManager.importBackups(file);
      if (result.success) {
        // 重新加载备份列表
        await loadBackups();
        showMessage('导入成功', 'success');
      } else {
        console.error('导入备份失败:', result.error);
        showMessage('导入失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('导入备份失败:', error);
      showMessage('导入失败: ' + error.message, 'error');
    }
    
    // 清空文件输入
    event.target.value = '';
  };

  // 格式化内容预览
  const formatContentPreview = (content) => {
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
  };

  // 获取标签名称
  const getTagName = (tag) => {
    return typeof tag === 'string' ? tag : tag.name;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-theme-surface rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <FiSave className="h-5 w-5 text-theme-text-muted" />
          </div>
          <button
            onClick={onClose}
            className="text-theme-text-muted hover:text-theme-text"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            {/* 手动备份按钮 */}
            <button
              onClick={createManualBackup}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <FiSave className="h-4 w-4" />
              <span>创建备份</span>
            </button>

            {/* 导入导出按钮 */}
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer">
                <FiUpload className="h-4 w-4" />
                <span>导入</span>
                <input
                  type="file"
                  accept=".json,.zip"
                  onChange={importBackups}
                  className="hidden"
                />
              </label>
              <button
                onClick={exportBackups}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                <FiDownload className="h-4 w-4" />
                <span>导出JSON</span>
              </button>
              <button
                onClick={exportMarkdown}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                <FiDownload className="h-4 w-4" />
                <span>导出MD</span>
              </button>
            </div>
          </div>

          {/* 自动备份设置 */}
          <div className="flex items-center space-x-4 text-sm">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={(e) => {
                  setAutoBackupEnabled(e.target.checked);
                  saveBackupSettings();
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-theme-text">启用自动备份</span>
            </label>
            
            {autoBackupEnabled && (
              <div className="flex items-center space-x-2">
                <span className="text-theme-text">间隔:</span>
                <select
                  value={backupInterval}
                  onChange={(e) => {
                    setBackupInterval(parseInt(e.target.value));
                    saveBackupSettings();
                  }}
                  className="px-2 py-1 border border-theme-border rounded bg-theme-surface text-theme-text"
                >
                  <option value={1}>1分钟</option>
                  <option value={5}>5分钟</option>
                  <option value={10}>10分钟</option>
                  <option value={30}>30分钟</option>
                  <option value={60}>1小时</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 备份列表 */}
        <div className="flex-1 overflow-y-auto p-4 smooth-scroll-container scrollbar-smooth hide-scrollbar scrollbar-hide">
          {backups.length === 0 ? (
            <div className="text-center py-12">
              <FiClock className="h-12 w-12 text-theme-text-muted mx-auto mb-4" />
              <p className="text-theme-text-secondary">暂无备份记录</p>
              <p className="text-sm text-theme-text-muted mt-2">
                点击"创建备份"来保存当前版本
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup, index) => (
                <div
                  key={backup.id}
                  className="rounded-lg p-4 hover:bg-theme-hover transition-colors"
                >
                  <div className="flex items-start justify-between">
                    {/* 备份信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          backup.type === 'manual' 
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                            : 'bg-theme-elevated text-gray-800 dark:text-gray-300'
                        }`}>
                          {backup.type === 'manual' ? '手动' : '自动'}
                        </span>
                        <span className="text-sm text-theme-text-muted">
                          {format(toZonedTime(new Date(backup.timestamp), 'Asia/Shanghai'), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full text-xs">
                            最新
                          </span>
                        )}
                      </div>
                      
                      <p className="text-theme-text mb-2">
                        {formatContentPreview(backup.content)}
                      </p>
                      
                      {/* 标签 */}
                      {backup.tags && backup.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {backup.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="px-2 py-1 bg-theme-hover text-theme-text-secondary rounded-full text-xs"
                            >
                              #{getTagName(tag)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowConfirmDialog(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                        title="恢复到此版本"
                      >
                        <FiRotateCcw className="h-4 w-4" />
                      </button>
                      {backup.type === 'manual' && (
                        <button
                          onClick={() => deleteBackup(backup.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                          title="删除备份"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 确认对话框 */}
        {showConfirmDialog && selectedBackup && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-theme-surface rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <FiRotateCcw className="h-6 w-6 text-theme-primary" />
                <h3 className="text-lg font-semibold text-theme-text">
                  确认恢复
                </h3>
              </div>
              
              <p className="text-theme-text-secondary mb-6">
                确定要恢复到此备份版本吗？当前的修改将会丢失。
              </p>
              
              <div className="bg-theme-hover rounded-lg p-3 mb-4">
                <p className="text-sm text-theme-text-muted mb-1">
                  备份时间: {format(toZonedTime(new Date(selectedBackup.timestamp), 'Asia/Shanghai'), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}
                </p>
                <p className="text-sm text-theme-text">
                  {formatContentPreview(selectedBackup.content)}
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setSelectedBackup(null);
                  }}
                  className="px-4 py-2 text-theme-text-secondary hover:bg-theme-hover rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={() => restoreToBackup(selectedBackup)}
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-lg"
                >
                  确认恢复
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManager;