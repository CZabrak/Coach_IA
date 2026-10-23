"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatClock } from "@/lib/storage";

export default function SessionClock({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const display = seconds >= 3600 ? `${Math.floor(seconds / 3600)}:${formatClock(seconds % 3600).padStart(5, "0")}` : formatClock(seconds);

  return (
    <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">
      <Clock className="h-3 w-3" />
      {display}
    </span>
  );
}
