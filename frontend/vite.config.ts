import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: true,
    port: 5173,
    strictPort: true,

    allowedHosts: [
      ".trycloudflare.com",
    ],

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },

      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true,

        headers: {
          Origin: "http://localhost:5173",
        },
      },
    },
  },
});