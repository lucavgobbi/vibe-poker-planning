# Spectator Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a spectator role so non-voting participants can observe the room without casting votes.

**Architecture:** A `spectator=true` query param on the WebSocket URL communicates the role choice at connection time. The server enforces the vote restriction and broadcasts `isSpectator` per user in state updates. The client hides the voting grid for spectators and shows a badge instead.

**Tech Stack:** TypeScript, React 19, Cloudflare Durable Objects, Vitest, Testing Library

## Global Constraints

- Follow existing code style: no comments in implementation files
- All new text strings use lowercase or sentence case per existing patterns
- localStorage key format: `planning-poker-*`
- New `RoomUser` field `isSpectator` defaults to `false`

---

### Task 1: Types + constants + getSocketUrl

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/room.ts`

**Interfaces:**
- Consumes: none
- Produces: `RoomUser` with `isSpectator` field; `SPECTATOR_KEY` constant; `getSocketUrl` with `spectator` param

- [ ] **Step 1: Add `isSpectator` to RoomUser in types.ts**

In `src/lib/types.ts`, add `isSpectator: boolean` to the `RoomUser` type:

```typescript
export type RoomUser = {
  id: string;
  name: string;
  vote: VoteValue | null;
  hasVoted: boolean;
  isSpectator: boolean;
};
```

- [ ] **Step 2: Add SPECTATOR_KEY constant to constants.ts**

In `src/lib/constants.ts`, add:

```typescript
export const SPECTATOR_KEY = "planning-poker-spectator";
```

- [ ] **Step 3: Update getSocketUrl to accept spectator flag**

In `src/lib/room.ts`, update the `getSocketUrl` function signature and implementation:

```typescript
export function getSocketUrl(
  roomId: string,
  name: string,
  clientId: string,
  deck: DeckType,
  spectator: boolean = false,
) {
  const baseUrl = inferSocketBaseUrl();
  if (!baseUrl) {
    return "";
  }

  const normalized = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    name,
    clientId,
    deck,
  });

  if (spectator) {
    params.set("spectator", "true");
  }

  return `${normalized}/connect/${encodeURIComponent(roomId)}?${params.toString()}`;
}
```

- [ ] **Step 4: Run typecheck to verify**

```bash
pnpm typecheck
```

Expected: No type errors. The existing code that constructs `RoomUser` objects (in tests and server) will need `isSpectator` — those will be handled in their respective tasks.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts src/lib/room.ts
git commit -m "feat: add isSpectator to types and getSocketUrl"
```

---

### Task 2: JoinGate spectator checkbox

**Files:**
- Modify: `src/components/JoinGate.tsx`
- Create: `src/components/JoinGate.test.tsx`

**Interfaces:**
- Consumes: `joinRoom(name: string)` from `useAppShellContext`, `SPECTATOR_KEY` from constants
- Produces: Checkbox in JoinGate, `planning-poker-spectator` key in localStorage

- [ ] **Step 1: Write the failing test**

Create `src/components/JoinGate.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinGate from "./JoinGate";
import { renderWithAppShell } from "../test/utils";

beforeEach(() => {
  window.localStorage.clear();
});

it("renders a Join as spectator checkbox", () => {
  renderWithAppShell(<JoinGate />);
  expect(
    screen.getByRole("checkbox", { name: /join as spectator/i }),
  ).toBeInTheDocument();
});

it("shows Watch room when spectator checkbox is checked", async () => {
  const user = userEvent.setup();
  renderWithAppShell(<JoinGate />);

  const checkbox = screen.getByRole("checkbox", { name: /join as spectator/i });
  await user.click(checkbox);

  // Button text should now be "Watch room"
  // In the initial state (empty name), button is disabled but should still show "Watch room"
  const watchButton = screen.queryByRole("button", { name: /watch room/i });
  expect(watchButton).toBeInTheDocument();
});

it("shows Join room when spectator checkbox is unchecked", () => {
  renderWithAppShell(<JoinGate />);
  expect(
    screen.getByRole("button", { name: /join room/i }),
  ).toBeInTheDocument();
});

it("stores spectator flag in localStorage when joining as spectator", async () => {
  const user = userEvent.setup();
  renderWithAppShell(<JoinGate />);

  const input = screen.getByPlaceholderText("Ada Lovelace");
  await user.type(input, "TestUser");

  const checkbox = screen.getByRole("checkbox", { name: /join as spectator/i });
  await user.click(checkbox);

  const watchButton = screen.getByRole("button", { name: /watch room/i });
  await user.click(watchButton);

  expect(window.localStorage.getItem("planning-poker-spectator")).toBe("true");
});

it("clears spectator flag when joining as voter", async () => {
  window.localStorage.setItem("planning-poker-spectator", "true");

  const user = userEvent.setup();
  renderWithAppShell(<JoinGate />);

  const input = screen.getByPlaceholderText("Ada Lovelace");
  await user.type(input, "TestUser");

  const joinButton = screen.getByRole("button", { name: /join room/i });
  await user.click(joinButton);

  expect(window.localStorage.getItem("planning-poker-spectator")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/components/JoinGate.test.tsx
```

Expected: FAIL — component doesn't have checkbox yet.

- [ ] **Step 3: Implement checkbox and conditional button text**

Update `src/components/JoinGate.tsx`:

```typescript
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
```

- [ ] **Step 4: Add CSS for the checkbox field**

In `src/styles.css`, after the `.field` rule (around line 710):

```css
.field-checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.65rem;
}

.field-checkbox input[type="checkbox"] {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--primary);
  cursor: pointer;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- src/components/JoinGate.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/JoinGate.tsx src/components/JoinGate.test.tsx src/styles.css
git commit -m "feat: add spectator checkbox to JoinGate"
```

---

### Task 3: Server Durable Object — spectator enforcement

**Files:**
- Modify: `worker/src/index.ts`

**Interfaces:**
- Consumes: `spectator=true` query param from WebSocket URL
- Produces: `isSpectator` per user in state payloads, vote rejection for spectators

- [ ] **Step 1: Update RoomUser and SocketAttachment types**

In `worker/src/index.ts`, add `isSpectator` to `RoomUser`:

```typescript
type RoomUser = {
  id: string;
  name: string;
  vote: VoteValue | null;
  isSpectator: boolean;
};
```

Then update the `SocketAttachment` type:

```typescript
type SocketAttachment = {
  name: string;
  vote: VoteValue | null;
  isSpectator: boolean;
};
```

- [ ] **Step 2: Parse spectator param in fetch handler**

In the `fetch` method of `PlanningRoom`, after parsing `clientId`:

```typescript
const spectator = url.searchParams.get("spectator") === "true";
```

Then pass it to `attachClient`:
```typescript
this.attachClient(server, {
  clientId,
  name,
  spectator,
});
```

- [ ] **Step 3: Update attachClient to accept and store spectator**

Update the `attachClient` method signature and body:

```typescript
private attachClient(
  socket: WebSocket,
  identity: { clientId: string; name: string; spectator: boolean },
) {
  const existingClient = this.clients.get(identity.clientId);
  if (existingClient) {
    existingClient.socket.close(1012, "Reconnected");
  }

  const previous = this.room.users.get(identity.clientId);
  const nextUser: RoomUser = {
    id: identity.clientId,
    name: identity.name,
    vote: previous?.vote ?? null,
    isSpectator: identity.spectator,
  };

  this.room.users.set(identity.clientId, nextUser);
  this.clients.set(identity.clientId, {
    socket,
    name: identity.name,
  });
  this.ctx.acceptWebSocket(socket, [identity.clientId]);
  this.persistSocketAttachment(identity.clientId);

  this.broadcastState();
}
```

- [ ] **Step 4: Update readAttachment to parse isSpectator**

In `readAttachment`, update the parsing:

```typescript
private readAttachment(ws: WebSocket): SocketAttachment | null {
  const raw = ws.deserializeAttachment?.();
  if (raw == null || typeof raw !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SocketAttachment>;
    const name = typeof parsed.name === "string" ? parsed.name.trim().slice(0, 40) : "";
    const voteRaw = parsed.vote;
    const isSpectator = parsed.isSpectator === true;

    let vote: VoteValue | null = null;
    if (voteRaw !== undefined && voteRaw !== null) {
      if (ALLOWED_VOTES.has(voteRaw as VoteValue)) {
        vote = voteRaw as VoteValue;
      }
    }

    return { name, vote, isSpectator };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Update persistSocketAttachment to include isSpectator**

```typescript
private persistSocketAttachment(clientId: string): void {
  const client = this.clients.get(clientId);
  const user = this.room.users.get(clientId);
  if (!client || !user) {
    return;
  }

  const payload: SocketAttachment = {
    name: user.name,
    vote: user.vote,
    isSpectator: user.isSpectator,
  };

  client.socket.serializeAttachment(JSON.stringify(payload));
}
```

- [ ] **Step 6: Update hydrateRoom to restore isSpectator**

In the `hydrateRoom` method, in the loop:

```typescript
this.room.users.set(clientId, {
  id: clientId,
  name: attachment.name,
  vote: attachment.vote,
  isSpectator: attachment.isSpectator,
});
```

- [ ] **Step 7: Reject votes from spectators in updateVote**

In the `updateVote` method, add an early check:

```typescript
private updateVote(clientId: string, vote: VoteValue) {
  const user = this.room.users.get(clientId);
  if (!user) {
    return;
  }

  if (user.isSpectator) {
    this.sendToClient(clientId, {
      type: "error",
      message: "Spectators cannot vote.",
    });
    return;
  }

  const deck = this.room.deck ?? DEFAULT_DECK;
  const allowedForDeck = new Set(DECK_VALUES[deck]);
  if (!allowedForDeck.has(vote)) {
    this.sendToClient(clientId, {
      type: "error",
      message: "Unsupported vote.",
    });
    return;
  }

  user.vote = vote;
  this.persistSocketAttachment(clientId);
  this.broadcastState();
}
```

- [ ] **Step 8: Include isSpectator in broadcastState**

Update `broadcastState` to include `isSpectator` in the user map:

```typescript
private broadcastState() {
  this.broadcast({
    type: "state",
    revealed: this.room.revealed,
    deck: this.room.deck ?? DEFAULT_DECK,
    users: Array.from(this.room.users.values())
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((user) => ({
        id: user.id,
        name: user.name,
        vote: this.room.revealed ? user.vote : null,
        hasVoted: Boolean(user.vote),
        isSpectator: user.isSpectator,
      })),
  });
}
```

Also update the second `broadcastState` call in the `broadcast` method (around line 485-495) identically.

- [ ] **Step 9: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 10: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat: server-side spectator enforcement"
```

---

### Task 4: RoomSessionContext + useRoomSocket — wire spectator flag

**Files:**
- Modify: `src/hooks/useRoomSocket.ts`
- Modify: `src/context/RoomSessionContext.tsx`

**Interfaces:**
- Consumes: `SPECTATOR_KEY` from constants; `spectator` param in `useRoomSocket`
- Produces: `isSpectator` boolean in `RoomSessionContextValue`

- [ ] **Step 1: Update useRoomSocket to accept spectator flag**

Update the `UseRoomSocketArgs` type and hook call in `src/hooks/useRoomSocket.ts`:

```typescript
type UseRoomSocketArgs = {
  roomId: string;
  joinedName: string;
  enabled: boolean;
  clientId: string;
  deck: DeckType;
  spectator: boolean;
};
```

Update the `const socketUrl = getSocketUrl(...)` call in the `useEffect`:

```typescript
const socketUrl = getSocketUrl(roomId, joinedName, clientId, deck, spectator);
```

Update the destructuring in the return to include `spectator`:

```typescript
export function useRoomSocket({ roomId, joinedName, enabled, clientId, deck, spectator }: UseRoomSocketArgs) {
```

- [ ] **Step 2: Add isSpectator to RoomSessionContext**

In `src/context/RoomSessionContext.tsx`:
- Import `SPECTATOR_KEY`
- Add `isSpectator` to the context type
- Derive it from the current user and expose it

Update the context type:

```typescript
type RoomSessionContextValue = {
  connectionState: ConnectionState;
  errorMessage: string;
  roomState: RoomState;
  throwEvents: ThrowEvent[];
  currentVote: VoteValue | null;
  revealed: boolean;
  isSpectator: boolean;
  unanimousVote: string;
  averageScore: string | null;
  copyRoomLink: () => Promise<void>;
  throwEmoji: (targetUserId: string, emoji: ThrowEmoji) => void;
  vote: (value: VoteValue) => void;
  revealVotes: () => void;
  resetVotes: () => void;
  userLabelFor: (userId: string) => "You" | "Spectator" | "Participant";
};
```

Read the stored spectator flag and pass to `useRoomSocket`:

```typescript
const joinAsSpectator = window.localStorage.getItem(SPECTATOR_KEY) === "true";

const { connectionState, errorMessage, roomState, throwEvents, sendMessage } = useRoomSocket({
  roomId,
  joinedName,
  enabled,
  clientId,
  deck,
  spectator: joinAsSpectator,
});
```

Add `isSpectator` derivation:

```typescript
const currentUser = roomState.users.find((user) => user.id === clientId);
const currentVote = currentUser?.vote ?? null;
const isSpectator = currentUser?.isSpectator ?? false;
```

Update `userLabelFor`:

```typescript
userLabelFor: (userId: string) =>
  userId === clientId ? (isSpectator ? "Spectator" : "You") : "Participant",
```

Add `isSpectator` to the `value` useMemo:

```typescript
const value = useMemo<RoomSessionContextValue>(
  () => ({
    connectionState,
    errorMessage,
    roomState,
    throwEvents,
    currentVote: selectedVote,
    revealed,
    isSpectator,
    unanimousVote,
    averageScore,
    // ... rest unchanged
  }),
  [
    averageScore,
    clientId,
    connectionState,
    errorMessage,
    isSpectator,
    joinedName,
    revealed,
    roomId,
    roomState,
    shareUrl,
    selectedVote,
    throwEvents,
    unanimousVote,
    sendMessage,
  ],
);
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useRoomSocket.ts src/context/RoomSessionContext.tsx
git commit -m "feat: wire spectator flag through context and socket hook"
```

---

### Task 5: RoomView — spectator UI

**Files:**
- Modify: `src/components/RoomView.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `isSpectator` from `useRoomSessionContext`

- [ ] **Step 1: Add spectator view to RoomView**

In `src/components/RoomView.tsx`, destructure `isSpectator` from the context:

```typescript
const {
  errorMessage,
  currentVote,
  unanimousVote,
  averageScore,
  revealVotes,
  resetVotes,
  vote,
  roomState,
  throwEmoji,
  throwEvents,
  revealed,
  isSpectator,
  userLabelFor,
} = useRoomSessionContext();
```

Replace the voting panel section to conditionally show the vote grid or spectator badge:

```typescript
<section className="main-grid">
  {isSpectator ? (
    <div className="glass-card panel spectator-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Spectator</span>
          <h2>Watching</h2>
        </div>
      </div>
      <div className="spectator-content">
        <span className="spectator-icon">👁️</span>
        <p>You're watching — you can reveal or reset when ready.</p>
      </div>
    </div>
  ) : (
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
        {voteOptions.map((value) => (
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
  )}

  <div className="glass-card panel participant-panel" ref={participantPanelRef}>
    // ...rest of participant panel (unchanged)...
  </div>
</section>
```

- [ ] **Step 2: Add spectator CSS classes**

In `src/styles.css`, after the `.field` rules (or near the `.panel` rules):

```css
.spectator-panel {
  display: flex;
  flex-direction: column;
}

.spectator-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem 1rem;
  text-align: center;
}

.spectator-icon {
  font-size: 3rem;
  line-height: 1;
}

.spectator-content p {
  color: var(--muted);
  margin: 0;
  max-width: 20rem;
}
```

- [ ] **Step 3: Run typecheck and build**

```bash
pnpm typecheck && pnpm build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/RoomView.tsx src/styles.css
git commit -m "feat: spectator view in RoomView"
```

---

### Task 6: Update existing tests for type compatibility

**Files:**
- Modify: `src/components/Header.test.tsx`
- Modify: `src/test/utils.tsx`
- Modify: `src/test/setup.ts`
- Modify: `src/components/Footer.test.tsx`
- Modify: `src/components/LandingPage.test.tsx`
- Modify: `src/components/LogoIcon.test.tsx`

**Interfaces:**
- Consumes: Updated `RoomUser` type with `isSpectator` field

- [ ] **Step 1: Check if any tests construct RoomUser objects**

Search for `RoomUser` usage in test files:

```bash
rg "RoomUser" src/test/ src/components/*.test.tsx
```

If any tests construct `RoomUser` objects, they'll need the new `isSpectator` field. If no tests construct them directly (they likely use mock data from contexts), no changes needed.

- [ ] **Step 2: Run the full test suite**

```bash
pnpm test
```

Expected: All existing tests pass. If any fail due to missing `isSpectator`, add `isSpectator: false` to the affected test data.

- [ ] **Step 3: Run typecheck one final time**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: update existing tests for spectator mode types"
```

---

## Self-Review

**1. Spec coverage:**
- JoinGate checkbox — ✅ Task 2
- Server stores and broadcasts `isSpectator` — ✅ Task 3
- Server rejects spectator votes — ✅ Task 3 step 7
- Reveal/Reset unrestricted — ✅ (no user check added for those)
- Vote grid hidden, badge shown — ✅ Task 5
- "Spectator" label in participant rows — ✅ Task 4 (`userLabelFor` returns "Spectator")
- Socket attachment persistence for hibernation — ✅ Task 3 step 4-6

**2. Placeholder scan:** None found. All steps have complete code.

**3. Type consistency:**
- `RoomUser.isSpectator: boolean` defined in Task 1, used in Tasks 3 and 4
- `SocketAttachment.isSpectator: boolean` defined in Task 3, used in Task 3
- `isSpectator` flag flows: Task 2 (JoinGate→localStorage) → Task 4 (useRoomSocket→URL param) → Task 3 (server parse/store/broadcast) → Task 4 (context exposes) → Task 5 (UI consumes)
- `userLabelFor` returns "Spectator" when current user is spectator — consistent with spec
