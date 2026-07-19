import { useState, useEffect } from "react";

export function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchCount = () => {
      // For local dev where frontend is 5173, point to the relay at 8080.
      // Otherwise, assume it's served by the combined production server.
      const url =
        typeof window !== "undefined" && window.location.port === "5173"
          ? "http://localhost:8080/api/online"
          : "/api/online";

      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d && typeof d.count === "number") {
            setCount(d.count);
          }
        })
        .catch(() => {});
    };

    fetchCount();
    const id = setInterval(fetchCount, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return count;
}
