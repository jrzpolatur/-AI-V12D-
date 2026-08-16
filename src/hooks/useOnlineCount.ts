import { useState, useEffect } from "react";
import { getServerHttpUrl } from "../utils/serverConfig";

export function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchCount = () => {
      const httpBase = getServerHttpUrl();
      const url = httpBase ? `${httpBase}/api/online` : "/api/online";

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
