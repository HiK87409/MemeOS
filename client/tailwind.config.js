/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 使用class策略而不是media查询
  theme: {
    extend: {

      // 宽度配置
      width: {
        'menu-width': '256px', // 菜单宽度 (w-64)
        'card-customizer': '630px', // 卡片个性化设置宽度（减少一半）
        'card-customizer-sm': '320px',
        'card-customizer-lg': '480px',
        'card-customizer-xl': '560px',
        'content-max': '840px',
        'tag-truncate': '100px',
        'sidebar': '256px', // 侧边栏宽度 (w-64)
        'tag-picker': '320px', // 标签选择器宽度 (w-80)
        'calendar-filter': '320px', // 日历筛选器宽度 (w-80)
        'pagination': '320px', // 分页器宽度 (w-80)
        'references-modal': '672px', // 双向链接模态框宽度 (max-w-2xl)
        'note-selector': '384px', // 笔记引用选择器宽度 (w-96)
      },
      maxWidth: {
        'card-customizer': '630px', // 卡片个性化设置最大宽度（减少一半）
        'card-customizer-sm': '320px',
        'card-customizer-lg': '480px',
        'card-customizer-xl': '560px',
        'content': '840px',
        'paper': '720px', // 纸张质感编辑区最大宽度
        'tag': '100px',
        'viewport-safe': 'calc(100vw - 32px)',
        'references-modal': '672px', // 双向链接模态框最大宽度 (max-w-2xl)
        'note-selector': '384px', // 笔记引用选择器最大宽度 (w-96)
      },
      minWidth: {
        'card-customizer': '320px',
        'btn-xs': '24px',
        'btn-sm': '28px',
        'btn-md': '32px',
        'btn-lg': '4rem',
        'btn-action': '5rem',
      },
      
      // 高度配置
      height: {
        'card-preview': '140px', // 减少预览区域高度，避免遮挡设置
        'card-min': '200px',
        'backlink-max': '300px',
      },
      
      // 呼吸式间距体系配置
      spacing: {
        'paper-vertical': '12px', // 正文块垂直间距
        'paper-horizontal': '24px', // 正文块左右留空
      },
      minHeight: {
        'card': '200px',
        'btn-lg': '3rem',
      },
      maxHeight: {
         'backlink': '300px',
         'card-customizer-preview': '200px',
       },
       
       // 字体大小配置
       fontSize: {
         'xxs': '9px',
         'tiny': '10px',
         // 响应式字体大小配置
         'responsive-xs': ['10px', { '@media (max-width: 768px)': '8.75px', '@media (max-width: 400px)': '7.5px' }],
         'responsive-sm': ['12px', { '@media (max-width: 768px)': '10.5px', '@media (max-width: 400px)': '9px' }],
         'responsive-base': ['16px', { '@media (max-width: 768px)': '14px', '@media (max-width: 400px)': '12px', '@media (min-width: 769px) and (max-width: 1024px)': '15px', '@media (min-width: 1920px)': '18px' }],
         'responsive-lg': ['18px', { '@media (max-width: 768px)': '15.75px', '@media (max-width: 400px)': '13.5px' }],
         'responsive-xl': ['20px', { '@media (max-width: 768px)': '17.5px', '@media (max-width: 400px)': '15px' }],
         'responsive-2xl': ['24px', { '@media (max-width: 768px)': '21px', '@media (max-width: 400px)': '18px' }],
         'responsive-3xl': ['30px', { '@media (max-width: 768px)': '26.25px', '@media (max-width: 400px)': '22.5px' }],
         'responsive-4xl': ['36px', { '@media (max-width: 768px)': '31.5px', '@media (max-width: 400px)': '27px' }],
         'responsive-5xl': ['48px', { '@media (max-width: 768px)': '42px', '@media (max-width: 400px)': '36px' }],
         'responsive-6xl': ['60px', { '@media (max-width: 768px)': '52.5px', '@media (max-width: 400px)': '45px' }],
       },
       
       // 边框宽度配置
       borderWidth: {
         'default': '1px',
       },
       
       // 阴影配置
       boxShadow: {
         'card-hover': '0 8px 25px rgba(0, 0, 0, 0.15)',
         'nav-active': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
         'nav-hover': '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
         'editor': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
         'editor-focus': '0 2px 8px rgba(59, 130, 246, 0.3)',
         'card-glow': '0 0 30px rgba(107, 114, 128, 0.3)',
         'card-glow-dark': '0 0 30px rgba(107, 114, 128, 0.2)',
       },
      
      colors: {
        // 主题颜色 - 实体版本
        'theme-bg': 'var(--theme-bg)',
        'theme-surface': 'var(--theme-surface)',
        'theme-elevated': 'var(--theme-elevated)',
        'theme-text': 'var(--theme-text)',
        'theme-text-secondary': 'var(--theme-text-secondary)',
        'theme-text-muted': 'var(--theme-text-muted)',
        'theme-border': 'var(--theme-border)',
        'theme-primary': 'var(--theme-primary)',
        'theme-primary-hover': 'var(--theme-primary-hover)',
        'theme-secondary': 'var(--theme-secondary)',
        'theme-accent': 'var(--theme-accent)',
        
        // 状态颜色
        'theme-success': 'var(--theme-success)',
        'theme-warning': 'var(--theme-warning)',
        'theme-error': 'var(--theme-error)',
        'theme-info': 'var(--theme-info)',
        
        // 保留原有的primary颜色作为备用
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // 静态深色主题配色（作为备用）
        dark: {
          bg: '#1F2937',
          surface: '#1F2937',
          elevated: '#333333',
          border: '#475569',
          text: '#f1f5f9',
          muted: '#cbd5e1',
          disabled: '#94a3b8',
        },
        // 静态浅色主题配色（作为备用）
        light: {
          bg: '#ffffff',
          surface: '#e2e8f0',
          elevated: '#cbd5e1',
          border: '#94a3b8',
          text: '#0f172a',
          muted: '#64748b',
          disabled: '#94a3b8',
        }
      },
    },
  },
  plugins: [],
}