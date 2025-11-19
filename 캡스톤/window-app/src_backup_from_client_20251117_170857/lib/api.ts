import { API_BASE } from "./env";

export type WeatherResponse = {
  name?: string;
  tempC?: number;
  humidity?: number;
  precip1h_mm?: number;
  pm25?: number;
  weather?: string;
  recommendClose?: boolean;
};

export function normalizeWeather(raw: any): WeatherResponse {
  if (!raw || typeof raw !== "object") return {};
  const obj = (raw as any).data ?? raw;
  return {
    name: obj?.name ?? obj?.locationName ?? "",
    tempC: obj?.tempC ?? obj?.temp ?? obj?.temperature,
    humidity: obj?.humidity,
    precip1h_mm:
      obj?.precip1h_mm ??
      obj?.rain_mm_1h ??
      obj?.rain1h ??
      obj?.rain?.["1h"] ??
      0,
    pm25: obj?.pm25 ?? obj?.pm_25 ?? obj?.air?.pm25,
    weather: obj?.weather ?? obj?.conditions,
    recommendClose: Boolean(obj?.recommendClose),
  };
}

export async function fetchWeather(lat: number, lon: number) {
  const url = `${API_BASE}/api/weather?lat=${lat}&lon=${lon}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`weather request failed (${response.status})`);
  }
  return response.json();
}

export async function sendCommand(action: "open" | "stop" | "close") {
  const response = await fetch(`${API_BASE}/api/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `command failed (${response.status}): ${
        errText || response.statusText
      }`
    );
  }
  return response.json();
}
