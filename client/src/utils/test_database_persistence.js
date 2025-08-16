// 数据库持久化功能测试脚本
import localConfigManager from './localConfigManager.js';
import { waitForInit } from './localConfigManager.js';

async function testDatabasePersistence() {
  console.log('=== 数据库持久化功能测试 ===');
  
  try {
    // 1. 等待初始化完成
    console.log('1. 等待配置管理器初始化...');
    await waitForInit();
    console.log('✅ 初始化完成');
    
    // 2. 检查在线状态
    console.log('\n2. 检查在线状态...');
    const isOnline = localConfigManager.isOnlineMode();
    console.log(`在线状态: ${isOnline ? '在线' : '离线'}`);
    
    // 3. 测试添加标签
    console.log('\n3. 测试添加标签...');
    const testTag = {
      id: 'test_db_tag_' + Date.now(),
      name: '数据库测试标签',
      isPinned: false,
      isParent: false
    };
    
    const addedTag = await localConfigManager.addTag(testTag);
    console.log('✅ 标签添加成功:', addedTag);
    
    // 4. 测试设置标签颜色
    console.log('\n4. 测试设置标签颜色...');
    await localConfigManager.setTagColor(testTag.name, '#FF6B6B');
    console.log('✅ 标签颜色设置成功');
    
    // 5. 测试用户偏好设置
    console.log('\n5. 测试用户偏好设置...');
    await localConfigManager.setUserPreferences({
      theme: 'dark',
      expandAllTags: true,
      testPreference: 'database_test'
    });
    console.log('✅ 用户偏好设置成功');
    
    // 6. 测试手动同步
    console.log('\n6. 测试手动同步...');
    try {
      await localConfigManager.forceSync();
      console.log('✅ 手动同步成功');
    } catch (error) {
      console.log('⚠️ 手动同步失败 (可能是网络问题):', error.message);
    }
    
    // 7. 测试重新加载
    console.log('\n7. 测试重新从数据库加载...');
    try {
      await localConfigManager.reloadFromDatabase();
      console.log('✅ 重新加载成功');
    } catch (error) {
      console.log('⚠️ 重新加载失败 (可能是网络问题):', error.message);
    }
    
    // 8. 验证数据持久化
    console.log('\n8. 验证数据持久化...');
    const tags = localConfigManager.getTags();
    const tagColors = localConfigManager.getTagColors();
    const preferences = localConfigManager.getUserPreferences();
    
    const tagExists = tags.some(tag => tag.id === testTag.id);
    const colorExists = tagColors[testTag.name] === '#FF6B6B';
    const preferenceExists = preferences.testPreference === 'database_test';
    
    console.log('标签存在:', tagExists ? '✅' : '❌');
    console.log('颜色存在:', colorExists ? '✅' : '❌');
    console.log('偏好存在:', preferenceExists ? '✅' : '❌');
    
    // 9. 测试更新标签
    console.log('\n9. 测试更新标签...');
    const updatedTag = await localConfigManager.updateTag(testTag.id, { 
      name: '数据库测试标签(已更新)' 
    });
    console.log('✅ 标签更新成功:', updatedTag);
    
    // 10. 测试删除标签
    console.log('\n10. 测试删除标签...');
    const deletedTag = await localConfigManager.deleteTag(testTag.id);
    console.log('✅ 标签删除成功:', deletedTag);
    
    // 11. 测试配置导出导入
    console.log('\n11. 测试配置导出导入...');
    const exportedConfig = localConfigManager.exportConfig();
    console.log('配置导出成功，标签数量:', exportedConfig.tags.length);
    
    // 添加一个临时标签用于导入测试
    const tempTag = {
      id: 'temp_import_test_' + Date.now(),
      name: '临时导入测试标签',
      isPinned: false,
      isParent: false
    };
    await localConfigManager.addTag(tempTag);
    
    const importResult = await localConfigManager.importConfig(exportedConfig);
    console.log('配置导入结果:', importResult ? '✅ 成功' : '❌ 失败');
    
    // 清理临时标签
    try {
      await localConfigManager.deleteTag(tempTag.id);
    } catch (error) {
      // 忽略清理错误
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('数据库持久化功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  // 添加到全局对象，便于在控制台调用
  window.testDatabasePersistence = testDatabasePersistence;
  console.log('数据库持久化测试函数已添加到全局对象');
  console.log('在控制台中运行 testDatabasePersistence() 开始测试');
} else {
  // Node.js 环境中直接运行
  testDatabasePersistence()
    .then(() => {
      console.log('测试脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试脚本执行失败:', error);
      process.exit(1);
    });
}

export default testDatabasePersistence;