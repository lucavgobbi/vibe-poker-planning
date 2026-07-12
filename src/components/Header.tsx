import { useEffect, useRef, useState } from "react";
import { useAppShellContext } from "../context/AppShellContext";
import LogoIcon from "./LogoIcon";

export default function Header() {
  const { screen, roomId, theme, toggleTheme, leaveRoom, copyRoomLink } =
    useAppShellContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="topbar">
      <a className="brand" href="/">
        <LogoIcon size={32} />
        <span>Vibe-coded poker planning</span>
      </a>

      {screen === "room" ? (
        <div className="room-bar-actions" ref={menuRef}>
          <div className="room-bar">
            <span className="room-label">room:</span>
            <span className="room-id">{roomId}</span>
            <button className="icon-button" type="button" onClick={copyRoomLink} title="Copy room URL">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          </div>
          <button className="icon-button" type="button" onClick={() => setMenuOpen(!menuOpen)} title="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {menuOpen && (
            <div className="menu-dropdown">
              <button type="button" onClick={() => { toggleTheme(); closeMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {theme === "dark"
                    ? <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>
                    : <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></>
                  }
                </svg>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button type="button" onClick={() => { leaveRoom(); closeMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Change name
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="topbar-actions">
          <button className="ghost-button" type="button" onClick={toggleTheme}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      )}
    </header>
  );
}
