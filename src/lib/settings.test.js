import { expect, test } from "vitest";
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  axisWidth,
  createEventId,
  isConfirmReady,
  isPastEvent,
  loadSettings,
  parseSettings,
  saveSettings,
  subscribeToSettings,
  toDisplayEvent,
  validateEventInput,
} from "./settings.js";

const good = { id: "a", label: "Beach", date: "2027-08-14", time: null };
const stored = (o) =>
  JSON.stringify({ version: 1, countdownMode: "days", fontSize: "default", events: [], ...o });

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
  const blocked = () => {
    throw new Error("denied");
  };
  expect(loadSettings(blocked)).toEqual({ settings: DEFAULT_SETTINGS, persisted: false });
  expect(saveSettings(DEFAULT_SETTINGS, blocked)).toBe(false);
  const full = () => ({
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
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

test("createEventId returns distinct strings", () => {
  const id = createEventId();
  expect(typeof id).toBe("string");
  expect(id).not.toBe(createEventId());
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

const storageEvent = (key, newValue) => Object.assign(new Event("storage"), { key, newValue });

test("subscribeToSettings reports changes saved by another tab", () => {
  const target = new EventTarget();
  const seen = [];
  const unsubscribe = subscribeToSettings((s) => seen.push(s), target);

  target.dispatchEvent(storageEvent(STORAGE_KEY, stored({ events: [good] })));
  expect(seen).toHaveLength(1);
  expect(seen[0].events).toEqual([good]);

  target.dispatchEvent(storageEvent(null, null));
  expect(seen[1]).toEqual(DEFAULT_SETTINGS);

  target.dispatchEvent(storageEvent("theme", "dark"));
  expect(seen).toHaveLength(2);

  unsubscribe();
  target.dispatchEvent(storageEvent(STORAGE_KEY, stored()));
  expect(seen).toHaveLength(2);
});

test("isConfirmReady ignores the second click of a double-click", () => {
  expect(isConfirmReady(1000, 1100)).toBe(false);
  expect(isConfirmReady(1000, 1399)).toBe(false);
  expect(isConfirmReady(1000, 1400)).toBe(true);
});

test("axisWidth follows the chosen font size", () => {
  expect(axisWidth(32, "default")).toBe(32);
  expect(axisWidth(32, "large")).toBe(36);
  expect(axisWidth(32, "small")).toBe(28);
});
