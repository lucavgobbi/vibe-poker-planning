import { useAppShellContext } from "../context/AppShellContext";

export default function Header() {
  const { theme, toggleTheme } = useAppShellContext();

  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brand-mark">PP</span>
        <span>Planning Poker</span>
      </a>
      <div className="topbar-actions">
        <button className="ghost-button" type="button" onClick={toggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </header>
  );
}
