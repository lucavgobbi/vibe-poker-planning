import { useState } from "react";
import { useAppShellContext } from "../context/AppShellContext";

export default function JoinGate() {
  const { roomId, initialName, joinRoom, returnHome } = useAppShellContext();
  const [name, setName] = useState(initialName);

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
                joinRoom(name.trim());
              }
            }}
          />
        </label>
        <div className="join-actions">
          <button className="ghost-button" type="button" onClick={returnHome}>
            Change room
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!name.trim()}
            onClick={() => joinRoom(name.trim())}
          >
            Join room
          </button>
        </div>
      </div>
    </div>
  );
}
