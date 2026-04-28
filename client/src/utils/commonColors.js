// 常用配色（预设颜色）
export const commonColors = [
  { name: '天蓝色', value: 'blue', hexColor: '#3B82F6' },
  { name: '翠绿色', value: 'green', hexColor: '#10B981' },
  { name: '紫罗兰', value: 'purple', hexColor: '#8B5CF6' },
  { name: '橙黄色', value: 'orange', hexColor: '#F59E0B' },
  { name: '玫瑰红', value: 'rose', hexColor: '#F43F5E' },
  { name: '青色', value: 'cyan', hexColor: '#06B6D4' },
  { name: '粉色', value: 'pink', hexColor: '#EC4899' },
  { name: '灰色', value: 'gray', hexColor: '#6B7280' },
  { name: '琥珀色', value: 'amber', hexColor: '#FBBF24' },
  { name: '靛蓝色', value: 'indigo', hexColor: '#6366F1' },
  { name: '石灰色', value: 'lime', hexColor: '#84CC16' },
  { name: '红色', value: 'red', hexColor: '#EF4444' },
  { name: '青柠色', value: 'teal', hexColor: '#14B8A6' },
  { name: '天际蓝', value: 'sky', hexColor: '#0EA5E9' },
  { name: '祖母绿', value: 'emerald', hexColor: '#059669' }
];

// 获取默认颜色
export const getDefaultColor = () => {
  return commonColors[0].hexColor;
};

// 根据颜色值获取颜色名称
export const getColorName = (hexColor) => {
  const color = commonColors.find(c => c.hexColor === hexColor);
  return color ? color.name : '未知颜色';
};

// 根据颜色值获取颜色对象
export const getColorByHex = (hexColor) => {
  return commonColors.find(c => c.hexColor === hexColor);
};

// 根据颜色值获取颜色对象
export const getColorByValue = (value) => {
  return commonColors.find(c => c.value === value);
};