import { useEffect, useMemo, useState } from "react";

/*
 * VITE_EVENTS accepts either format:
 *   Delimited:  2026-08-14|Beach week;2026-10-31|Halloween
 *   JSON:       [{"date":"2026-08-14","label":"Beach week"}]
 * Dates are ISO; date-only means local midnight, or add a time: 2026-08-14T18:30.
 */
function parseEvents(raw) {
  if (!raw?.trim()) return { events: [], error: false };
  const txt = raw.trim();
  let items = [];

  if (txt.startsWith("[")) {
    try {
      items = JSON.parse(txt).map((e) => ({ date: e?.date, label: e?.label }));
    } catch {
      return { events: [], error: true };
    }
  } else {
    items = txt
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [date, ...rest] = s.split("|");
        return { date: date?.trim(), label: rest.join("|").trim() };
      });
  }

  const events = items
    .map(({ date, label }) => {
      if (!date) return null;
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(date);
      const dt = new Date(dateOnly ? `${date}T00:00:00` : date);
      if (Number.isNaN(dt.getTime())) return null;
      return { dt, label: label || "Untitled event", hasTime: !dateOnly };
    })
    .filter(Boolean)
    .sort((a, b) => a.dt - b.dt);

  return { events, error: events.length === 0 };
}

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function relativeDays(dt, now) {
  return Math.round((startOfDay(dt) - startOfDay(now)) / 86400000);
}

function relLabel(days) {
  if (days === 0) return "Today";
  if (days === 1) return "Tmrw";
  return `${days}d`;
}

function EventRow({ event, now, featured }) {
  const days = relativeDays(event.dt, now);
  const sub = event.dt.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = event.hasTime
    ? event.dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <li className="flex items-center gap-3">
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          featured ? "brand-chip" : "tile"
        }`}
      >
        <div className="text-center leading-none">
          <div className="font-mono text-base font-medium tabular-nums">
            {event.dt.getDate()}
          </div>
          <div
            className={`mt-0.5 font-mono text-[9px] uppercase tracking-widest ${
              featured ? "opacity-70" : "text-umber dark:text-ash"
            }`}
          >
            {event.dt.toLocaleDateString([], { month: "short" })}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{event.label}</p>
        <p className="text-xs text-umber dark:text-ash">
          {sub}
          {time && ` \u00B7 ${time}`}
        </p>
      </div>

      <span className="rounded-full bg-ink/[0.05] px-2.5 py-1 font-mono text-[11px] tabular-nums text-umber dark:bg-paper/[0.07] dark:text-ash">
        {relLabel(days)}
      </span>
    </li>
  );
}

export default function EventsBoard() {
  const { events, error } = useMemo(
    () => parseEvents(import.meta.env.VITE_EVENTS),
    []
  );
  const [now, setNow] = useState(() => new Date());

  // Re-check once a minute to expire timed events and roll day counts over at midnight.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const upcoming = events.filter((e) =>
    e.hasTime
      ? e.dt.getTime() >= now.getTime()
      : startOfDay(e.dt) >= startOfDay(now)
  );

  return (
    <div className="panel flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Upcoming</p>
        {upcoming.length > 0 && (
          <span className="font-mono text-[11px] tabular-nums text-umber dark:text-ash">
            {upcoming.length} scheduled
          </span>
        )}
      </div>

      {upcoming.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {upcoming.map((event, i) => (
            <EventRow
              key={`${event.dt.toISOString()}-${event.label}`}
              event={event}
              now={now}
              featured={i === 0}
            />
          ))}
        </ul>
      ) : (
        <div className="tile mt-4 px-4 py-6 text-center">
          <p className="text-sm">
            {error ? "Events are temporarily unavailable." : "Nothing on the board yet."}
          </p>
        </div>
      )}
    </div>
  );
}
