function SunIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export default function ThemeToggle({ theme, onToggle }) {
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      onClick={onToggle}
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-ink/10 bg-ink/[0.05] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venetian dark:border-paper/10 dark:bg-paper/[0.08] dark:focus-visible:outline-[#e08a84]"
    >
      <SunIcon className="absolute left-2 h-3.5 w-3.5 text-umber/70 dark:text-ash/50" />
      <MoonIcon className="absolute right-2 h-3.5 w-3.5 text-umber/50 dark:text-ash/70" />
      <span
        aria-hidden="true"
        className={`brand-chip relative z-10 grid h-6 w-6 place-items-center rounded-full shadow-[0_2px_8px_rgb(26_24_20/0.3)] transition-transform duration-200 motion-reduce:transition-none ${
          dark ? "translate-x-7" : "translate-x-1"
        }`}
      >
        {dark ? <MoonIcon className="h-3.5 w-3.5" /> : <SunIcon className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
