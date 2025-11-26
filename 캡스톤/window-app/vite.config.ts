import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: "auto",
      registerType: "autoUpdate",
      manifest: {
        name: "Window Control",
        short_name: "Window",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@lib": path.resolve(__dirname, "src/lib"),
    },
  },
  server: {
      host: "0.0.0.0",
      port: 5173,
        proxy: {
          '/api': {
            target: 'http://172.20.10.5:8000',  // 또는 python 서버가 실제 돌아가는 주소
            changeOrigin: true,
            rewrite: path => path.replace(/^\/api/, "/api"),
          },
          '/esp32': {
            target: "http://172.20.10.4:80", // 실제 ESP32 주소
            changeOrigin: true,
            rewrite: path => path.replace(/^\/esp32/, ""),
          },
  },
},
});
