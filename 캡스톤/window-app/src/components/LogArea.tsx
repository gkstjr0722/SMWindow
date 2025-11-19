export interface LogEntry {
  id: number;
  time: string;
  message: string;
  level: "info" | "error";
}

interface LogAreaProps {
  logs: LogEntry[];
}

export default function LogArea({ logs }: LogAreaProps) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3 max-h-40 overflow-y-auto">
      <div className="space-y-1">
        {logs.length === 0 ? (
          <p className="text-xs text-gray-400">최근 로그 없음</p>
        ) : (
          logs.map((log) => (
            <p
              key={log.id}
              className={`text-xs font-mono ${
                log.level === "error" ? "text-red-600" : "text-gray-700"
              }`}
            >
              [{log.time}] {log.message}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
