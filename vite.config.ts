import { defineConfig } from "vite";

export default defineConfig({
  server: {
    open: true,
  },
  base: '/chess-game/',
  build: {
    // GitHub Pages (sin Actions) sirve desde main -> /docs.
    // Compilamos directamente ahí en vez de en dist/.
    outDir: 'docs',
    emptyOutDir: true,
  },
});
