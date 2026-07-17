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
