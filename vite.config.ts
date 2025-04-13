import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Substitua "carris-metro-gpx" pelo nome do seu repositório
export default defineConfig({
  plugins: [react()],
  base: '/carris-metro-gpx/', // Nome do repositório no GitHub
});
