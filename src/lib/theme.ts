/** "system" follows the device's light or dark setting. */
export type ThemeChoice = "system" | "light" | "dark";

// index.html reads the same key before the page draws, so it opens in the
// saved theme without flashing the other one first
const STORAGE_KEY = "statify-theme";

export function parseThemeChoice(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

/** The saved choice, or "system" if there isn't one or storage is blocked. */
export function savedTheme(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Shows the page in `choice` and remembers it on this device. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage is blocked, so the choice lasts until the page is closed
  }
}
