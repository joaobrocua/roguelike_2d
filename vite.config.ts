import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Caminho relativo: funciona em GitHub Pages (subpasta) e Vercel (raiz)
  base: './',
  build: {
    chunkSizeWarningLimit: 1500, // o Phaser sozinho passa de 1 MB
  },
  test: {
    // Lógica pura roda em Node; nada em src/logic pode importar Phaser
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
