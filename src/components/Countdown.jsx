import { useEffect, useMemo, useState } from "react";

/* Fallbacks: the Wright Flyer left the rail at Kitty Hawk on Dec 17, 10:35 AM. */
const FALLBACK_DATE = "2026-12-17T10:35:00";
const FALLBACK_LABEL = "First Flight Anniversary";

function parseTarget() {
  const raw = import.meta.env.VITE_COUNTDOWN_DATE;
  const label = import.meta.env.VITE_COUNTDOWN_LABEL || FALLBACK_LABEL;

  if (!raw) return { date: new Date(FALLBACK_DATE), label, invalid: false };

  // Treat date-only values as local midnight instead of UTC midnight.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())
    ? `${raw.trim()}T00:00:00`
    : raw.trim();

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return { date: new Date(FALLBACK_DATE), label, invalid: true };
  }
  return { date, label, invalid: false };
}

function splitDuration(ms) {
  const total = Math.floor(Math.abs(ms) / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function Cell({ value, unit, pad = true }) {
  return (
    <div className="tile px-1 py-3.5 text-center">
      <div className="font-mono text-3xl font-medium tabular-nums leading-none sm:text-4xl">
        {pad ? String(value).padStart(2, "0") : value}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-umber dark:text-ash">
        {unit}
      </div>
    </div>
  );
}

export default function Countdown() {
  const target = useMemo(parseTarget, []);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target.date.getTime() - now;
  const passed = diff < 0;
  const { days, hours, minutes, seconds } = splitDuration(diff);

  const targetLine = target.date.toLocaleString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="panel flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Countdown</p>
        <span className="brand-chip rounded-full px-3 py-1 font-mono text-[11px] font-medium tabular-nums">
          {passed ? "T+" : "T\u2212"}{days}d
        </span>
      </div>

      <h2 className="mt-3 font-display text-xl font-medium leading-tight tracking-wide">
        {target.label}
      </h2>
      <p className="mt-1 text-sm text-umber dark:text-ash">
        {passed ? "Elapsed since" : "Scheduled"} {targetLine}
      </p>

      <div className="mt-5 grid grid-cols-4 gap-2">
        <Cell value={days} unit="days" pad={false} />
        <Cell value={hours} unit="hrs" />
        <Cell value={minutes} unit="min" />
        <Cell value={seconds} unit="sec" />
      </div>

      {target.invalid && (
        <div className="mt-auto pt-5">
          <p className="text-xs text-venetian dark:text-[#e08a84]">
            The scheduled countdown is unavailable, so the default target is shown.
          </p>
        </div>
      )}
    </div>
  );
}
