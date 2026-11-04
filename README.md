# Venice II

A soft-card dashboard for the Venice II brand: a configurable countdown, an
upcoming-events board, and a 7-day weather outlook for Columbus, Ohio and
Kitty Hawk, North Carolina — with a dark/light theme switch.

Built with React 18, Vite 6, Tailwind CSS v4, and Recharts. Weather comes from
the free [Open-Meteo](https://open-meteo.com/) API — no API key needed.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build: `npm run build`, then `npm run preview` to check the output.
Run the unit tests with `npm test`.

## Brand

The header mark is an inline SVG redraw of the Venice II "VII" logo, so it
inherits the current text color and flips cleanly between themes; the same
mark is used for the favicon. The original supplied artwork is kept at
`public/venice-ii-logo.png`. Identity notes: paper `#FAF8F3` and ink
`#1A1814` surfaces (inverted by night), Raleway for the tracked wordmark and
headings, Geist Mono for figures, with Venetian red and lagoon teal as the
two working accents.

## Weather

The panel shows current conditions plus a 7-day line graph: daily highs
(Venetian red area line), lows (lagoon teal), and precipitation chance
(bars, right axis). Cities are defined in
`src/components/WeatherPanel.jsx` — add another by appending to the
`STATIONS` array with a name and lat/lon. Data refreshes every 10 minutes,
or on Refresh.

## Theme

The switch in the header toggles a `dark` class on `<html>`. Your choice is
saved to `localStorage`; first visits follow the OS `prefers-color-scheme`.

## Settings

The gear icon in the header opens the settings page at `#/settings`. Changes
save immediately.

- **Countdown mode:** Days (`[D][H][M][S]`), Months (`[M][D][H][M][S]`, using
  calendar months) or Percentage.
- **Font size:** Small, Default or Large, scaling the whole site.
- **My events:** personal events with a name, a date and an optional time. They
  appear on the Upcoming card with a "Personal" tag.

Percentage measures progress from one year before the countdown target. To
choose a different starting point, set `VITE_COUNTDOWN_START` to an ISO date
with a timezone, earlier than the target, such as `2026-01-01T00:00:00-05:00`.

Settings are stored in the browser's `localStorage` under `venice-ii:settings`,
so no account or server is involved. They don't sync between devices, they are
erased if site data is cleared, and anyone using the same browser profile can
see them.
