import { ChangeEvent } from "react";

interface LocationRowProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  isLoading?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
}

export default function LocationRow({
  value,
  onChange,
  onSearch,
  isLoading,
  onFocus,
  onBlur,
  placeholder = "예: 광주광역시, 서울특별시, 부산광역시",
}: LocationRowProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <label className="text-base font-semibold text-gray-900 whitespace-nowrap">
        위치 입력:
      </label>
      <input
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className="flex-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none"
        placeholder={placeholder}
      />
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="h-8 px-4 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 disabled:cursor-not-allowed active:scale-95 transition-all rounded-full text-xs font-semibold text-white whitespace-nowrap shadow-md"
      >
        {isLoading ? "조회중..." : "조회"}
      </button>
    </div>
  );
}
