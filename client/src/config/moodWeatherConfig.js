// 统一的心情天气配置
export const moodWeatherConfig = {
  // 所有心情的集合
  allMoods: [
    { emoji: '😊', name: '开心', description: '心情愉悦' },
    { emoji: '😢', name: '难过', description: '感到悲伤' },
    { emoji: '😡', name: '生气', description: '愤怒不满' },
    { emoji: '😴', name: '困倦', description: '想要睡觉' },
    { emoji: '🤔', name: '思考', description: '深度思考' },
    { emoji: '😍', name: '喜爱', description: '非常喜欢' },
    { emoji: '😎', name: '酷', description: '感觉很酷' },
    { emoji: '🤗', name: '拥抱', description: '想要拥抱' },
    { emoji: '😅', name: '尴尬', description: '感到尴尬' },
    { emoji: '😭', name: '大哭', description: '非常伤心' },
    { emoji: '🥳', name: '庆祝', description: '值得庆祝' },
    { emoji: '😌', name: '满足', description: '内心满足' }
  ],

  // 所有天气的集合
  allWeathers: [
    { emoji: '☀️', name: '晴天', description: '阳光明媚' },
    { emoji: '⛅', name: '多云', description: '云朵飘飘' },
    { emoji: '☁️', name: '阴天', description: '天空阴沉' },
    { emoji: '🌧️', name: '雨天', description: '下雨了' },
    { emoji: '⛈️', name: '雷雨', description: '雷电交加' },
    { emoji: '🌨️', name: '雪天', description: '雪花飞舞' },
    { emoji: '🌪️', name: '大风', description: '狂风呼啸' },
    { emoji: '🌈', name: '彩虹', description: '雨后彩虹' },
    { emoji: '🌙', name: '夜晚', description: '夜幕降临' },
    { emoji: '⭐', name: '星空', description: '繁星点点' },
    { emoji: '🌅', name: '日出', description: '朝阳初升' },
    { emoji: '🌄', name: '日落', description: '夕阳西下' },
    { emoji: '🌫️', name: '雾天', description: '雾气朦胧' },
    { emoji: '🌊', name: '海浪', description: '波涛汹涌' },
    { emoji: '❄️', name: '雪花', description: '雪花纷飞' },
    { emoji: '💨', name: '大风', description: '风力强劲' },
    { emoji: '🌀', name: '台风', description: '台风来袭' },
    { emoji: '🌡️', name: '高温', description: '天气炎热' },
    { emoji: '🧊', name: '严寒', description: '天气寒冷' },
    { emoji: '🌛', name: '新月', description: '新月如钩' },
    { emoji: '🌌', name: '星空', description: '银河璀璨' },
    { emoji: '🌆', name: '黄昏', description: '黄昏时分' },
    { emoji: '🌇', name: '日落', description: '落日余晖' },
    { emoji: '🌃', name: '夜晚', description: '夜色深沉' }
  ],

  // 创建心情映射表（用于快速查找）
  get moodMap() {
    const map = {};
    this.allMoods.forEach(mood => {
      map[mood.emoji] = mood;
    });
    return map;
  },

  // 创建天气映射表（用于快速查找）
  get weatherMap() {
    const map = {};
    this.allWeathers.forEach(weather => {
      map[weather.emoji] = weather;
    });
    return map;
  },

  // 解析内容中的心情和天气
  parseContentForMoodAndWeather(content) {
    if (!content) return { mood: null, weather: null };

    let foundMood = null;
    let foundWeather = null;

    // 查找心情
    for (const mood of this.allMoods) {
      const pattern = `${mood.emoji} ${mood.name}`;
      if (content.includes(pattern)) {
        foundMood = mood;
        break; // 只取第一个找到的心情
      }
    }

    // 查找天气
    for (const weather of this.allWeathers) {
      const pattern = `${weather.emoji} ${weather.name}`;
      if (content.includes(pattern)) {
        foundWeather = weather;
        break; // 只取第一个找到的天气
      }
    }

    return { mood: foundMood, weather: foundWeather };
  },

  // 移除内容中的所有心情和天气
  removeAllMoodAndWeather(content) {
    if (!content) return '';

    let cleanContent = content;

    // 移除所有心情
    for (const mood of this.allMoods) {
      const pattern = `${mood.emoji} ${mood.name}`;
      cleanContent = cleanContent.replace(new RegExp(pattern, 'g'), '');
    }

    // 移除所有天气
    for (const weather of this.allWeathers) {
      const pattern = `${weather.emoji} ${weather.name}`;
      cleanContent = cleanContent.replace(new RegExp(pattern, 'g'), '');
    }

    return cleanContent.trim();
  },

  // 移除内容中的所有心情（保留天气）
  removeAllMood(content) {
    if (!content) return '';

    let cleanContent = content;

    // 移除所有心情
    for (const mood of this.allMoods) {
      const pattern = `${mood.emoji} ${mood.name}`;
      cleanContent = cleanContent.replace(new RegExp(pattern, 'g'), '');
    }

    return cleanContent.trim();
  },

  // 移除内容中的所有天气（保留心情）
  removeAllWeather(content) {
    if (!content) return '';

    let cleanContent = content;

    // 移除所有天气
    for (const weather of this.allWeathers) {
      const pattern = `${weather.emoji} ${weather.name}`;
      cleanContent = cleanContent.replace(new RegExp(pattern, 'g'), '');
    }

    return cleanContent.trim();
  },

  // 添加心情到内容开头（保留天气）
  addMoodToContent(content, mood) {
    // 先移除所有心情，但保留天气
    let workingContent = this.removeAllMood(content);
    const moodText = `${mood.emoji} ${mood.name}`;
    
    // 查找是否有天气
    let hasWeather = false;
    let weatherPattern = '';
    for (const weather of this.allWeathers) {
      const pattern = `${weather.emoji} ${weather.name}`;
      if (workingContent.includes(pattern)) {
        hasWeather = true;
        weatherPattern = pattern;
        break;
      }
    }
    
    if (hasWeather) {
      // 如果有天气，在天气前添加心情
      workingContent = workingContent.replace(weatherPattern, `${moodText} ${weatherPattern}`);
    } else {
      // 如果没有天气，在内容开头添加心情
      workingContent = workingContent.trim();
      workingContent = workingContent ? `${moodText} ${workingContent}` : moodText;
    }
    
    return workingContent.trim();
  },

  // 添加天气到内容（保留心情）
  addWeatherToContent(content, weather) {
    // 先移除所有天气，但保留心情
    let workingContent = this.removeAllWeather(content);
    const weatherText = `${weather.emoji} ${weather.name}`;
    
    // 查找是否有心情
    let hasMood = false;
    let moodPattern = '';
    for (const mood of this.allMoods) {
      const pattern = `${mood.emoji} ${mood.name}`;
      if (workingContent.includes(pattern)) {
        hasMood = true;
        moodPattern = pattern;
        break;
      }
    }
    
    if (hasMood) {
      // 如果有心情，在心情后添加天气
      workingContent = workingContent.replace(moodPattern, `${moodPattern} ${weatherText}`);
    } else {
      // 如果没有心情，在内容开头添加天气
      workingContent = workingContent.trim();
      workingContent = workingContent ? `${weatherText} ${workingContent}` : weatherText;
    }
    
    return workingContent.trim();
  }
};

export default moodWeatherConfig;