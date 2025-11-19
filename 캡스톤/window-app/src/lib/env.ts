export const SERVER_BASE: string =
  (import.meta.env.VITE_SERVER_BASE as string) ?? "http://localhost:8000";

export const ESP32_BASE: string =
  (import.meta.env.VITE_ESP32_BASE as string) ?? "http://172.20.10.4";
