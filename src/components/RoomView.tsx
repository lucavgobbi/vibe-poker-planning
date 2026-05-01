import type { CSSProperties } from "react";
import { useAppShellContext } from "../context/AppShellContext";
import { useRoomSessionContext } from "../context/RoomSessionContext";
import { useRoomPresentation } from "../hooks/useRoomPresentation";
import { THROW_EMOJIS, VOTE_OPTIONS } from "../lib/constants";

export default function RoomView() {
  const { roomId, leaveRoom } = useAppShellContext();
  const {
    errorMessage,
    currentVote,
    unanimousVote,
    averageScore,
    copyRoomLink,
    revealVotes,
    resetVotes,
    vote,
    roomState,
    throwEmoji,
    throwEvents,
    revealed,
    userLabelFor,
  } = useRoomSessionContext();
  const { celebrationBursts, participantPanelRef, activeThrows, setParticipantNameRef } =
    useRoomPresentation({
      throwEvents,
      revealed,
      unanimousVote,
    });

  return (
    <>
      {celebrationBursts.length > 0 ? (
        <div className="celebration-layer" aria-hidden="true">
          {celebrationBursts.map((particle) => (
            <span
              key={particle.id}
              className="celebration-burst"
              style={{
                "--burst-left": `${particle.left}%`,
                "--burst-delay": `${particle.delay}ms`,
                "--burst-duration": `${particle.duration}ms`,
                "--burst-rotation": `${particle.rotation}deg`,
                "--burst-drift": `${particle.drift}px`,
                "--burst-color": particle.color,
              } as CSSProperties}
            />
          ))}
        </div>
      ) : null}
      <main className="room-layout">
        <section className="room-hero glass-card">
          <div>
            <span className="eyebrow">{roomId}</span>
            <h1>Vibe Planning Poker</h1>
            <p>
              Share the link, have everyone vote, then reveal when the table is ready.
            </p>
          </div>
          <div className="hero-meta">
            <button className="secondary-button" type="button" onClick={copyRoomLink}>
              Copy room URL
            </button>
            <button className="ghost-button" type="button" onClick={leaveRoom}>
              Change name
            </button>
          </div>
          {errorMessage ? (
            <p className="room-error">Connection issue: {errorMessage}</p>
          ) : null}
        </section>

        <section className="main-grid">
          <div className="glass-card panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Voting</span>
                <h2>Pick a card</h2>
              </div>
              <div className="panel-actions">
                <button className="secondary-button" type="button" onClick={revealVotes}>
                  Reveal
                </button>
                <button className="ghost-button" type="button" onClick={resetVotes}>
                  Reset
                </button>
              </div>
            </div>
            <div className="vote-grid">
              {VOTE_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`vote-card ${currentVote === value ? "selected" : ""}`}
                  onClick={() => vote(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card panel participant-panel" ref={participantPanelRef}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Participants</span>
                <h2>Room table</h2>
              </div>
              <div className="panel-summary">
                {averageScore ? (
                  <p className="panel-note">
                    Average: <strong>{averageScore}</strong>
                  </p>
                ) : (
                  <p className="panel-note">
                    {currentVote ? `Your card: ${currentVote}` : "Pick a card to vote."}
                  </p>
                )}
                {unanimousVote ? (
                  <p className="panel-note panel-note-celebration">
                    Consensus: <strong>{unanimousVote}</strong>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="emoji-throw-layer" aria-hidden="true">
              {activeThrows.map((event) => (
                <span
                  key={event.id}
                  className="emoji-throw"
                  style={{
                    "--throw-start-x": `${event.startX}px`,
                    "--throw-start-y": `${event.startY}px`,
                    "--throw-mid-x": `${event.midX}px`,
                    "--throw-mid-y": `${event.midY}px`,
                    "--throw-end-x": `${event.endX}px`,
                    "--throw-end-y": `${event.endY}px`,
                  } as CSSProperties}
                  title={`${event.fromUserName} threw ${event.emoji} at ${event.targetUserName}`}
                >
                  {event.emoji}
                </span>
              ))}
            </div>
            <div className="participant-list">
              {roomState.users.map((user) => (
                <article className="participant-row" key={user.id}>
                  <div className="participant-meta">
                    <button
                      className="participant-name"
                      type="button"
                      ref={(node) => setParticipantNameRef(user.id, node)}
                      aria-label={`Throw an emoji at ${user.name}`}
                    >
                      <strong>{user.name}</strong>
                    </button>
                    <p>{userLabelFor(user.id)}</p>
                    <div className="emoji-tooltip" role="tooltip">
                      <span className="emoji-tooltip-label">Throw at {user.name}</span>
                      <div className="emoji-picker">
                        {THROW_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            className="emoji-option"
                            type="button"
                            onClick={() => throwEmoji(user.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={`participant-card ${user.hasVoted ? "voted" : ""}`}>
                    <div className={`participant-card-inner ${revealed ? "revealed" : ""}`}>
                      <span className="participant-card-face participant-card-front">
                        {user.hasVoted ? "✓" : "•"}
                      </span>
                      <span className="participant-card-face participant-card-back">
                        {user.vote || "—"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
              {roomState.users.length === 0 ? (
                <p className="empty-state">Waiting for the first connection...</p>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
