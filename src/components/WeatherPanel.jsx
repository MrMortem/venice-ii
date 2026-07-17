import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATIONS = [
  {
    id: "columbus",
    city: "Columbus",
    short: "Columbus, OH",
    lat: 39.9612,
    lon: -82.9988,
  },
  {
    id: "kittyhawk",
    city: "Kitty Hawk",
    short: "Kitty Hawk, NC",
    lat: 36.0646,
    lon: -75.7057,
  },
];

const WMO = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Violent showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm, hail",
  99: "Thunderstorm, hail",
};

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function apiUrl({ lat, lon }) {
  const p = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "7",
  });
  return `https://api.open-meteo.com/v1/forecast?${p.toString()}`;
}

function toDailyRows(data) {
  const d = data.daily;
  return d.time.map((t, i) => {
    // Parse at noon so the weekday label is correct in every timezone.
    const dt = new Date(`${t}T12:00:00`);
    return {
      key: t,
      label: i === 0 ? "Today" : dt.toLocaleDateString([], { weekday: "short" }),
      full: dt.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      hi: Math.round(d.temperature_2m_max[i]),
      lo: Math.round(d.temperature_2m_min[i]),
      precip: d.precipitation_probability_max[i] ?? 0,
    };
  });
}

const SERIES = {
  hi: { name: "High", color: "var(--chart-hi)", unit: "\u00B0F" },
  lo: { name: "Low", color: "var(--chart-lo)", unit: "\u00B0F" },
  precip: { name: "Precip", color: "var(--chart-precip)", unit: "%" },
};

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white/95 px-3 py-2 font-mono text-xs shadow-lg backdrop-blur-md dark:border-paper/10 dark:bg-nero/95">
      <p className="mb-1 text-umber dark:text-ash">{payload[0].payload.full}</p>
      {payload.map((row) => (
        <p
          key={row.dataKey}
          className="tabular-nums"
          style={{ color: SERIES[row.dataKey].color }}
        >
          {SERIES[row.dataKey].name} {row.value}
          {SERIES[row.dataKey].unit}
        </p>
      ))}
    </div>
  );
}

function LegendKey({ colorVar, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-umber dark:text-ash">
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ background: colorVar }}
      />
      {children}
    </span>
  );
}

function Chip({ label, value }) {
  return (
    <span className="tile px-3 py-1.5 font-mono text-xs tabular-nums">
      <span className="text-umber dark:text-ash">{label}</span> {value}
    </span>
  );
}

export default function WeatherPanel() {
  const [stationId, setStationId] = useState(STATIONS[0].id);
  const [state, setState] = useState({ status: "loading", data: null });
  const [updatedAt, setUpdatedAt] = useState(null);

  const station = useMemo(
    () => STATIONS.find((s) => s.id === stationId),
    [stationId]
  );

  const load = useCallback(
    async (signal) => {
      setState((s) => ({ ...s, status: "loading" }));
      try {
        const res = await fetch(apiUrl(station), { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setState({ status: "ready", data });
        setUpdatedAt(new Date());
      } catch (err) {
        if (err.name !== "AbortError") setState({ status: "error", data: null });
      }
    },
    [station]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const id = setInterval(() => load(controller.signal), 10 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [load]);

  const rows = state.status === "ready" ? toDailyRows(state.data) : [];
  const current = state.data?.current;
  const today = rows[0];

  return (
    <div className="panel flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Forecast</p>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="font-mono text-[11px] tabular-nums text-umber dark:text-ash">
              Updated{" "}
              {updatedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            onClick={() => load()}
            className="rounded-full border border-ink/10 px-3 py-1 font-mono text-[11px] text-umber transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venetian dark:border-paper/10 dark:text-ash dark:hover:border-paper dark:hover:text-paper dark:focus-visible:outline-[#e08a84]"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* City switch */}
      <div
        role="group"
        aria-label="City"
        className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-ink/[0.05] p-1 dark:bg-paper/[0.07]"
      >
        {STATIONS.map((s) => {
          const active = s.id === stationId;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => setStationId(s.id)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venetian dark:focus-visible:outline-[#e08a84] ${
                active
                  ? "bg-white text-ink shadow-[0_2px_10px_rgb(26_24_20/0.12)] dark:bg-paper/[0.14] dark:text-paper dark:shadow-none"
                  : "text-umber hover:text-ink dark:text-ash dark:hover:text-paper"
              }`}
            >
              {s.short}
            </button>
          );
        })}
      </div>

      {state.status === "error" && (
        <div className="tile mt-6 px-6 py-8 text-center">
          <p className="text-sm">
            Weather for {station.city} didn&apos;t load. Check your connection,
            then try again.
          </p>
          <button
            type="button"
            onClick={() => load()}
            className="brand-chip mt-4 rounded-full px-4 py-1.5 font-mono text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "loading" && (
        <div className="mt-6 flex flex-1 flex-col gap-3" aria-label="Loading weather">
          <div className="tile h-16 animate-pulse motion-reduce:animate-none" />
          <div className="tile min-h-[14rem] flex-1 animate-pulse motion-reduce:animate-none" />
        </div>
      )}

      {state.status === "ready" && current && (
        <>
          {/* Current conditions */}
          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="flex items-end gap-4">
              <span className="font-mono text-6xl font-medium leading-none tabular-nums tracking-tight">
                {Math.round(current.temperature_2m)}&deg;
              </span>
              <div className="pb-0.5">
                <p className="text-sm font-medium">
                  {WMO[current.weather_code] ?? "\u2014"}
                </p>
                {today && (
                  <p className="font-mono text-xs tabular-nums text-umber dark:text-ash">
                    H {today.hi}&deg; &middot; L {today.lo}&deg;
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="Feels"
                value={`${Math.round(current.apparent_temperature)}\u00B0`}
              />
              <Chip
                label="Wind"
                value={`${COMPASS[Math.round(current.wind_direction_10m / 45) % 8]} ${Math.round(current.wind_speed_10m)} mph`}
              />
              <Chip label="Humidity" value={`${current.relative_humidity_2m}%`} />
            </div>
          </div>

          {/* 7-day outlook */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">7-day outlook</p>
            <div className="flex gap-4">
              <LegendKey colorVar="var(--chart-hi)">High</LegendKey>
              <LegendKey colorVar="var(--chart-lo)">Low</LegendKey>
              <LegendKey colorVar="var(--chart-precip)">Precip</LegendKey>
            </div>
          </div>

          <div className="mt-3 min-h-[15rem] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="hiFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-hi)" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="var(--chart-hi)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                  tick={{
                    fill: "var(--chart-axis)",
                    fontSize: 11,
                    fontFamily: "Geist Mono, monospace",
                  }}
                />
                <YAxis
                  yAxisId="t"
                  width={38}
                  domain={["dataMin - 4", "dataMax + 4"]}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: "var(--chart-axis)",
                    fontSize: 11,
                    fontFamily: "Geist Mono, monospace",
                  }}
                  tickFormatter={(v) => `${Math.round(v)}\u00B0`}
                />
                <YAxis
                  yAxisId="p"
                  orientation="right"
                  width={32}
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: "var(--chart-axis)",
                    fontSize: 11,
                    fontFamily: "Geist Mono, monospace",
                  }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--chart-grid)" }} />
                <Bar
                  yAxisId="p"
                  dataKey="precip"
                  fill="var(--chart-precip)"
                  fillOpacity={0.25}
                  radius={[5, 5, 0, 0]}
                  barSize={12}
                />
                <Area
                  yAxisId="t"
                  type="monotone"
                  dataKey="hi"
                  stroke="var(--chart-hi)"
                  strokeWidth={2.5}
                  fill="url(#hiFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--chart-hi)", stroke: "var(--chart-hi)" }}
                />
                <Line
                  yAxisId="t"
                  type="monotone"
                  dataKey="lo"
                  stroke="var(--chart-lo)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3.5, fill: "var(--chart-lo)", stroke: "var(--chart-lo)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
