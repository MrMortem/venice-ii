# Settings page and countdown modes

Date: 2026-11-04
Status: Awaiting review

## Goal

Let each visitor personalize the Venice II dashboard, with their choices kept in
their own browser so they are still there on the next visit. A visitor can:

- choose how the main countdown is displayed (Days, Months or Percentage)
- change the font size of the whole site
- add personal events that nobody else can see

Success means that all of these survive a reload and a return visit, no account
or server is involved, and first-time visitors see a dashboard that looks and
behaves as it does today.

## Out of scope

- Syncing between devices or browsers, and import or export of settings
- Using a personal event as the countdown target
- Recurring events
- Moving the theme switch into Settings
- Live updates between open tabs (another open tab picks up changes on reload)

## Navigation

- The settings page lives at `#/settings`. Any other hash shows the dashboard.
- Routing is a small `useHashRoute` hook in `src/App.jsx` listening to
  `hashchange`. No router dependency is added.
- A gear icon link in the header opens Settings. On the settings page, a
  "Back to dashboard" link at the top returns to `#/`.
- The header, including the clock and theme switch, appears on both pages.
- The browser back button and a refresh both work on either page.

## Settings page

`src/components/Settings.jsx`, built from the existing `panel` and `tile` styles.
Every change saves immediately; there is no Save button. It has three sections.

### Countdown mode

A labelled radio group: Days, Months, Percentage. The countdown card has no mode
control of its own.

### Font size

A labelled radio group: Small, Default, Large.

### My events

- A form with a name (required, trimmed, at most 80 characters), a date
  (required) and a time (optional).
- Missing or invalid input shows an inline message and nothing is saved.
- Past dates are allowed. Such an event is listed as "Past" straight away.
- Events are listed in date order, soonest first. Each one can be edited, using
  the same form, or deleted.
- Delete takes two steps: the Delete button changes to Confirm in place, and the
  event is removed on Confirm. There is no undo.
- The section states that events are stored only in this browser, do not sync
  between devices, are erased if site data is cleared, and are visible to anyone
  using the same browser profile.

## Countdown modes

The card's chip (`T−42d`), title and scheduled-date line stay the same in every
mode, and so does the existing invalid-target message. The default mode is Days.

| Mode | Display |
|---|---|
| Days | `[D][H][M][S]`, the current behavior |
| Months | `[M][D][H][M][S]` |
| Percentage | A large percentage and a progress bar |

### Months

Calendar-based, and calculated in the visitor's local time, from the earlier of
now and the target (so now before the target, and the target after it passes):

1. Months: the largest whole number of months that can be added to the earlier
   date without passing the later one. The day of the month is clamped to the
   last day of the resulting month, so Jan 31 plus one month is Feb 28 (or 29).
2. Days: the whole calendar days that fit in what remains.
3. Hours, minutes and seconds: the time left after that.

After the target passes, the display counts up, as Days does today.

### Percentage

- `percent = (now - start) / (target - start) * 100`, clamped to 0 to 100.
- Rounded down to one decimal place, so 100.0% appears only once the target is
  reached.
- `start` defaults to exactly one calendar year before the target, in local time.
- The optional `VITE_COUNTDOWN_START` setting overrides `start`. It follows the
  same rule as `VITE_COUNTDOWN_DATE`: it must include a timezone. If it is
  invalid, or not earlier than the target, the one-year default is used and no
  message is shown.
- The progress bar has `role="progressbar"` and matching ARIA values.

## Personal events on the Upcoming card

- `EventsBoard` receives the personal events as a prop and merges them with the
  `VITE_EVENTS` events, in date order. The first upcoming event stays featured.
- Personal events have a small "Personal" tag. The "N scheduled" count includes
  them.
- Both kinds of event use the existing expiry rules: timed events drop off after
  their time, and date-only events drop off after their day.
- If `VITE_EVENTS` fails to parse but personal events exist, the personal events
  are shown. The "temporarily unavailable" message appears only when there is
  nothing upcoming to show.
- Dates and times are stored as local wall-clock values, so an event keeps its
  displayed date and time if the visitor changes timezone.

## Storage

`src/lib/settings.js` holds pure load, validate and save functions. A
`useSettings` hook, used in `App.jsx` in the same style as `useTheme`, owns the
state and passes values and callbacks down as props.

Key: `venice-ii:settings`

```json
{
  "version": 1,
  "countdownMode": "days",
  "fontSize": "default",
  "events": [
    { "id": "abc123", "label": "Beach week", "date": "2027-08-14", "time": null }
  ]
}
```

- `countdownMode` is `days`, `months` or `percentage`.
- `fontSize` is `small`, `default` or `large`.
- `date` is `YYYY-MM-DD`. `time` is `HH:MM` or `null`.
- `id` is generated locally when the event is created.

Handling bad data:

- Unparseable JSON, or a `version` other than 1, loads the defaults.
- An invalid `countdownMode` or `fontSize` falls back to its default on its own.
- An invalid event is dropped; the valid ones are kept.
- Saved data is only rewritten when the visitor next changes a setting.

Handling unavailable storage:

- All `localStorage` access is guarded, including the existing theme code in
  `useTheme` and the `index.html` startup script, because an unguarded access can
  throw when storage is blocked.
- Settings still work for the current page view, and the settings page shows a
  notice that changes won't be saved after the page closes.

The theme keeps its existing `theme` key and is not migrated.

## Font size

- `html[data-font-size="small"]` sets the root font size to 87.5% and
  `html[data-font-size="large"]` to 112.5%. Default leaves it at 100%.
- The startup script in `index.html` applies the saved size before first paint,
  next to the theme logic, to prevent a visible jump.
- Fixed-pixel text is converted so that it scales:
  - `text-[9px]` becomes `text-[0.5625rem]`
  - `text-[10px]` becomes `text-[0.625rem]`
  - `text-[11px]` becomes `text-[0.6875rem]`
  - the three `fontSize: 11` chart axis ticks in `WeatherPanel.jsx` become
    `"0.6875rem"`
- Any other fixed chart dimensions that clip labels at Large are adjusted during
  implementation.

## Code layout

New:

- `src/lib/settings.js`: defaults, validation, load and save
- `src/lib/countdown.js`: calendar-month split and percentage calculation
- `src/components/Settings.jsx`: the settings page
- Test files next to the two `lib` modules

Changed:

- `src/App.jsx`: routing, `useSettings`, gear link, guarded theme storage
- `src/components/Countdown.jsx`: takes a `mode` prop and renders each mode
- `src/components/EventsBoard.jsx`: merges and tags personal events
- `src/components/WeatherPanel.jsx`: scalable text sizes
- `src/index.css`: font-size rules and any new shared styles
- `index.html`: guarded startup script that also applies the font size
- `vite.config.js`, `package.json`: Vitest and an `npm test` script
- `README.md`: settings, modes, `VITE_COUNTDOWN_START`, storage limits

## Testing

Vitest is added as a dev-only dependency, for pure logic only. No component test
libraries are added.

Unit tests cover:

- Months: month-end clamping, leap years, count-up after the target, a span
  across a daylight saving change, and an exact whole-month boundary
- Percentage: before the start, the midpoint, the target itself, past the target,
  rounding down near 100%, and invalid or too-late `VITE_COUNTDOWN_START` values
- Settings: corrupt JSON, an unknown version, one invalid field, invalid events
  among valid ones, and storage that throws

Checked by hand in the running site:

- All three modes, including a target that has passed
- All three font sizes in both themes, at desktop and phone width
- Settings and events surviving a reload, with no size jump on load
- Adding, editing and deleting events, and their appearance on the Upcoming card
- The back button, and refreshing on `#/settings`
- The five-cell Months row at Large on a narrow screen, which is the layout most
  likely to need adjusting
