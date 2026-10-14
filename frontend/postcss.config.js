/**
 * PostCSS Configuration
 *
 * Cầu nối giữa Tailwind CSS và Vite build pipeline.
 * Nếu thiếu file này, các directive `@tailwind base/components/utilities`
 * trong index.css sẽ KHÔNG được xử lý → trang render ra trắng (không có style).
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};