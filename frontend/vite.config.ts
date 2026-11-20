import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // НАСТРОЙКА НОВОГО ПОРТА ДЛЯ ОБХОДА БЛОКИРОВКИ WINDOWS
  server: {
    port: 4000,
    strictPort: true, // Запрещаем Vite автоматически прыгать по портам
  }
});
