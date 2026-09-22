import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 使其可以部署到任意子路径 (GitHub Pages / Vercel / 静态托管)
export default defineConfig({
  base: './',
  plugins: [react()],
})
