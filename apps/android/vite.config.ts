import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@concentric/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  server: {
    proxy: {
      "/binance-api": {
        target: "https://api.binance.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance-api/, ""),
      },
    },
  },
});
