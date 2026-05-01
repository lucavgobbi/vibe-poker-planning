import { useState, type CSSProperties } from "react";
import { VOTE_OPTIONS } from "../lib/constants";
import { createSlug } from "../lib/room";

export default function LandingPage() {
  const [customRoom, setCustomRoom] = useState("");

  const goToRoom = (roomId: string) => {
    const nextRoom = roomId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!nextRoom) {
      return;
    }

    window.location.assign(`/${nextRoom}`);
  };

  return (
    <div className="landing-page">
      <section className="hero glass-card">
        <div className="hero-copy">
          <span className="eyebrow">Realtime vibe planning poker</span>
          <h1>Fast room links, instant votes, no account ceremony.</h1>
          <p>
            Share a URL, have everyone join with a name, vote on Fibonacci cards,
            then reveal together. Same path, same room.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => goToRoom(createSlug())}
            >
              Create room
            </button>
            <div className="inline-form">
              <input
                placeholder="Enter a custom room slug"
                value={customRoom}
                onChange={(event) => setCustomRoom(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    goToRoom(customRoom);
                  }
                }}
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => goToRoom(customRoom)}
              >
                Join URL
              </button>
            </div>
          </div>
        </div>
        <div className="hero-stage">
          {VOTE_OPTIONS.slice(0, 6).map((vote, index) => (
            <div
              key={vote}
              className="floating-card"
              style={{ "--card-index": index } as CSSProperties}
              aria-hidden="true"
            >
              {vote}
            </div>
          ))}
        </div>
      </section>

      <section className="feature-grid">
        <article className="glass-card feature-card">
          <h2>Room URLs</h2>
          <p>Use any path as a room. Hand the link around and everyone lands together.</p>
        </article>
        <article className="glass-card feature-card">
          <h2>Reveal together</h2>
          <p>Votes stay hidden until the team decides to flip the table.</p>
        </article>
        <article className="glass-card feature-card">
          <h2>Dark mode ready</h2>
          <p>Built with a full light and dark palette instead of a single swapped background.</p>
        </article>
      </section>
    </div>
  );
}
