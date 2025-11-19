import { ESP32_BASE, SERVER_BASE } from "./env";

export interface WeatherResponse {
  name: string;
  tempC: number | null;
  sky: string | null;
  precipProb?: number | null;
  precip1h_mm?: number | null;
  pm25?: number | null;
}

export interface RegionSuggestion {
  name: string;
  regId: string;
}

export class WeatherNotFoundError extends Error {
  constructor(message = "LOCATION_NOT_FOUND") {
    super(message);
    this.name = "WeatherNotFoundError";
  }
}

export async function fetchWeather(
  location: string,
): Promise<WeatherResponse> {
  const query = encodeURIComponent(location.trim());
  const res = await fetch(`${SERVER_BASE}/api/weather?location=${query}`);

  if (!res.ok) {
    let detail: any = null;
    try {
      detail = await res.json();
    } catch {
      // ignore
    }

    if (res.status === 404 && detail?.error === "LOCATION_NOT_FOUND") {
      throw new WeatherNotFoundError();
    }

    throw new Error("WEATHER_API_FAILED");
  }

  return res.json();
}

export async function searchRegions(
  query: string,
): Promise<RegionSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const q = encodeURIComponent(trimmed);
  const res = await fetch(`${SERVER_BASE}/api/regions?query=${q}`);
  if (!res.ok) {
    throw new Error("지역 정보를 불러오지 못했습니다.");
  }
  return res.json();
}

export type WindowAction = "open" | "close" | "stop";

export interface CommandResponse {
  ok: boolean;
  message?: string;
}

export async function sendWindowCommand(
  action: WindowAction,
): Promise<CommandResponse> {
  const res = await fetch(`${ESP32_BASE}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    throw new Error(`ESP32 command failed with status ${res.status}`);
  }

  return res.json();
}

export interface WindowStatus {
  state: "open" | "closed" | "opening" | "closing" | "stopped";
  autoClosedByRain?: boolean;
  rain?: number;
}

export async function fetchWindowStatus(): Promise<WindowStatus> {
  const res = await fetch(`${ESP32_BASE}/status`);

  if (!res.ok) {
    throw new Error(`ESP32 status failed with status ${res.status}`);
  }

  return res.json();
}
