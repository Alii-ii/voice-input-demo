import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' 使其可以部署到任意子路径 (GitHub Pages / Vercel / 静态托管)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // 让 Vite 尊重外部注入的 PORT（预览工具用它分配端口）
  server: process.env.PORT
    ? { port: Number(process.env.PORT), strictPort: true }
    : undefined,
})
