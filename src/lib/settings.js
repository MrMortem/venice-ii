export const STORAGE_KEY = "venice-ii:settings";

export const DEFAULT_SETTINGS = Object.freeze({
  version: 1,
  countdownMode: "days",
  fontSize: "default",
  events: Object.freeze([]),
});

const COUNTDOWN_MODES = ["days", "months", "percentage"];
const FONT_SIZES = ["small", "default", "large"];
const MAX_LABEL_LENGTH = 80;

const defaults = () => ({ ...DEFAULT_SETTINGS, events: [] });
const browserStorage = () => window.localStorage;

function isRealDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function validateEventInput({ label, date, time }) {
  const errors = {};
  const name = typeof label === "string" ? label.trim() : "";
  const clock = time || null;

  if (!name) errors.label = "Enter a name.";
  else if (name.length > MAX_LABEL_LENGTH) {
    errors.label = `Use ${MAX_LABEL_LENGTH} characters or fewer.`;
  }
  if (!date) errors.date = "Choose a date.";
  else if (typeof date !== "string" || !isRealDate(date)) errors.date = "Enter a valid date.";
  if (clock !== null && (typeof clock !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))) {
    errors.time = "Enter a valid time.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { label: name, date, time: clock } };
}

function parseStoredEvent(event) {
  if (!event || typeof event.id !== "string" || !event.id) return null;
  const result = validateEventInput(event);
  return result.ok ? { id: event.id, ...result.value } : null;
}

export function parseSettings(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaults();
  }
  if (!data || data.version !== 1) return defaults();

  return {
    version: 1,
    countdownMode: COUNTDOWN_MODES.includes(data.countdownMode)
      ? data.countdownMode
      : DEFAULT_SETTINGS.countdownMode,
    fontSize: FONT_SIZES.includes(data.fontSize) ? data.fontSize : DEFAULT_SETTINGS.fontSize,
    events: Array.isArray(data.events)
      ? data.events.map(parseStoredEvent).filter(Boolean)
      : [],
  };
}

export function loadSettings(getStorage = browserStorage) {
  try {
    return { settings: parseSettings(getStorage().getItem(STORAGE_KEY)), persisted: true };
  } catch {
    return { settings: defaults(), persisted: false };
  }
}

export function saveSettings(settings, getStorage = browserStorage) {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/* Keeps an open tab current, so its next save can't overwrite another tab's changes. */
export function subscribeToSettings(onChange, target = window) {
  const listener = (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      onChange(parseSettings(event.newValue));
    }
  };
  target.addEventListener("storage", listener);
  return () => target.removeEventListener("storage", listener);
}

/* crypto.randomUUID is missing on plain-HTTP origins. */
export function createEventId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export function toDisplayEvent({ id, label, date, time }) {
  return {
    id,
    dt: new Date(`${date}T${time ?? "00:00"}:00`),
    label,
    hasTime: time !== null,
    personal: true,
  };
}

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function isPastEvent(event, now) {
  return event.hasTime
    ? event.dt.getTime() < now.getTime()
    : startOfDay(event.dt) < startOfDay(now);
}

/* Confirm ignores clicks this soon after arming, so a double-click on Delete can't confirm. */
const CONFIRM_DELAY_MS = 400;

export function isConfirmReady(armedAt, now) {
  return now - armedAt >= CONFIRM_DELAY_MS;
}

const FONT_SCALE = { small: 0.875, default: 1, large: 1.125 };

/* Recharts axis widths are in pixels, so they grow with the site font size. */
export function axisWidth(px, fontSize) {
  return Math.ceil(px * FONT_SCALE[fontSize]);
}
