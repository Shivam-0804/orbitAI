import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["quickjs-emscripten"],
  },
  plugins: [react()],
  define: {
    "process.env": {},
  },
  server: {
    proxy: {
      "/clang-assets": {
        target: "https://unpkg.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/clang-assets/, ""),
        secure: false,
      },
    },
  },
});
