# Settings Page and Countdown Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locally stored settings page where each visitor chooses a countdown mode and a site-wide font size, and adds personal events.

**Architecture:** Pure logic lives in `src/lib/countdown.js` and `src/lib/settings.js`, with unit tests beside them. A `useSettings` hook in `App.jsx` owns the state and passes values down as props, and a small `useHashRoute` hook switches between the dashboard and `#/settings`.

**Tech Stack:** React 18, Vite 6, Tailwind CSS v4, Recharts, Vitest (new, dev-only).

**Spec:** `docs/superpowers/specs/2026-11-04-settings-and-countdown-modes-design.md`

## Global Constraints

- No new runtime dependencies. Vitest is the only new dev dependency, and no component test libraries are added.
- Storage key: `venice-ii:settings`, `version: 1`. The theme keeps its existing `theme` key.
- Defaults: `countdownMode: "days"`, `fontSize: "default"`, `events: []`.
- First-time visitors see the dashboard looking and behaving as it does today.
- All `localStorage` access is guarded, including the existing theme code.
- Work on branch `feature/settings-and-countdown-modes`, never directly on `main`.
- Do not commit `.claude/launch.json`. Do not push.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Saved dates or times that are impossible (`2027-02-31`, `25:00`): the event is dropped, not rolled over to another date.
2. Saved JSON that parses but has the wrong shape (`null`, `[]`, `events` not an array): defaults load and nothing crashes.
3. An event name that is only spaces: rejected as a missing name.
4. Corrupt saved settings during the `index.html` startup script: the saved theme still applies and the font size stays Default.
5. Deleting the event currently being edited: the form resets, so saving cannot bring the event back.

---

### Task 1: Countdown calculations

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/lib/countdown.js`
- Test: `src/lib/countdown.test.js`

**Interfaces:**
- Produces:
  - `parseZonedDate(raw: string | undefined) -> Date | null`: null unless the trimmed value parses and ends in `Z` or a UTC offset
  - `splitCalendar(a: Date, b: Date) -> { months, days, hours, minutes, seconds }`: order-independent
  - `resolveStart(target: Date, raw: string | undefined) -> Date`
  - `progressPercent(now: number, start: number, target: number) -> number`

- [ ] **Step 1: Create the branch and commit the spec**

```bash
git checkout -b feature/settings-and-countdown-modes
git add docs/superpowers
git commit -m "docs: add settings and countdown modes spec and plan"
```

- [ ] **Step 2: Add Vitest**

Run `npm install -D vitest@^3`, and add this script to `package.json`. The fixed timezone makes the daylight saving test repeatable.

```json
"test": "TZ=America/New_York vitest run"
```

`vite.config.js` needs no change, because Vitest's defaults find `src/**/*.test.js`. Each test file imports `test` and `expect` from `vitest`, plus the functions it tests. The snippets below leave those imports out.

- [ ] **Step 3: Write the failing tests in `src/lib/countdown.test.js`**

```js
const d = (...args) => new Date(...args);

test("spec example: Nov 4 to Dec 17", () => {
  expect(splitCalendar(d(2026, 10, 4, 15, 46), d(2026, 11, 17, 10, 35)))
    .toEqual({ months: 1, days: 12, hours: 18, minutes: 49, seconds: 0 });
});
test("clamps to the last day of a shorter month", () => {
  expect(splitCalendar(d(2027, 0, 31), d(2027, 1, 28)))
    .toEqual({ months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 });
  expect(splitCalendar(d(2027, 0, 31), d(2027, 2, 1)))
    .toEqual({ months: 1, days: 1, hours: 0, minutes: 0, seconds: 0 });
});
test("handles leap years", () => {
  expect(splitCalendar(d(2028, 0, 31), d(2028, 1, 29)).months).toBe(1);
});
test("exact whole-month boundary", () => {
  expect(splitCalendar(d(2027, 2, 15, 12), d(2027, 3, 15, 12)))
    .toEqual({ months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 });
});
test("gives the same result once the target has passed", () => {
  const a = d(2026, 10, 4, 15, 46), b = d(2026, 11, 17, 10, 35);
  expect(splitCalendar(b, a)).toEqual(splitCalendar(a, b));
});
test("counts calendar days across a daylight saving change", () => {
  expect(splitCalendar(d(2027, 2, 13, 12), d(2027, 2, 15, 12)))
    .toEqual({ months: 0, days: 2, hours: 0, minutes: 0, seconds: 0 });
});

test("progressPercent limits and rounding", () => {
  expect(progressPercent(0, 100, 200)).toBe(0);
  expect(progressPercent(150, 100, 200)).toBe(50);
  expect(progressPercent(200, 100, 200)).toBe(100);
  expect(progressPercent(300, 100, 200)).toBe(100);
  expect(progressPercent(199.99, 100, 200)).toBe(99.9);
});

const target = new Date("2026-12-17T10:35:00-05:00");
test("resolveStart defaults to one calendar year before the target", () => {
  expect(resolveStart(target, undefined)).toEqual(new Date("2025-12-17T10:35:00-05:00"));
  expect(resolveStart(d(2028, 1, 29), undefined)).toEqual(d(2027, 1, 28));
});
test("resolveStart uses a valid override", () => {
  const raw = "2026-01-01T00:00:00-05:00";
  expect(resolveStart(target, raw)).toEqual(new Date(raw));
});
test.each(["2026-01-01T00:00:00", "garbage", "2026-12-17T10:35:00-05:00", "2027-01-01T00:00:00Z"])(
  "resolveStart ignores %s",
  (raw) => expect(resolveStart(target, raw)).toEqual(new Date("2025-12-17T10:35:00-05:00"))
);
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, because `src/lib/countdown.js` does not exist.

- [ ] **Step 5: Implement `src/lib/countdown.js`**

Work out months by adding `n` months to the original earlier date each time, clamping the day to the month's length, and never by adding one month repeatedly. Repeated adding would carry a clamped Feb 28 into later months. Find days with `setDate` on the month anchor so daylight saving changes don't shift them, then take hours, minutes and seconds from the remaining milliseconds. `resolveStart` uses the same clamped month addition with `-12`. `progressPercent` clamps to 0 to 100 and then applies `Math.floor(x * 10) / 10`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/countdown.js src/lib/countdown.test.js
git commit -m "feat: add calendar month and percentage calculations"
```

### Task 2: Settings storage and validation

**Files:**
- Create: `src/lib/settings.js`
- Test: `src/lib/settings.test.js`

**Interfaces:**
- Produces:
  - `STORAGE_KEY`, and `DEFAULT_SETTINGS`, shaped `{ version: 1, countdownMode, fontSize, events }`
  - `parseSettings(raw: string | null) -> Settings`
  - `loadSettings(getStorage = () => window.localStorage) -> { settings, persisted: boolean }`
  - `saveSettings(settings, getStorage = () => window.localStorage) -> boolean`
  - `validateEventInput({ label, date, time }) -> { ok: true, value: { label, date, time } } | { ok: false, errors: { label?, date?, time? } }`: `value.label` is trimmed, and an empty time becomes `null`
  - `createEventId() -> string`
  - `toDisplayEvent(event) -> { id, dt: Date, label, hasTime: boolean, personal: true }`
  - `isPastEvent(displayEvent, now: Date) -> boolean`: timed events are past after their time, date-only events after their day

- [ ] **Step 1: Write the failing tests in `src/lib/settings.test.js`**

```js
const good = { id: "a", label: "Beach", date: "2027-08-14", time: null };
const stored = (o) => JSON.stringify({ version: 1, countdownMode: "days", fontSize: "default", events: [], ...o });

test.each([null, "{oops", "null", "[]", "5", JSON.stringify({ version: 2, countdownMode: "months" })])(
  "loads defaults for %s",
  (raw) => expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS)
);
test("an invalid field falls back on its own", () => {
  const s = parseSettings(stored({ countdownMode: "weeks", fontSize: "large" }));
  expect(s.countdownMode).toBe("days");
  expect(s.fontSize).toBe("large");
});
test("non-array events load as empty", () => {
  expect(parseSettings(stored({ events: "nope" })).events).toEqual([]);
});
test("drops invalid events and keeps valid ones", () => {
  const events = [
    good,
    null,
    { ...good, id: "b", date: "2027-02-31" },
    { ...good, id: "c", time: "25:00" },
    { ...good, id: "d", label: "   " },
    { ...good, id: "e", label: "x".repeat(81) },
    { ...good, id: 7 },
  ];
  expect(parseSettings(stored({ events })).events).toEqual([good]);
});

test("loadSettings and saveSettings survive storage that throws", () => {
  const blocked = () => { throw new Error("denied"); };
  expect(loadSettings(blocked)).toEqual({ settings: DEFAULT_SETTINGS, persisted: false });
  expect(saveSettings(DEFAULT_SETTINGS, blocked)).toBe(false);
  const full = () => ({ getItem: () => null, setItem: () => { throw new Error("quota"); } });
  expect(saveSettings(DEFAULT_SETTINGS, full)).toBe(false);
});
test("settings round-trip through storage", () => {
  const map = new Map();
  const mem = () => ({ getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) });
  const s = { ...DEFAULT_SETTINGS, fontSize: "small", events: [good] };
  expect(saveSettings(s, mem)).toBe(true);
  expect(loadSettings(mem)).toEqual({ settings: s, persisted: true });
});

test("validateEventInput trims and normalizes", () => {
  expect(validateEventInput({ label: " Beach ", date: "2027-08-14", time: "" }))
    .toEqual({ ok: true, value: { label: "Beach", date: "2027-08-14", time: null } });
});
test("validateEventInput rejects bad input", () => {
  expect(validateEventInput({ label: "   ", date: "2027-08-14", time: "" }).errors.label).toBeTruthy();
  expect(validateEventInput({ label: "x".repeat(81), date: "2027-08-14", time: "" }).errors.label).toBeTruthy();
  expect(validateEventInput({ label: "A", date: "", time: "" }).errors.date).toBeTruthy();
  expect(validateEventInput({ label: "A", date: "2027-02-31", time: "" }).errors.date).toBeTruthy();
  expect(validateEventInput({ label: "A", date: "2027-08-14", time: "25:00" }).errors.time).toBeTruthy();
});

test("toDisplayEvent uses local wall-clock time", () => {
  const e = toDisplayEvent({ ...good, time: "18:30" });
  expect(e.dt).toEqual(new Date(2027, 7, 14, 18, 30));
  expect(e.hasTime).toBe(true);
  expect(e.personal).toBe(true);
});
test("isPastEvent follows the Upcoming card's expiry rules", () => {
  const dateOnly = toDisplayEvent(good);
  expect(isPastEvent(dateOnly, new Date(2027, 7, 14, 23, 59))).toBe(false);
  expect(isPastEvent(dateOnly, new Date(2027, 7, 15))).toBe(true);
  const timed = toDisplayEvent({ ...good, time: "18:30" });
  expect(isPastEvent(timed, new Date(2027, 7, 14, 18, 30))).toBe(false);
  expect(isPastEvent(timed, new Date(2027, 7, 14, 18, 31))).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, because `src/lib/settings.js` does not exist.

- [ ] **Step 3: Implement `src/lib/settings.js`**

Check a date is real by building a local `Date` and confirming the year, month and day come back unchanged. Generate IDs with `crypto.randomUUID` when it exists, otherwise from `Date.now()` plus `Math.random()`, because `randomUUID` is missing on plain-HTTP origins.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings.js src/lib/settings.test.js
git commit -m "feat: add local settings storage and validation"
```

### Task 3: Settings page and countdown modes

**Files:**
- Create: `src/components/Settings.jsx`
- Modify: `src/App.jsx`, `src/components/Countdown.jsx`

**Interfaces:**
- Consumes: everything Task 1 produces, plus `loadSettings` and `saveSettings` from Task 2.
- Produces:
  - `useSettings() -> { settings, persisted, update(patch) }` in `App.jsx`: `update` merges the patch, saves, and sets `persisted` to false if saving fails
  - `useHashRoute() -> "settings" | "dashboard"` in `App.jsx`
  - `<Settings settings persisted onChange={update} />`
  - `<Countdown mode={settings.countdownMode} />`

- [ ] **Step 1: Add routing, settings state and the gear link to `App.jsx`**

Only `#/settings` selects the settings page. Scroll to the top when the route changes. The header renders on both pages, and the gear is an `<a href="#/settings" aria-label="Settings">` beside the theme switch. Wrap the `localStorage.setItem` in `useTheme` in `try`/`catch`.

- [ ] **Step 2: Create `Settings.jsx` with the mode section**

Add a "Back to dashboard" link to `#/` and a labelled radio group with Days, Months and Percentage. When `persisted` is false, show: "Your browser is blocking storage, so changes won't be saved after this page closes."

- [ ] **Step 3: Add the modes to `Countdown.jsx`**

Replace the validity check in `parseTarget` with `parseZonedDate`, and read `VITE_COUNTDOWN_START` once alongside it through `resolveStart`. The chip, title, date line and invalid-target message stay the same.

- Days: the existing four cells.
- Months: five cells in `grid-cols-5`, with the units `mos`, `days`, `hrs`, `min` and `sec`.
- Percentage: `percent.toFixed(1)` followed by `%` in the same mono style at a larger size, above a bar with `role="progressbar"`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow={percent}` and `aria-label={`Progress to ${target.label}`}`.

- [ ] **Step 4: Check it in the browser**

Run `npm run dev` and open `http://localhost:5173`.
Expected:
- With no saved settings, the dashboard looks as it does on `main`.
- The gear opens Settings, and the back button and a refresh both work on `#/settings`.
- Today's values are close to Days 42/18/48, Months 1/12/18/48, and Percentage 88.3%.
- The chosen mode survives a reload.
- Temporarily setting `VITE_COUNTDOWN_DATE` to a past date in `.env.local` shows Days and Months counting up and Percentage at 100.0%. Remove it afterwards.

- [ ] **Step 5: Run the tests and commit**

Run: `npm test`
Expected: PASS.

```bash
git add src/App.jsx src/components/Settings.jsx src/components/Countdown.jsx
git commit -m "feat: add settings page and countdown modes"
```

### Task 4: Site-wide font size

**Files:**
- Modify: `index.html`, `src/index.css`, `src/App.jsx`, `src/components/Settings.jsx`, `src/components/Countdown.jsx`, `src/components/EventsBoard.jsx`, `src/components/WeatherPanel.jsx`

**Interfaces:**
- Consumes: `update({ fontSize })` and `settings.fontSize` from Task 3.
- Produces: the `data-font-size` attribute on `<html>`.

- [ ] **Step 1: Add the CSS rules to `src/index.css`**

```css
html[data-font-size="small"] { font-size: 87.5%; }
html[data-font-size="large"] { font-size: 112.5%; }
```

- [ ] **Step 2: Convert fixed-pixel text**

Everywhere in `src/`, change `text-[9px]` to `text-[0.5625rem]`, `text-[10px]` to `text-[0.625rem]`, and `text-[11px]` to `text-[0.6875rem]`. Change the three `fontSize: 11` chart ticks in `WeatherPanel.jsx` to `"0.6875rem"`.

- [ ] **Step 3: Update the startup script in `index.html`**

Use two separate `try` blocks, so one failure can't affect the other. Theme: the current logic, falling back to `prefers-color-scheme` if storage throws. Font size: parse `venice-ii:settings` and set `document.documentElement.dataset.fontSize` only when the value is `small` or `large`.

- [ ] **Step 4: Apply and expose the setting**

In `useSettings`, set `document.documentElement.dataset.fontSize` in an effect. In `Settings.jsx`, add a labelled radio group with Small, Default and Large.

- [ ] **Step 5: Check it in the browser**

Expected:
- All three sizes scale all text, including chart axis labels, in both themes.
- At Default, the dashboard looks as it did before this task.
- Reloading at Large shows no jump in size.
- With `localStorage["venice-ii:settings"]` set to `{oops` and the theme saved as the opposite of the OS preference, a reload keeps the saved theme and Default size. (Review Focus 4)
- Fix anything clipped at Large, such as the chart's axis widths or the five-cell Months row at phone width (375px).

- [ ] **Step 6: Run the tests and commit**

Run: `npm test`
Expected: PASS.

```bash
git add index.html src/index.css src/App.jsx src/components
git commit -m "feat: add site-wide font size setting"
```

### Task 5: Personal events

**Files:**
- Modify: `src/components/Settings.jsx`, `src/components/EventsBoard.jsx`, `src/App.jsx`

**Interfaces:**
- Consumes: `validateEventInput`, `createEventId`, `toDisplayEvent` and `isPastEvent` from Task 2, and `update({ events })` from Task 3.
- Produces: `<EventsBoard personalEvents={settings.events} />`

- [ ] **Step 1: Merge personal events into `EventsBoard.jsx`**

Map `personalEvents` through `toDisplayEvent`, then merge and sort them with the parsed site events before the existing upcoming filter. That way the featured row, count and error message follow the spec without extra branches. Key rows on `event.id` when present, so two identical personal events both render. Personal rows show a small "Personal" tag next to the name, and the name still truncates.

- [ ] **Step 2: Add the My events section to `Settings.jsx`**

- The form has name, date and time inputs, with errors from `validateEventInput` shown inline and nothing saved on failure.
- The list is sorted soonest first, with "Past" on events where `isPastEvent` is true, and long names truncate.
- Edit loads an event into the same form, and Cancel is available while editing.
- Delete changes to Confirm in place. If the deleted event is being edited, the form resets. (Review Focus 5)
- Note above the form: "Your events are stored only in this browser. They don't sync between devices, are erased if you clear site data, and are visible to anyone using this browser profile."

- [ ] **Step 3: Check it in the browser**

Expected:
- Adding, editing and deleting all work, and events survive a reload.
- A personal event appears in date order on Upcoming with its tag, and it's counted in "N scheduled".
- A name of only spaces and a missing date both show inline errors. (Review Focus 3)
- An event dated in the past shows "Past" in Settings and doesn't appear on Upcoming.
- Two identical events both appear, and deleting one leaves the other.
- Deleting the event being edited and then saving does not bring it back. (Review Focus 5)
- A temporary malformed `VITE_EVENTS` in `.env.local` still shows personal events, and shows the "temporarily unavailable" message once none are upcoming. Remove it afterwards.

- [ ] **Step 4: Run the tests and commit**

Run: `npm test`
Expected: PASS.

```bash
git add src/components/Settings.jsx src/components/EventsBoard.jsx src/App.jsx
git commit -m "feat: add personal events"
```

### Task 6: Documentation and final check

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the finished feature.

- [ ] **Step 1: Update `README.md`**

Add a Settings section covering the three modes, font size, personal events, the storage limits, `VITE_COUNTDOWN_START`, and `npm test`.

- [ ] **Step 2: Run the tests and build**

Run: `npm test && npm run build`
Expected: all tests pass and the build succeeds.

- [ ] **Step 3: Run the full check in the production build**

Run `npm run preview`, then go through the spec's "Checked by hand" list at desktop and phone width with empty storage, and confirm there are no console errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe settings, countdown modes and tests"
```
