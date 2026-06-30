import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // /api 요청을 Nginx(8080)로 프록시 → 브라우저 입장에선 같은 출처라 CORS 불필요
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
