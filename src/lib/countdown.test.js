import { expect, test } from "vitest";
import {
  parseZonedDate,
  progressPercent,
  resolveStart,
  splitCalendar,
} from "./countdown.js";

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
  const a = d(2026, 10, 4, 15, 46);
  const b = d(2026, 11, 17, 10, 35);
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

test("parseZonedDate requires a valid date with a timezone", () => {
  expect(parseZonedDate(" 2026-12-17T10:35:00Z ")).toEqual(new Date("2026-12-17T10:35:00Z"));
  expect(parseZonedDate("2026-12-17T10:35:00")).toBeNull();
  expect(parseZonedDate("garbage")).toBeNull();
  expect(parseZonedDate(undefined)).toBeNull();
});
