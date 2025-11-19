interface RecommendBannerProps {
  show: boolean;
  message: string;
}

export default function RecommendBanner({
  show,
  message,
}: RecommendBannerProps) {
  if (!show) return null;

  return (
    <div className="px-4 py-3 rounded-2xl bg-yellow-100 text-yellow-900">
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
