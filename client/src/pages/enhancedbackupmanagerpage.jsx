/**
 * 增强备份管理页面
 * 支持数据库备份、增量备份、加密备份、历史记录等功能
 */

import React, { useState, useEffect } from 'react';
import { format, toZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import { enhancedBackupManager } from '../utils/enhancedbackupmanager';
import '../styles/enhancedbackupmanager.css';

const EnhancedBackupManagerPage = () => {
  const [backups, setBackups] = useState([]);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({});
  const [stats, setStats] = useState({});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('backups'); // 'backups', 'snapshots', 'history', 'settings'
  
  // 确认弹窗状态
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });
  

  
  // 备份设置表单状态
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupInterval: 10,
    compressionEnabled: true
  });



  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('开始加载数据');
      
      const [backupsData, settingsData, statsData] = await Promise.all([
        enhancedBackupManager.getAllBackups(),
        enhancedBackupManager.getSettings(),
        enhancedBackupManager.getBackupStats()
      ]);
      
      // 从服务器获取历史记录
      const historyResponse = await fetch('/api/history/all');
      const historyResult = await historyResponse.json();
      const historyData = historyResult.success ? historyResult.history : [];
      
      // 从本地存储获取导入的备份列表
      let importedBackups = [];
      try {
        importedBackups = enhancedBackupManager.getStoredBackups();
        console.log('从本地存储获取到导入的备份:', importedBackups.length, '个');
      } catch (error) {
        console.error('获取导入的备份失败:', error);
      }
      
      // 合并服务器备份和本地导入的备份
      const allBackups = [...backupsData, ...importedBackups];
      
      console.log('数据加载结果:', { backupsData, importedBackups, historyData, settingsData, statsData });
      
      setBackups(allBackups);
      setHistory(historyData);
      setSettings(settingsData);
      setStats(statsData.stats || {});
      

      
      // 确保设置值正确
      const finalSettings = {
        ...settingsData,
        autoBackup: settingsData.autoBackup ?? true, // 默认启用自动备份
        compressionEnabled: settingsData.compressionEnabled ?? true // 默认启用数据压缩
      };
      
      setBackupSettings(finalSettings);
      
      console.log('数据状态更新完成');
    } catch (error) {
      console.error('加载数据失败:', error);
      showMessage('加载数据失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 显示消息
  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // 显示确认弹窗
  const showConfirmDialog = (title, message, onConfirm, onCancel) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      onCancel: onCancel || (() => setConfirmDialog({ ...confirmDialog, isOpen: false }))
    });
  };

  // 关闭确认弹窗
  const closeConfirmDialog = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  // 创建备份
  const handleCreateBackup = async (noteId = null) => {
    try {
      setLoading(true);
      console.log('开始创建备份:', { noteId });
      const result = await enhancedBackupManager.createBackup(noteId, 'manual');
      console.log('备份创建结果:', result);
      
      if (result.success) {
        // 记录创建备份操作到数据库
        await fetch('/api/history/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'backup',
            description: `创建${noteId ? '单笔记' : '完整'}备份`,
            details: {
              backupType: noteId ? 'single' : 'full',
              backupId: result.backupId,
              notesCount: result.notesCount || 0,
              createdAt: new Date().toISOString()
            }
          })
        });
        
        showMessage(`备份成功！备份了 ${result.notesCount} 条笔记`, 'success');
        console.log('备份成功，开始重新加载数据');
        await loadData();
        console.log('数据重新加载完成');
      } else {
        showMessage('备份失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('备份创建异常:', error);
      showMessage('备份失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 恢复备份
  const handleRestoreBackup = async (backupId) => {
    showConfirmDialog(
      '确认恢复备份',
      '确定要恢复此备份吗？当前数据将被覆盖。',
      async () => {
        // 检查是否为导入的备份（导入的备份有isImported字段）
        const backup = backups.find(b => b.id === backupId);
        const isImportedBackup = backup && backup.isImported;
        
        try {
          setLoading(true);
          
          let result;
          if (isImportedBackup) {
            // 对于导入的备份，需要用户重新选择备份文件进行恢复
            showMessage('导入的备份需要重新选择原始备份文件才能恢复。请在弹出的文件选择对话框中选择对应的备份文件（.json或.zip格式）。', 'info');
            
            // 创建文件输入元素
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json,.zip';
            
            // 监听文件选择
            fileInput.onchange = async (event) => {
              const files = Array.from(event.target.files);
              if (files.length === 0) {
                setLoading(false);
                return;
              }
              
              try {
                // 使用importBackups方法恢复笔记
                result = await enhancedBackupManager.importBackups(files);
                
                if (result.success) {
                  // 记录恢复备份操作到数据库
                  await fetch('/api/history/record', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      action: 'restore',
                      description: '恢复导入的备份',
                      details: {
                        backupId: backupId,
                        backupType: 'imported',
                        notesCount: result.importedNotesCount || 0,
                        restoredAt: new Date().toISOString()
                      }
                    })
                  });
                    
                  let successMessage = `恢复成功！恢复了 ${result.importedNotesCount || 0} 条笔记`;
                  if (result.skippedCount > 0) {
                    successMessage += `，跳过了 ${result.skippedCount} 个重复笔记`;
                  }
                  showMessage(successMessage, 'success');
                  await loadData();
                } else {
                  showMessage('恢复失败: ' + result.error, 'error');
                }
              } catch (error) {
                showMessage('恢复失败: ' + error.message, 'error');
              } finally {
                setLoading(false);
              }
            };
            
            // 触发文件选择对话框
            fileInput.click();
            return; // 提前返回，因为文件选择是异步的
          } else {
            // 恢复服务器备份
            result = await enhancedBackupManager.restoreBackup(backupId);
            
            if (result.success) {
              // 记录恢复备份操作到数据库
              await fetch('/api/history/record', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  action: 'restore',
                  description: '恢复备份',
                  details: {
                    backupId: backupId,
                    backupType: 'server',
                    notesCount: result.successCount || 0,
                    restoredAt: new Date().toISOString()
                  }
                })
              });
              
              let successMessage = `恢复成功！恢复了 ${result.successCount || 0} 条笔记`;
              if (result.skippedCount > 0) {
                successMessage += `，跳过了 ${result.skippedCount} 个重复笔记`;
              }
              showMessage(successMessage, 'success');
              await loadData();
            } else {
              showMessage('恢复失败: ' + result.error, 'error');
            }
          }
        } catch (error) {
          showMessage('恢复失败: ' + error.message, 'error');
        } finally {
          if (!isImportedBackup) {
            setLoading(false);
          }
        }
      }
    );
  };

  // 删除备份
  const handleDeleteBackup = async (backupId) => {
    showConfirmDialog(
      '确认删除备份',
      '确定要删除此备份吗？此操作不可撤销。',
      async () => {
        try {
          setLoading(true);
          
          // 检查是否为导入的备份（导入的备份有isImported字段）
          const backup = backups.find(b => b.id === backupId);
          const isImportedBackup = backup && backup.isImported;
          
          let result;
          if (isImportedBackup) {
            // 删除本地存储中的导入备份
            result = await enhancedBackupManager.deleteImportedBackup(backupId);
          } else {
            // 删除服务器备份
            result = await enhancedBackupManager.deleteBackup(backupId);
          }
          
          if (result.success) {
            // 记录删除备份操作到数据库
            await fetch('/api/history/record', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                action: 'delete',
                description: isImportedBackup ? '删除导入的备份' : '删除备份',
                details: {
                  backupId: backupId,
                  backupType: isImportedBackup ? 'imported' : 'server',
                  deletedAt: new Date().toISOString()
                }
              })
            });
            
            showMessage('备份删除成功', 'success');
            await loadData();
          } else {
            showMessage('删除失败: ' + result.error, 'error');
          }
        } catch (error) {
          showMessage('删除失败: ' + error.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // 导出备份
  const handleExportBackup = async (backupId = null) => {
    try {
      setLoading(true);
      
      // 如果指定了backupId，检查是否为导入的备份
      if (backupId) {
        const backup = backups.find(b => b.id === backupId);
        const isImportedBackup = backup && backup.isImported;
        
        if (isImportedBackup) {
          showMessage('导入的备份无法直接导出，请使用原始备份文件', 'warning');
          setLoading(false);
          return;
        }
      }
      
      console.log('开始导出备份:', { backupId });
      const result = await enhancedBackupManager.exportBackup(backupId);
      console.log('导出结果:', result);
      
      if (result.success) {
        // 记录导出备份操作到数据库
        await fetch('/api/history/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: backupId ? 'export_single' : 'export_all',
            description: backupId ? '导出单条笔记备份' : '导出全部笔记备份',
            details: {
              backupId: backupId,
              exportedAt: new Date().toISOString(),
              notesCount: result.notesCount || 0
            }
          })
        });
        
        showMessage('导出成功！格式: JSON', 'success');
      } else {
        showMessage('导出失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('导出异常:', error);
      showMessage('导出失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 导入备份
  const handleImportBackup = async () => {
    try {
      setLoading(true);
      
      // 创建文件输入元素
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,.zip'; // 支持JSON和ZIP文件
      fileInput.multiple = true;
      
      // 监听文件选择
      fileInput.onchange = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) {
          // 用户取消了文件选择或没有选择文件
          setLoading(false);
          console.log('用户取消了文件选择');
          return;
        }
        
        try {
          console.log('开始直接导入并恢复备份文件:', files.map(f => f.name));
          const result = await enhancedBackupManager.importBackups(files);
          console.log('导入恢复结果:', result);
          console.log('[恢复调试] 完整返回对象:', JSON.stringify(result, null, 2));
          console.log('[恢复调试] importedNotesCount:', result.importedNotesCount);
          console.log('[恢复调试] skippedCount:', result.skippedCount);
          console.log('[恢复调试] success:', result.success);
          console.log('[恢复调试] message:', result.message);
          console.log('[恢复调试] details:', result.details);
          
          // 检查details数组的结构
          if (result.details && Array.isArray(result.details)) {
            console.log('[恢复调试] details数组长度:', result.details.length);
            result.details.forEach((detail, index) => {
              console.log(`[恢复调试] detail[${index}]:`, {
                backupId: detail.backupId,
                success: detail.success,
                hasResults: !!detail.results,
                resultsLength: detail.results ? detail.results.length : 0,
                results: detail.results
              });
            });
          }
          
          if (result.success) {
            // 记录导入恢复操作到数据库
            await fetch('/api/history/record', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                action: 'import_and_restore',
                description: '直接导入并恢复备份',
                details: {
                  importedAt: new Date().toISOString(),
                  filesCount: files.length,
                  notesCount: result.importedNotesCount || 0,
                  duplicateNotesCount: result.skippedCount || 0
                }
              })
            });
            
            // 构建成功消息
            let successMessage = `备份导入恢复成功！恢复了 ${result.importedNotesCount || 0} 条笔记`;
            if (result.skippedCount > 0) {
              successMessage += `，跳过了 ${result.skippedCount} 个重复笔记`;
            }
            
            showMessage(successMessage, 'success');
            // 不调用loadData()，因为导入的备份不显示在列表中
          } else {
            showMessage('导入恢复失败: ' + result.error, 'error');
          }
        } catch (error) {
          console.error('导入恢复异常:', error);
          showMessage('导入恢复失败: ' + error.message, 'error');
        } finally {
          setLoading(false);
        }
      };
      
      // 监听取消事件（当用户点击取消按钮时）
      // 注意：浏览器没有直接提供取消事件，所以我们通过检测焦点变化来模拟
      const handleCancel = () => {
        setTimeout(() => {
          // 检查文件输入是否仍然有焦点，如果没有且没有选择文件，则认为用户取消了
          if (document.activeElement !== fileInput && fileInput.files.length === 0) {
            setLoading(false);
            console.log('用户取消了文件选择（通过焦点检测）');
            // 移除事件监听器
            document.removeEventListener('focus', handleCancel, true);
            window.removeEventListener('focus', handleCancel, true);
          }
        }, 100); // 延迟检测以确保状态稳定
      };
      
      // 添加焦点事件监听器
      document.addEventListener('focus', handleCancel, true);
      window.addEventListener('focus', handleCancel, true);
      
      // 显示提示信息：直接导入并恢复
      showMessage('注意：将直接导入并恢复备份文件（支持JSON和ZIP格式），ZIP文件会自动提取，通过哈希对比避免重复，导入后不会出现在备份列表中', 'info');
      
      // 触发文件选择对话框
      fileInput.click();
      
      // 设置超时作为备用方案，确保状态不会一直卡住
      setTimeout(() => {
        if (loading) {
          setLoading(false);
          console.log('导入操作超时，重置状态');
          // 移除事件监听器
          document.removeEventListener('focus', handleCancel, true);
          window.removeEventListener('focus', handleCancel, true);
        }
      }, 30000); // 30秒超时
    } catch (error) {
      console.error('导入备份异常:', error);
      showMessage('导入失败: ' + error.message, 'error');
      setLoading(false);
    }
  };

  // 保存设置
  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      const newSettings = {
        ...settings,
        ...backupSettings
      };
      
      const result = await enhancedBackupManager.saveSettings(newSettings);
      
      if (result) {
        showMessage('设置保存成功', 'success');
        setSettings(newSettings);
        setBackupSettings({
          ...newSettings
        });
        
        // 检查是否启用了自动备份
        if (!settings.autoBackup && newSettings.autoBackup) {
          // 记录启用自动备份操作到数据库
          await fetch('/api/history/record', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'enable_auto_backup',
              description: '启用自动备份功能',
              details: {
                enabledAt: new Date().toISOString(),
                interval: newSettings.backupInterval
              }
            })
          });
        }
      } else {
        showMessage('设置保存失败', 'error');
      }
    } catch (error) {
      showMessage('设置保存失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 检查自动备份
  const handleCheckAutoBackup = async () => {
    try {
      setLoading(true);
      const result = await enhancedBackupManager.checkAutoBackup();
      
      if (result.success) {
        showMessage(result.message, 'success');
        await loadData();
      } else {
        showMessage('自动备份检查失败: ' + result.error, 'error');
      }
    } catch (error) {
      showMessage('自动备份检查失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 重置设置
  const handleResetSettings = async () => {
    try {
      setLoading(true);
      const result = await enhancedBackupManager.resetSettings();
      if (result.success) {
        const defaultSettings = enhancedBackupManager.getDefaultSettings();
        setBackupSettings(defaultSettings);
        
        // 记录重置设置操作到数据库
        await fetch('/api/history/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'reset_settings',
            description: '重置设置',
            details: {
              resetAt: new Date().toISOString()
            }
          })
        });
        
        showMessage(result.message, 'success');
      } else {
        showMessage(result.error, 'error');
      }
    } catch (error) {
      showMessage('重置设置失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // 清除历史记录
  const handleClearHistory = async () => {
    showConfirmDialog(
      '确认清除历史记录',
      '确定要清除所有历史记录吗？此操作不可撤销。',
      async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/history/clear?type=system', {
            method: 'DELETE'
          });
          
          const data = await response.json();
          
          if (data.success) {
            setHistory([]);
            showMessage('历史记录已清除', 'success');
          } else {
            showMessage('清除历史记录失败', 'error');
          }
        } catch (error) {
          console.error('清除历史记录失败:', error);
          showMessage('清除历史记录失败: ' + error.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };



  // 格式化时间
  const formatTime = (timestamp) => {
    try {
      return format(toZonedTime(new Date(timestamp), 'Asia/Shanghai'), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
    } catch (error) {
      return timestamp;
    }
  };

  // 格式化文件大小
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化文件大小（别名函数）
  const formatFileSize = (bytes) => {
    return formatSize(bytes);
  };
  
  // 获取备份中的笔记数量
  const getBackupNotesCount = (backup) => {
    // 优先使用notesCount字段，如果没有则从data.notes中获取
    if (backup.notesCount) return backup.notesCount;
    
    const notes = backup.data?.notes || backup.notes;
    if (!notes) return '未知';
    
    return Array.isArray(notes) ? notes.length : '未知';
  };

  return (
    <div className="backup-manager-page">
      <style>
        {`

        `}
      </style>
      
      {/* 确认弹窗 */}
      {confirmDialog.isOpen && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <div className="confirm-dialog-header">
              <h3>{confirmDialog.title}</h3>
            </div>
            <div className="confirm-dialog-body">
              <p>{confirmDialog.message}</p>
            </div>
            <div className="confirm-dialog-footer">
              <button 
                className="btn btn-secondary"
                onClick={confirmDialog.onCancel}
              >
                取消
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  confirmDialog.onConfirm();
                  closeConfirmDialog();
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="backup-container">
        {/* 消息提示 */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        {/* 统计信息 */}
        <div className="stats-section">
          <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">总备份数:</span>
                <span className="stat-value">{stats.totalBackups || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">历史记录:</span>
                <span className="stat-value">{history.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">当前备份笔记数:</span>
                <span className="stat-value">{stats.totalNotes || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">存储大小:</span>
                <span className="stat-value">{formatSize(stats.storageSize || 0)}</span>
              </div>
            </div>
        </div>
        
        {/* 标签页导航 */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'backups' ? 'active' : ''}`}
            onClick={() => setActiveTab('backups')}
          >
            备份管理
          </button>

          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            历史记录
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            备份设置
          </button>
        </div>
        
        {/* 备份管理标签页 */}
        {activeTab === 'backups' && (
          <div className="tab-content">
            <div className="backup-actions">
            <button 
              className="btn btn-primary"
              onClick={() => handleCreateBackup()}
              disabled={loading}
            >
              {loading ? '创建中...' : '创建完整备份'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleCheckAutoBackup}
              disabled={loading}
            >
              {loading ? '检查中...' : '检查自动备份'}
            </button>

            <button 
              className="btn btn-secondary"
              onClick={handleImportBackup}
              disabled={loading}
            >
              {loading ? '导入中...' : '导入所有备份 (JSON)'}
            </button>

          </div>


            
            <div className="backup-list">
              <h3>备份列表</h3>
              {backups.length === 0 ? (
                <p>暂无备份</p>
              ) : (
                <div className="backup-items">
                  {backups.map((backup) => (
                    <div key={backup.backup_id || backup.id} className="backup-item">
                      <div className="backup-info">
                        <div className="backup-header">
                          <span className="backup-id">{backup.backup_id || backup.id}</span>
                          <span className="backup-type">
                            {backup.isImported ? '导入备份' : (backup.backup_type || backup.type) === 'manual' ? '手动备份' : '自动备份'}
                          </span>
                          <span className="backup-time">
                            {formatTime(backup.created_at || backup.timestamp)}
                          </span>
                        </div>
                        <div className="backup-details">
                          <span className="backup-notes">
                            笔记数: {getBackupNotesCount(backup)}
                          </span>
                          <span className="backup-features">
                            {backup.version && <span className="version">v{backup.version}</span>}
                          </span>
                        </div>
                      </div>
                      <div className="backup-actions">
                        <button 
                          className="btn btn-small btn-success"
                          onClick={() => handleRestoreBackup(backup.backup_id || backup.id)}
                          disabled={loading}
                        >
                          恢复
                        </button>
                        <button 
                          className="btn btn-small btn-secondary"
                          onClick={() => handleExportBackup(backup.backup_id || backup.id)}
                          disabled={loading}
                        >
                          导出备份
                        </button>
                        <button 
                          className="btn btn-small btn-danger"
                          onClick={() => handleDeleteBackup(backup.backup_id || backup.id)}
                          disabled={loading}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 历史记录标签页 */}
        {activeTab === 'history' && (
          <div className="tab-content">
            <div className="history-actions">
              <button 
                className="btn btn-danger"
                onClick={handleClearHistory}
                disabled={loading}
              >
                {loading ? '清除中...' : '清除所有历史记录'}
              </button>
            </div>
            <div className="history-list">
              <h3>操作历史记录</h3>
              {history.length === 0 ? (
                <p>暂无历史记录</p>
              ) : (
                <div className="history-items">
                  {history
                    .filter(record => ['backup', 'restore', 'delete', 'settings', 'reset_settings', 'export_single', 'export_all', 'clear_history', 'enable_auto_backup', 'import_all'].includes(record.action))
                    .map((record) => (
                    <div key={record.id} className="history-item">
                      <div className="history-info">
                        <div className="history-header">
                          <span className="history-action">
                            {record.description || record.action}
                          </span>
                          <span className="history-time">
                            {formatTime(record.timestamp || record.createdAt)}
                          </span>
                        </div>
                        <div className="history-details">
                          <span className="history-notes">
                            {record.notesCount !== undefined ? `涉及笔记: ${record.notesCount}` : (record.action === 'settings' ? '备份设置' : `涉及笔记: ${record.notes?.length || 0}`)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 备份设置标签页 */}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="settings-form">
              <h3>备份设置</h3>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={backupSettings.autoBackup}
                    onChange={(e) => setBackupSettings({
                      ...backupSettings,
                      autoBackup: e.target.checked
                    })}
                  />
                  启用自动备份
                </label>
              </div>
              
              <div className="form-group">
                <label>备份间隔 (分钟):</label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={backupSettings.backupInterval}
                  onChange={(e) => setBackupSettings({
                    ...backupSettings,
                    backupInterval: parseInt(e.target.value)
                  })}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={backupSettings.compressionEnabled}
                    onChange={(e) => setBackupSettings({
                      ...backupSettings,
                      compressionEnabled: e.target.checked
                    })}
                  />
                  启用数据压缩
                </label>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveSettings}
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存设置'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleResetSettings}
                  disabled={loading}
                >
                  {loading ? '重置中...' : '重置为默认'}
                </button>
              </div>
            </div>
          </div>
        )}
        

      </div>
    </div>
  );
};

export default EnhancedBackupManagerPage;