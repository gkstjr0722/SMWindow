interface LogAreaProps {
  logs: string[];
}

export default function LogArea({ logs }: LogAreaProps) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3 max-h-32 overflow-y-auto">
      <div className="space-y-1">
        {logs.length === 0 ? (
          <p className="text-xs text-gray-400">최근 로그 없음</p>
        ) : (
          logs.map((log, idx) => (
            <p key={idx} className="text-xs text-gray-600 font-mono">
              {log}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
