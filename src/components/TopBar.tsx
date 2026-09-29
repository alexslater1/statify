import "../styles/top-bar.css";
import { ThemeToggle } from "./ThemeToggle.tsx";

export function TopBar() {
  return (
    <header className="top-bar">
      <span className="brand">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        Statify
      </span>
      <ThemeToggle />
    </header>
  );
}
