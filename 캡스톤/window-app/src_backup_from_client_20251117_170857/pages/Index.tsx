import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import HeaderTime from "@/components/HeaderTime";
import LocationRow from "@/components/LocationRow";
import AirStatusCard from "@/components/AirStatusCard";
import WeatherCard from "@/components/WeatherCard";
import RecommendBanner from "@/components/RecommendBanner";
import ActionBar from "@/components/ActionBar";
import LogArea from "@/components/LogArea";
import { DEFAULT_LOCATION_NAME, DEFAULT_POS } from "@/lib/env";
import {
  fetchWeather,
  normalizeWeather,
  sendCommand,
  WeatherResponse,
} from "@/lib/api";

const MAX_LOGS = 20;

export default function Index() {
  const [location, setLocation] = useState(DEFAULT_LOCATION_NAME);
  const [weather, setWeather] = useState<WeatherResponse>({});
  const [logs, setLogs] = useState<string[]>([
    `${dayjs().format("HH:mm:ss")} • 시스템 준비 완료`,
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pushLog = useCallback((message: string) => {
    setLogs((prev) => {
      const next = [`${dayjs().format("HH:mm:ss")} • ${message}`, ...prev];
      return next.slice(0, MAX_LOGS);
    });
  }, []);

  const reloadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWeather(DEFAULT_POS.lat, DEFAULT_POS.lon);
      const normalized = normalizeWeather(response);
      setWeather(normalized);
      if (normalized.name) {
        setLocation(normalized.name);
      }
      pushLog("실시간 날씨 데이터를 불러왔습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      pushLog(`날씨 조회 실패: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [pushLog]);

  useEffect(() => {
    reloadWeather();
    const id = setInterval(reloadWeather, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [reloadWeather]);

  const handleAction = async (action: "open" | "stop" | "close") => {
    const actionText =
      action === "open"
        ? "창문 열기"
        : action === "stop"
          ? "창문 정지"
          : "창문 닫기";
    pushLog(`${actionText} 명령 전송 중...`);
    try {
      const res = await sendCommand(action);
      pushLog(`${actionText} 응답: ${JSON.stringify(res)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pushLog(`${actionText} 실패: ${message}`);
    }
  };

  const shouldShowBanner = useMemo(() => {
    if (typeof weather.recommendClose === "boolean") {
      return weather.recommendClose;
    }
    const rain = weather.precip1h_mm ?? 0;
    const pm = weather.pm25 ?? 0;
    return rain >= 0.2 || pm >= 35;
  }, [weather.recommendClose, weather.precip1h_mm, weather.pm25]);

  const getBannerMessage = () => {
    const pm = weather.pm25 ?? 0;
    const rain = weather.precip1h_mm ?? 0;
    if (pm >= 75)
      return "미세먼지가 매우 높습니다. 창문을 닫아주세요.";
    if (pm >= 35) return "미세먼지 수치가 높아 창문 닫기를 권장합니다.";
    if (rain >= 0.2) return "강수량이 감지되어 창문 닫기를 권장합니다.";
    return "";
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-purple-50 to-gray-50 flex items-start justify-center pt-0"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full max-w-sm px-4 space-y-4 pb-8">
        <HeaderTime />

        <LocationRow address={location} onSearch={reloadWeather} />

        <h1 className="text-2xl font-bold text-center text-gray-900">
          {location}
        </h1>

        <AirStatusCard pm25={weather.pm25} />

        <WeatherCard
          temperature={weather.tempC}
          humidity={weather.humidity}
          rainfall={weather.precip1h_mm}
          pm25={weather.pm25}
        />

        <RecommendBanner
          show={shouldShowBanner}
          message={getBannerMessage()}
        />

        <div className="text-center text-xs text-gray-500">
          {loading
            ? "실시간 데이터 업데이트 중..."
            : error
              ? `에러: ${error}`
              : "최신 데이터"}
        </div>

        <ActionBar
          onOpen={() => handleAction("open")}
          onStop={() => handleAction("stop")}
          onClose={() => handleAction("close")}
        />

        <LogArea logs={logs} />
      </div>
    </div>
  );
}
