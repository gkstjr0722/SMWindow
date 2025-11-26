export const SERVER_BASE: string =
  (import.meta.env.VITE_SERVER_BASE as string) ?? "http://localhost:8000";

export const ESP32_BASE: string =
  (import.meta.env.VITE_ESP32_BASE as string) ?? "http://172.20.10.4";

export const API_BASE = "/api"; // FastAPI 프록시 경로
export const ESP32_PROXY_BASE = "/esp32"; // FastAPI에서 중계하는 ESP32 경로
