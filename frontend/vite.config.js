import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // /api vai para o back, assim o front não precisa saber a porta dele
    proxy: { '/api': 'http://localhost:3001' },
  },
});
