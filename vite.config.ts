import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      ignored: [
        '**/docx_extracted/**',
        '**/docx_extracted_new/**',
        '**/pptx_extracted/**',
        '**/*.docx',
        '**/*.pptx',
        '**/dist/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

