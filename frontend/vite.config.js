import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// The project uses ONE shared .env at the repo root (one level up from frontend/).
// Point Vite there so it reads the same file the backend does. Vite still only
// exposes VITE_-prefixed vars to client code — backend secrets in the same file
// are never bundled.
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: rootDir,
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          // Markdown + syntax highlighting is the heaviest dependency;
          // split it so it caches independently and lazy-loads cleanly.
          markdown: ["react-markdown", "remark-gfm", "rehype-highlight"],
        },
      },
    },
  },
});
