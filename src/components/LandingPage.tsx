import { useState, type CSSProperties } from "react";
import { DECKS, DEFAULT_DECK } from "../lib/constants";
import { createSlug, setStoredDeck } from "../lib/room";
import type { DeckType } from "../lib/types";

const DECK_ENTRIES = Object.entries(DECKS) as [
  DeckType,
  (typeof DECKS)[DeckType],
][];

export default function LandingPage() {
  const [customRoom, setCustomRoom] = useState("");
  const [selectedDeck, setSelectedDeck] = useState<DeckType>(DEFAULT_DECK);

  const goToRoom = (roomId: string) => {
    const nextRoom = roomId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    if (!nextRoom) {
      return;
    }

    setStoredDeck(selectedDeck);
    window.location.assign(`/${nextRoom}`);
  };

  return (
    <div className="landing-page">
      <section className="hero glass-card">
        <div className="hero-copy">
          <span className="eyebrow">Realtime vibe-coded planning poker</span>
          <h1>Fast room links, instant votes, no account ceremony.</h1>
          <p>
            Share a URL, have everyone join with a name, vote on cards, then
            reveal together. Same path, same room.
          </p>
          <div className="deck-selector">
            <span className="deck-selector-label">Deck</span>
            <div className="deck-options">
              {DECK_ENTRIES.map(([key, deck]) => (
                <button
                  key={key}
                  type="button"
                  className={`deck-option ${selectedDeck === key ? "active" : ""}`}
                  onClick={() => setSelectedDeck(key)}
                >
                  {deck.label}
                </button>
              ))}
            </div>
          </div>
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
          {DECKS[selectedDeck].values.slice(0, 6).map((vote, index) => (
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
          <p>
            Use any path as a room. Hand the link around and everyone lands
            together.
          </p>
        </article>
        <article className="glass-card feature-card">
          <h2>Reveal together</h2>
          <p>Votes stay hidden until the team decides to flip the table.</p>
        </article>
        <article className="glass-card feature-card">
          <h2>Dark mode ready</h2>
          <p>
            Built with a full light and dark palette instead of a single swapped
            background.
          </p>
        </article>
      </section>
    </div>
  );
}
