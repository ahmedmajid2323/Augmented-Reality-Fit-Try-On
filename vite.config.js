import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // Enables HTTPS for camera access
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,glb,jpg,png}'],
        maximumFileSizeToCacheInBytes: 5000000
      }
    })
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    https: true, // HTTPS enabled
    open: true
  },
  worker: {
    format: 'es'
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    exclude: ['@mediapipe/face_mesh', '@mediapipe/hands', '@mediapipe/pose']
  }
});
