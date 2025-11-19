interface AirStatusCardProps {
  pm25?: number | null;
  emoji?: string;
  label?: string;
}

export default function AirStatusCard({
  pm25,
  emoji,
  label,
}: AirStatusCardProps) {
  const value = typeof pm25 === "number" ? pm25 : 0;
  const getStatus = (pm: number) => {
    if (pm <= 15)
      return {
        text: "미세먼지 좋음",
        emoji: "😊",
        color: "text-green-600",
      };
    if (pm <= 35)
      return { text: "미세먼지 보통", emoji: "😐", color: "text-amber-600" };
    if (pm <= 75)
      return { text: "미세먼지 나쁨", emoji: "😷", color: "text-red-600" };
    return { text: "미세먼지 매우 나쁨", emoji: "😠", color: "text-red-700" };
  };
  const status = getStatus(value);
  const displayEmoji = emoji || status.emoji;
  const displayLabel =
    typeof pm25 === "number"
      ? label ?? status.text
      : label ?? "PM2.5 데이터를 불러오는 중";

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <div className="text-9xl leading-none">{displayEmoji}</div>
      <p className={`text-base font-medium ${status.color}`}>{displayLabel}</p>
    </div>
  );
}
