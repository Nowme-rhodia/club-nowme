import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Configuration pour exposer les variables d'environnement sans préfixe VITE_
  define: {
    // Cela permet d'exposer toutes les variables d'environnement au frontend
    // Attention: ceci peut exposer des informations sensibles
    // Il est recommandé de spécifier explicitement les variables à exposer
    'process.env': process.env
    
    // Alternative plus sécurisée: spécifier explicitement les variables
    // 'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // 'process.env.STRIPE_KEY': JSON.stringify(process.env.STRIPE_KEY),
    // etc.
  },
});
// force rebuild for Stackblitz