interface WeatherCardProps {
  temperature?: number;
  humidity?: number;
  rainfall?: number;
  pm25?: number;
}

export default function WeatherCard({
  temperature,
  humidity,
  rainfall,
  pm25,
}: WeatherCardProps) {
  const weatherItems = [
    {
      label: "☁️ 온도",
      value:
        typeof temperature === "number" ? `${temperature.toFixed(1)}°C` : "-",
    },
    {
      label: "💧 습도",
      value: typeof humidity === "number" ? `${humidity.toFixed(0)}%` : "-",
    },
    {
      label: "🌧️ 강수량(1h)",
      value:
        typeof rainfall === "number" ? `${rainfall.toFixed(1)} mm` : "-",
    },
    {
      label: "PM2.5",
      value: typeof pm25 === "number" ? `${pm25.toFixed(0)} μg/m³` : "-",
    },
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
