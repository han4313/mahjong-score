import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    // 開發時把 /api 轉給 Node 伺服器（npm run server）
    proxy: { '/api': 'http://localhost:3001' },
  },
})
