import { useEffect, useState } from "react";
import Countdown from "./components/Countdown.jsx";
import EventsBoard from "./components/EventsBoard.jsx";
import WeatherPanel from "./components/WeatherPanel.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import Settings from "./components/Settings.jsx";
import { loadSettings, saveSettings } from "./lib/settings.js";

function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Storage is blocked; the theme still applies for this page view.
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

function useSettings() {
  const [{ settings, persisted }, setState] = useState(() => loadSettings());

  const update = (patch) => {
    const next = { ...settings, ...patch };
    const saved = saveSettings(next);
    setState({ settings: next, persisted: persisted && saved });
  };

  return { settings, persisted, update };
}

const routeFromHash = () =>
  window.location.hash === "#/settings" ? "settings" : "dashboard";

function useHashRoute() {
  const [route, setRoute] = useState(routeFromHash);

  useEffect(() => {
    const onChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return route;
}

function GearIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.26 14H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.17-2.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 3.26V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.74 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

/* The VII mark, redrawn as a vector so it follows the current text color. */
function Mark(props) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" {...props}>
      <polygon points="14,14 26,14 52,86 40,86" />
      <rect x="60" y="14" width="11" height="72" />
      <rect x="79" y="14" width="11" height="72" />
    </svg>
  );
}

function LocalClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden text-right sm:block">
      <time
        dateTime={now.toISOString()}
        className="block font-mono text-sm tabular-nums"
      >
        {now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </time>
      <span className="font-mono text-[11px] text-umber dark:text-ash">
        {now.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </span>
    </div>
  );
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const { settings, persisted, update } = useSettings();
  const route = useHashRoute();

  return (
    <div className="min-h-screen">
      <div aria-hidden="true" className="ambient" />
      {/* Ink rule along the top edge */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-20 h-[2px] bg-ink dark:bg-paper/90" />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-7 sm:px-6 sm:pt-9">
        <header className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
          <div className="flex items-center gap-3.5">
            <Mark className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="font-display text-base font-light uppercase leading-none tracking-[0.4em] sm:text-lg">
                Venice&nbsp;II
              </h1>
              <p className="mt-1.5 text-xs text-umber dark:text-ash">
                Countdown, events &amp; the week ahead
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LocalClock />
            <a
              href="#/settings"
              aria-label="Settings"
              aria-current={route === "settings" ? "page" : undefined}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/10 bg-ink/[0.05] text-umber transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venetian dark:border-paper/10 dark:bg-paper/[0.08] dark:text-ash dark:hover:text-paper dark:focus-visible:outline-[#e08a84]"
            >
              <GearIcon className="h-4 w-4" />
            </a>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {route === "settings" ? (
          <Settings settings={settings} persisted={persisted} onChange={update} />
        ) : (
          <main className="grid gap-4 sm:gap-5 lg:grid-cols-12">
            <section aria-label="Countdown" className="lg:col-span-5">
              <Countdown mode={settings.countdownMode} />
            </section>
            <section aria-label="Weather" className="lg:col-span-7 lg:row-span-2">
              <WeatherPanel />
            </section>
            <section aria-label="Upcoming events" className="lg:col-span-5">
              <EventsBoard />
            </section>
          </main>
        )}

      </div>
    </div>
  );
}
