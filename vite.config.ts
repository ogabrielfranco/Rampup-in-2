
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Removed manual environment variable loading to resolve 'process.cwd()' error.
// process.env.API_KEY is assumed to be automatically injected by the environment.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['xlsx', 'pptxgenjs']
  },
  build: {
    commonjsOptions: {
      include: [/xlsx/, /pptxgenjs/, /node_modules/]
    }
  }
});
