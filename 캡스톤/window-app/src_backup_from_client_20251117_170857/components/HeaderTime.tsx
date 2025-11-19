import { useEffect, useState } from "react";

export default function HeaderTime() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const date = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const ampm = now.getHours() >= 12 ? "PM" : "AM";

      setTime(
        `${year}/${month}/${date} ${hours}:${minutes}:${seconds} ${ampm}`,
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-4 pt-4 pb-2 text-center">
      <p className="text-sm font-medium text-gray-900">
        {time || "Loading..."}
      </p>
    </div>
  );
}
