import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Caminho relativo: funciona em GitHub Pages (subpasta) e Vercel (raiz)
  base: './',
  build: {
    chunkSizeWarningLimit: 2000, // o Phaser sozinho passa de 1 MB
  },
  test: {
    // Lógica pura roda em Node; nada em src/logic pode importar Phaser
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Os testes que varrem todos os modelos de sala e sementes passam de 5 s com a máquina ocupada
    testTimeout: 30000,
  },
});
