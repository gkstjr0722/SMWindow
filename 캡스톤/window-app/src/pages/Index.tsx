import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";

import HeaderTime from "@/components/HeaderTime";
import LocationRow from "@/components/LocationRow";
import AirStatusCard from "@/components/AirStatusCard";
import WeatherCard from "@/components/WeatherCard";
import RecommendBanner from "@/components/RecommendBanner";
import ActionBar from "@/components/ActionBar";
import LogArea, { LogEntry } from "@/components/LogArea";
import {
  fetchWeather,
  fetchWindowStatus,
  searchRegions,
  sendWindowCommand,
  WeatherResponse,
  WeatherNotFoundError,
  RegionSuggestion,
  WindowAction,
  WindowStatus,
} from "@/lib/api";

const DEFAULT_LOCATION = "광주광역시";
const MAX_LOGS = 30;
const STATUS_POLL_INTERVAL = 3000;

const ACTION_LABELS: Record<WindowAction, string> = {
  open: "창문 열기",
  close: "창문 닫기",
  stop: "창문 정지",
};

function getAirQualityInfo(pm25?: number | null) {
  if (pm25 == null) {
    return { emoji: "🙂", label: "데이터 없음" };
  }

  if (pm25 <= 15) {
    return { emoji: "😊", label: "미세먼지 좋음" };
  } else if (pm25 <= 35) {
    return { emoji: "😐", label: "미세먼지 보통" };
  } else if (pm25 <= 75) {
    return { emoji: "😷", label: "미세먼지 나쁨" };
  }
  return { emoji: "🤢", label: "매우 나쁨" };
}

export default function Index() {
  const [locationInput, setLocationInput] = useState(DEFAULT_LOCATION);
  const [lastSearchedLocation, setLastSearchedLocation] =
    useState<string>(DEFAULT_LOCATION);
  const [displayLocation, setDisplayLocation] =
    useState<string>(DEFAULT_LOCATION);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [regionSuggestions, setRegionSuggestions] = useState<RegionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(
    null,
  );

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const [busyAction, setBusyAction] = useState<WindowAction | null>(null);

  const [windowStatus, setWindowStatus] = useState<WindowStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const statusErrorLoggedRef = useRef(false);

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    setSelectedRegionName(null);
  };

  const handleSuggestionSelect = (name: string) => {
    setLocationInput(name);
    setSelectedRegionName(name);
    setDisplayLocation(name);
    setRegionSuggestions([]);
    setShowSuggestions(false);
  };

  const pushLog = useCallback(
    (message: string, level: LogEntry["level"] = "info") => {
      logIdRef.current += 1;
      const entry: LogEntry = {
        id: logIdRef.current,
        time: dayjs().format("HH:mm:ss"),
        message,
        level,
      };
      setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
    },
    [],
  );

  useEffect(() => {
    const target = lastSearchedLocation.trim();
    if (!target) return;
    let isCancelled = false;

    async function refreshWeather() {
      try {
        setIsLoadingWeather(true);
        setWeatherError(null);

        const data = await fetchWeather(target);
        if (isCancelled) return;

        setWeather(data);
        if (data.name) {
          setDisplayLocation(data.name);
        } else {
          setDisplayLocation(target);
        }
      } catch (error) {
        if (isCancelled) return;

        setWeather(null);
        if (error instanceof WeatherNotFoundError) {
          setWeatherError(
            "해당 위치의 날씨 정보를 찾을 수 없습니다. 예: 광주광역시, 서울특별시",
          );
        } else {
          setWeatherError("날씨 정보를 불러오지 못했습니다.");
        }
        setDisplayLocation(target);
      } finally {
        if (!isCancelled) {
          setIsLoadingWeather(false);
        }
      }
    }

    refreshWeather();
    const intervalId = window.setInterval(refreshWeather, 5 * 60 * 1000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [lastSearchedLocation]);

  useEffect(() => {
    const q = locationInput.trim();
    if (!q) {
      setRegionSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
    const handle = window.setTimeout(async () => {
      try {
        const regions = await searchRegions(q);
        setRegionSuggestions(regions);
      } catch (error) {
        console.error(error);
        setRegionSuggestions([]);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [locationInput]);

  const handleSearchClick = () => {
    const base = (selectedRegionName ?? locationInput).trim();
    if (!base) {
      setWeatherError("지역을 입력해 주세요. 예: 광주광역시, 서울특별시");
      return;
    }
    setDisplayLocation(base);
    setLastSearchedLocation(base);
  };

  const handleAction = useCallback(
    async (action: WindowAction) => {
      if (busyAction) return;
      setBusyAction(action);
      const label = ACTION_LABELS[action];
      pushLog(`${label} 명령 전송 중...`);
      try {
        const res = await sendWindowCommand(action);
        const message = res.message ?? "응답 수신";
        pushLog(`${label} 성공: ${message}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "알 수 없는 오류입니다.";
        pushLog(`${label} 실패: ${message}`, "error");
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, pushLog],
  );

  useEffect(() => {
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const status = await fetchWindowStatus();
        if (!isMounted) return;
        setWindowStatus(status);
        setStatusError(null);
        statusErrorLoggedRef.current = false;
      } catch (error) {
        if (!isMounted) return;
        setWindowStatus(null);
        const message =
          error instanceof Error ? error.message : "ESP32 미응답";
        setStatusError("시스템 연결 오류 (ESP32 미응답)");
        if (!statusErrorLoggedRef.current) {
          pushLog(`ESP32 상태 조회 실패: ${message}`, "error");
          statusErrorLoggedRef.current = true;
        }
      }
    };

    pollStatus();
    const interval = window.setInterval(pollStatus, STATUS_POLL_INTERVAL);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [pushLog]);

  const precipitationLabel = useMemo(() => {
    if (weather?.precipProb != null) {
      return `${weather.precipProb}%`;
    }
    if (weather?.precip1h_mm != null) {
      return `${weather.precip1h_mm} mm`;
    }
    return "--";
  }, [weather]);

  const shouldShowBanner = useMemo(() => {
    const pm = weather?.pm25 ?? 0;
    const precipProb = weather?.precipProb ?? 0;
    const precipMm = weather?.precip1h_mm ?? 0;
    return pm >= 35 || precipProb >= 60 || precipMm >= 1;
  }, [weather]);

  const bannerMessage = useMemo(() => {
    if (!weather) return "";
    const pm = weather.pm25 ?? 0;
    if (pm >= 75)
      return "미세먼지가 매우 높습니다. 창문 닫기를 권장합니다.";
    if (pm >= 35) return "미세먼지 농도가 높습니다. 환기에 주의하세요.";
    if ((weather.precipProb ?? 0) >= 60)
      return "강수 확률이 높습니다. 창문을 닫아주세요.";
    if ((weather.precip1h_mm ?? 0) >= 1)
      return "강수량이 감지되고 있습니다.";
    return "";
  }, [weather]);

  const statusText = useMemo(() => {
    if (statusError) return statusError;
    if (!windowStatus) return "시스템 상태 확인 중...";
    const labelMap: Record<WindowStatus["state"], string> = {
      open: "열림",
      closed: "닫힘",
      opening: "열리는 중",
      closing: "닫히는 중",
      stopped: "정지됨",
    };
    return `현재 상태: ${labelMap[windowStatus.state] ?? windowStatus.state}`;
  }, [statusError, windowStatus]);

  const locationTitle = displayLocation;
  const { emoji, label } = getAirQualityInfo(weather?.pm25);

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

        <LocationRow
          value={locationInput}
          onChange={handleLocationInputChange}
          onSearch={handleSearchClick}
          isLoading={isLoadingWeather}
          onFocus={() => {
            if (regionSuggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder="예: 광주광역시, 서울특별시, 부산광역시"
        />

        {showSuggestions && regionSuggestions.length > 0 && (
          <div className="mx-4 -mt-2 rounded-2xl border border-gray-200 bg-white shadow">
            <ul className="divide-y divide-gray-100">
              {regionSuggestions.map((region) => (
                <li key={region.regId}>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-purple-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelect(region.name)}
                  >
                    <div className="font-medium">{region.name}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {weatherError && (
          <p className="text-center text-xs text-red-600">{weatherError}</p>
        )}

        <h1 className="text-2xl font-bold text-center text-gray-900">
          {locationTitle}
        </h1>

        <div>
          <AirStatusCard pm25={weather?.pm25} emoji={emoji} label={label} />
        </div>

        <WeatherCard
          temperature={weather?.tempC}
          sky={weather?.sky}
          precipitation={precipitationLabel}
          pm25={weather?.pm25}
        />

        <RecommendBanner show={shouldShowBanner} message={bannerMessage} />

        <ActionBar
          onOpen={() => handleAction("open")}
          onStop={() => handleAction("stop")}
          onClose={() => handleAction("close")}
          busyAction={busyAction}
        />

        <LogArea logs={logs} />

        <div className="text-center text-xs text-gray-500">
          {statusText}
        </div>
        {windowStatus?.autoClosedByRain && (
          <div className="text-center text-xs text-amber-600 font-medium">
            빗물 감지로 자동 닫힘
          </div>
        )}
      </div>
    </div>
  );
}
