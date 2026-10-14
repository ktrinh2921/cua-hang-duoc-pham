/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === PRIMARY: Pharmacy Blue (#1B51A3) ===
        // Header, sidebar, CTA, link và focus state
        primary: {
          50:  '#E9EDFE',
          100: '#CFD9FC',
          200: '#9CB4F9',
          300: '#6190F6',
          400: '#286FDA',
          500: '#1B51A3', // BRAND
          600: '#144083', // Header/sidebar/CTA
          700: '#0D3167', // Hover
          800: '#07224C',
          900: '#031532',
          950: '#020D25',
        },
        // === ACCENT: Health Green (#6DBD45) ===
        // Logo, illustration và điểm nhấn sức khỏe
        accent: {
          50:  '#F0F8EC',
          100: '#E1F2D9',
          200: '#C4E4B4',
          300: '#A6D78E',
          400: '#89CA68',
          500: '#6DBD45',
          600: '#569735',
          700: '#407128',
          800: '#2B4B1B',
          900: '#15260D',
          950: '#0B1307',
        },
        // === SEMANTIC (cho nghiệp vụ) ===
        success: {
          50:  '#D9FFEE',
          100: '#AAFFDD',
          300: '#02E7AF',
          500: '#01C091',
          600: '#019670',
          700: '#007154',
        },
        warning: {
          50:  '#FEF1EE',
          100: '#FEE2DE',
          300: '#FCA693',
          500: '#F26522',
          600: '#C04F19',
          700: '#913910',
        },
        danger: {
          50:  '#FEEDED',
          100: '#FDDADA',
          300: '#F99090',
          500: '#F22222',
          600: '#C41919',
          700: '#931010',
        },
        info: {
          50:  '#ECF0FF',
          100: '#D9E2FF',
          300: '#80A7FF',
          500: '#0070E0',
          600: '#005AB6',
          700: '#00438B',
        },
        // === NEUTRAL: nền sạch, chữ tương phản cao ===
        neutral: {
          0:   '#FFFFFF',
          50:  '#F7F7F7',
          100: '#F6F6F6',
          200: '#EBEBEB',
          300: '#DEDEDE',
          400: '#C4C4C4',
          500: '#9E9E9E',
          600: '#787878',
          700: '#5C5C5C',
          800: '#525252',
          900: '#2B2B2B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        // Scale thống nhất (display > h1 > h2 > h3 > body > caption)
        'display': ['3rem',   { lineHeight: '1.2',  fontWeight: '700' }],
        'h1':      ['1.875rem',{ lineHeight: '1.25', fontWeight: '700' }], // 30px
        'h2':      ['1.5rem',  { lineHeight: '1.3',  fontWeight: '600' }], // 24px
        'h3':      ['1.125rem',{ lineHeight: '1.4',  fontWeight: '600' }], // 18px
        'body':    ['0.875rem',{ lineHeight: '1.5',  fontWeight: '400' }], // 14px
        'caption': ['0.75rem', { lineHeight: '1.4',  fontWeight: '400' }], // 12px
      },
      borderRadius: {
        'card':   '12px',  // Card, table wrapper
        'btn':    '8px',   // Button, input
        'modal':  '16px',  // Dialog
        'pill':   '9999px', // Badge tròn
      },
      boxShadow: {
        'card':   '0 1px 2px 0 rgb(3 21 50 / 0.04), 0 1px 3px 0 rgb(3 21 50 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(3 21 50 / 0.08), 0 2px 4px -2px rgb(3 21 50 / 0.05)',
        'modal':  '0 25px 50px -12px rgb(3 21 50 / 0.25)',
        'focus':  '0 0 0 3px rgb(27 81 163 / 0.15)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 1.2s linear infinite',
        // Animated background blobs cho Login (gradient mượt theo thời gian)
        'blob':     'blob 18s ease-in-out infinite',
        'blob-slow':'blob 28s ease-in-out infinite reverse',
        'float':    'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%':      { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%':      { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
      spacing: {
        'sidebar': '256px',
        'sidebar-collapsed': '0px',
        'header': '64px',
      },
    },
  },
  plugins: [],
};
