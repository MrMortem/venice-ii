import { useRef, useState } from "react";
import {
  createEventId,
  isPastEvent,
  toDisplayEvent,
  validateEventInput,
} from "../lib/settings.js";

const MODE_OPTIONS = [
  { value: "days", label: "Days" },
  { value: "months", label: "Months" },
  { value: "percentage", label: "Percentage" },
];

const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
];

function ChoiceGroup({ name, legend, options, value, onChange }) {
  return (
    <fieldset className="panel p-5 sm:p-6">
      <legend className="sr-only">{legend}</legend>
      <p aria-hidden="true" className="eyebrow">
        {legend}
      </p>
      <div
        className="mt-4 grid gap-1 rounded-full bg-ink/[0.05] p-1 dark:bg-paper/[0.07]"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label key={option.value} className="block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="block rounded-full px-2 py-2 text-center text-sm font-medium text-umber transition-colors peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-venetian dark:text-ash dark:peer-checked:bg-paper dark:peer-checked:text-ink dark:peer-focus-visible:outline-[#e08a84]">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const EMPTY_FORM = { label: "", date: "", time: "" };
const INPUT_CLASS =
  "tile mt-1 block w-full min-w-0 border border-transparent px-3 py-2 text-sm aria-invalid:border-venetian focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venetian dark:[color-scheme:dark] dark:aria-invalid:border-[#e08a84] dark:focus-visible:outline-[#e08a84]";
const SMALL_BUTTON_CLASS =
  "rounded-full border border-ink/10 px-3 py-1 font-mono text-[0.6875rem] text-umber transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venetian dark:border-paper/10 dark:text-ash dark:hover:border-paper dark:hover:text-paper dark:focus-visible:outline-[#e08a84]";

function Field({ id, label, error, inputRef, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-umber dark:text-ash">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={INPUT_CLASS}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-venetian dark:text-[#e08a84]">
          {error}
        </p>
      )}
    </div>
  );
}

function formatEventDate(event) {
  const date = event.dt.toLocaleDateString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  if (!event.hasTime) return date;
  const time = event.dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${date} \u00B7 ${time}`;
}

function MyEvents({ events, onChange }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const nameInput = useRef(null);

  const now = new Date();
  const listed = events
    .map((event) => ({ event, display: toDisplayEvent(event) }))
    .sort((a, b) => a.display.dt - b.display.dt);

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
  };

  const submit = (e) => {
    e.preventDefault();
    const result = validateEventInput(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onChange(
      editingId
        ? events.map((event) =>
            event.id === editingId ? { id: editingId, ...result.value } : event
          )
        : [...events, { id: createEventId(), ...result.value }]
    );
    resetForm();
  };

  const startEditing = (event) => {
    setForm({ label: event.label, date: event.date, time: event.time ?? "" });
    setErrors({});
    setEditingId(event.id);
    setConfirmingId(null);
    nameInput.current?.focus();
  };

  const remove = (id) => {
    onChange(events.filter((event) => event.id !== id));
    setConfirmingId(null);
    if (editingId === id) resetForm();
  };

  return (
    <section aria-labelledby="my-events-heading" className="panel p-5 sm:p-6">
      <h3 id="my-events-heading" className="eyebrow">
        My events
      </h3>
      <p className="mt-3 text-xs text-umber dark:text-ash">
        Your events are stored only in this browser. They don't sync between devices, are erased
        if you clear site data, and are visible to anyone using this browser profile.
      </p>

      <form noValidate onSubmit={submit} className="mt-4 space-y-3">
        <Field
          id="event-name"
          label="Name"
          type="text"
          value={form.label}
          onChange={setField("label")}
          error={errors.label}
          inputRef={nameInput}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="event-date"
            label="Date"
            type="date"
            value={form.date}
            onChange={setField("date")}
            error={errors.date}
          />
          <Field
            id="event-time"
            label="Time (optional)"
            type="time"
            value={form.time}
            onChange={setField("time")}
            error={errors.time}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="brand-chip rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venetian dark:focus-visible:outline-[#e08a84]"
          >
            {editingId ? "Save changes" : "Add event"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className={SMALL_BUTTON_CLASS}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {listed.length > 0 && (
        <ul className="mt-5 space-y-2">
          {listed.map(({ event, display }) => (
            <li key={event.id} className="tile flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-40">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{event.label}</p>
                  {isPastEvent(display, now) && (
                    <span className="shrink-0 rounded-full border border-ink/10 px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider text-umber dark:border-paper/10 dark:text-ash">
                      Past
                    </span>
                  )}
                </div>
                <p className="text-xs text-umber dark:text-ash">{formatEventDate(display)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label={`Edit ${event.label}`}
                  onClick={() => startEditing(event)}
                  className={SMALL_BUTTON_CLASS}
                >
                  Edit
                </button>
                {confirmingId === event.id ? (
                  <button
                    type="button"
                    aria-label={`Confirm deleting ${event.label}`}
                    onClick={() => remove(event.id)}
                    className={`${SMALL_BUTTON_CLASS} text-venetian dark:text-[#e08a84]`}
                  >
                    Confirm
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete ${event.label}`}
                    onClick={() => setConfirmingId(event.id)}
                    className={SMALL_BUTTON_CLASS}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Settings({ settings, persisted, onChange }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 sm:space-y-5">
      <div>
        <a
          href="#/"
          className="font-mono text-xs text-umber underline-offset-4 hover:text-ink hover:underline dark:text-ash dark:hover:text-paper"
        >
          &larr; Back to dashboard
        </a>
        <h2 className="mt-3 font-display text-xl font-medium tracking-wide">Settings</h2>
      </div>

      {!persisted && (
        <p role="status" className="tile px-4 py-3 text-sm text-venetian dark:text-[#e08a84]">
          Your browser is blocking storage, so changes won't be saved after this page closes.
        </p>
      )}

      <ChoiceGroup
        name="countdown-mode"
        legend="Countdown mode"
        options={MODE_OPTIONS}
        value={settings.countdownMode}
        onChange={(countdownMode) => onChange({ countdownMode })}
      />

      <ChoiceGroup
        name="font-size"
        legend="Font size"
        options={FONT_SIZE_OPTIONS}
        value={settings.fontSize}
        onChange={(fontSize) => onChange({ fontSize })}
      />

      <MyEvents events={settings.events} onChange={(events) => onChange({ events })} />
    </main>
  );
}
