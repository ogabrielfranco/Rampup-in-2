import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-export': ['jspdf', 'jspdf-autotable', 'html2canvas', 'xlsx', 'pptxgenjs'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  }
});