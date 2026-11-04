const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/* A Date from an ISO string that names its timezone, otherwise null. */
export function parseZonedDate(raw) {
  const value = raw?.trim();
  if (!value || !TIMEZONE_SUFFIX.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // Date parsing rolls a day like Feb 31 into the next month, so check it's a real day.
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})/.exec(value) ?? [];
  if (year) {
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== Number(day)) return null;
  }
  return date;
}

/* Adds calendar months in local time, clamping to the last day of a shorter month. */
function addMonths(date, count) {
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + count);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

function addDays(date, count) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

/* Calendar months, days and time between two dates, in either order. */
export function splitCalendar(a, b) {
  const [earlier, later] = a <= b ? [a, b] : [b, a];

  // Always add to the original date: stepping month by month would carry a clamped day forward.
  let months =
    (later.getFullYear() - earlier.getFullYear()) * 12 +
    later.getMonth() -
    earlier.getMonth();
  if (addMonths(earlier, months) > later) months -= 1;
  const monthAnchor = addMonths(earlier, months);

  let days = 0;
  while (addDays(monthAnchor, days + 1) <= later) days += 1;

  const total = Math.floor((later - addDays(monthAnchor, days)) / 1000);
  return {
    months,
    days,
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/* The 0% point: a valid earlier override, or one calendar year before the target. */
export function resolveStart(target, raw) {
  const override = parseZonedDate(raw);
  return override && override < target ? override : addMonths(target, -12);
}

/* Percent elapsed, rounded down so 100% appears only once the target is reached. */
export function progressPercent(now, start, target) {
  const percent = ((now - start) / (target - start)) * 100;
  return Math.floor(Math.min(100, Math.max(0, percent)) * 10) / 10;
}
