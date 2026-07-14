import { useState } from "react";
import { useAppShellContext } from "../context/AppShellContext";
import { SPECTATOR_KEY } from "../lib/constants";

export default function JoinGate() {
  const { roomId, initialName, joinRoom, returnHome } = useAppShellContext();
  const [name, setName] = useState(initialName);
  const [asSpectator, setAsSpectator] = useState(false);

  const handleJoin = () => {
    if (asSpectator) {
      window.localStorage.setItem(SPECTATOR_KEY, "true");
    } else {
      window.localStorage.removeItem(SPECTATOR_KEY);
    }
    joinRoom(name.trim());
  };

  return (
    <div className="join-shell">
      <div className="join-card glass-card">
        <span className="eyebrow">Room {roomId}</span>
        <h1>Join the planning table</h1>
        <p>
          Everyone on this URL lands in the same room. Pick the name the rest of
          the team should see before you connect.
        </p>
        <label className="field">
          <span>Your name</span>
          <input
            autoFocus
            maxLength={40}
            placeholder="Ada Lovelace"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) {
                handleJoin();
              }
            }}
          />
        </label>
        <label className="field field-checkbox">
          <input
            type="checkbox"
            checked={asSpectator}
            onChange={(event) => setAsSpectator(event.target.checked)}
          />
          <span>Join as spectator</span>
        </label>
        <div className="join-actions">
          <button className="ghost-button" type="button" onClick={returnHome}>
            Change room
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!name.trim()}
            onClick={handleJoin}
          >
            {asSpectator ? "Watch room" : "Join room"}
          </button>
        </div>
      </div>
    </div>
  );
}
