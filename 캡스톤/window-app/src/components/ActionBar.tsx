type WindowAction = "open" | "close" | "stop";

interface ActionBarProps {
  onOpen?: () => void;
  onStop?: () => void;
  onClose?: () => void;
  busyAction?: WindowAction | null;
}

export default function ActionBar({
  onOpen,
  onStop,
  onClose,
  busyAction,
}: ActionBarProps) {
  const actions = [
    { id: "open", label: "열기", icon: "⬅️", onClick: onOpen },
    { id: "stop", label: "정지", icon: "⏹️", onClick: onStop },
    { id: "close", label: "닫기", icon: "➡️", onClick: onClose },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          disabled={Boolean(busyAction)}
          className="aspect-square bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-2 py-4"
        >
          <span className="text-3xl">{action.icon}</span>
          <span className="text-xs font-medium text-gray-700">
            {busyAction === action.id ? "전송중..." : action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
