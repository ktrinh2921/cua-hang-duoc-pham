import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load .env của frontend để lấy VITE_API_URL làm target cho proxy
  const env = loadEnv(mode, process.cwd(), '')
  // Mặc định 8080 cho khớp với backend/.env.example (PORT=8080)
  const apiTarget = env.VITE_API_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 4444,
      strictPort: true,
      host: true,
      proxy: {
        // FE axios gọi '/api/*' → proxy về backend
        // Port đọc từ VITE_API_URL nếu có, fallback 8080
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
