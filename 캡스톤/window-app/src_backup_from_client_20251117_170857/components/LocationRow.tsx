interface LocationRowProps {
  address: string;
  onSearch?: () => void;
}

export default function LocationRow({ address, onSearch }: LocationRowProps) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <label className="text-base font-semibold text-gray-900 whitespace-nowrap">
        위치 입력:
      </label>
      <span className="flex-1 text-sm text-gray-600 text-center">
        {address}
      </span>
      <button
        onClick={onSearch}
        className="h-7 px-4 py-1 bg-purple-500 hover:bg-purple-600 active:scale-95 transition-all rounded-full text-xs font-semibold text-white whitespace-nowrap shadow-md"
      >
        조회
      </button>
    </div>
  );
}
