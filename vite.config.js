import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para que funcione igual en Vercel, en una subcarpeta o abierto como artifact
export default defineConfig({
  base: './',
  plugins: [react()],
});
