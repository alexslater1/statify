import { useEffect, useState, type ReactNode } from "react";
import { applyTheme, savedTheme, type ThemeChoice } from "../lib/theme.ts";
import "../styles/theme-toggle.css";

const CHOICES: { choice: ThemeChoice; label: string; icon: ReactNode }[] = [
  {
    choice: "system",
    label: "Match system",
    icon: (
      <>
        <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" />
        <path d="M5.5 14.5h5M8 11.5v3" />
      </>
    ),
  },
  {
    choice: "light",
    label: "Light",
    icon: (
      <>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" />
      </>
    ),
  },
  {
    choice: "dark",
    label: "Dark",
    icon: <path d="M13.5 9.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7Z" />,
  },
];

/** Switches between light, dark and the system setting. */
export function ThemeToggle() {
  const [theme, setTheme] = useState(savedTheme);
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {CHOICES.map(({ choice, label, icon }) => (
        <button
          key={choice}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={theme === choice}
          onClick={() => setTheme(choice)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {icon}
          </svg>
        </button>
      ))}
    </div>
  );
}
