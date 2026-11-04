const MODE_OPTIONS = [
  { value: "days", label: "Days" },
  { value: "months", label: "Months" },
  { value: "percentage", label: "Percentage" },
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
    </main>
  );
}
