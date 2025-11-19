interface WeatherCardProps {
  temperature?: number | null;
  sky?: string | null;
  precipitation?: string | null;
  pm25?: number | null;
}

export default function WeatherCard({
  temperature,
  sky,
  precipitation,
  pm25,
}: WeatherCardProps) {
  const normalizedTemp =
    typeof temperature === "number" ? `${temperature.toFixed(1)}°C` : "--";
  const normalizedSky = sky || "--";
  const normalizedPrecip = precipitation || "--";
  const normalizedPm25 =
    typeof pm25 === "number" ? `${pm25} μg/m³` : "--";

  const weatherItems = [
    { label: "☁️ 기온", value: normalizedTemp },
    { label: "🌥️ 하늘", value: normalizedSky },
    { label: "🌧️ 강수", value: normalizedPrecip },
    { label: "PM2.5", value: normalizedPm25 },
  ];

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {weatherItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-base font-medium text-gray-900">
              {item.label}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
