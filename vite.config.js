import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // The design system is untranspiled .jsx; make sure the optimizer sees it.
    include: ['axelerate-design-system'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    include: ['tests/unit/**/*.test.{js,jsx}'],
    css: false,
    server: {
      deps: {
        // Without this Vitest hands the .jsx package to Node, which throws
        // ERR_UNKNOWN_FILE_EXTENSION. Inlining routes it through Vite's transform.
        inline: ['axelerate-design-system'],
      },
    },
  },
});
