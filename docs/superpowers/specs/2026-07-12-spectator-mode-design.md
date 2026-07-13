# Spectator Mode — Design Doc

## Summary

Add a spectator role to planning poker rooms. Spectators see all room state but cannot vote. They can still trigger Reveal and Reset.

## Join Flow

- The `JoinGate` screen gets a "Join as spectator" checkbox below the name input
- When checked, the button label changes to "Watch room" (vs "Join room")
- The spectator flag is sent as `spectator=true` in the WebSocket connection URL query string, alongside `name`, `clientId`, and `deck`

## Server (Durable Object)

- `RoomUser` type gains `isSpectator: boolean`
- WebSocket URL parses `spectator` query param and passes it to `attachClient` which sets `user.isSpectator`
- On `vote` messages: if `user.isSpectator`, the server returns an error ("Spectators cannot vote")
- Reveal/Reset messages are unrestricted — spectators can trigger them
- `broadcastState` includes `isSpectator` per user in the payload
- Existing in-flight connections without `isSpectator` implicitly default to `false`
- A spectator's `vote` is always `null` and `hasVoted` is always `false`
- `SocketAttachment` (persisted per WebSocket for hibernation rebuild) adds `isSpectator: boolean` so `hydrateRoom` correctly restores the spectator flag after hibernation

## Client UI

### JoinGate
- New checkbox: "Join as spectator" below the name field
- Checked state toggles join button text between "Join room" and "Watch room"

### RoomView
- Voting grid is hidden for spectators, replaced with a badge/message: "Watching — you can reveal or reset when ready"
- Reveal and Reset buttons remain visible and functional for spectators
- Participant rows show a "Spectator" label instead of "You" / "Participant"
- Spectator cards show a 👁️ icon or similar visual instead of a vote slot
- Average score, unanimous detection, emoji throws, and celebration bursts work the same for everyone

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `isSpectator` to `RoomUser`, add `SpectatorState` to `ConnectionState` if needed |
| `src/lib/room.ts` | Expose `spectator` param in `getSocketUrl` |
| `src/components/JoinGate.tsx` | Add checkbox, conditional button text |
| `src/context/RoomSessionContext.tsx` | Pass spectator flag, filter vote ability |
| `src/components/RoomView.tsx` | Hide vote grid for spectators, show spectator badge |
| `src/hooks/useRoomSocket.ts` | Pass spectator flag in connection params |
| `worker/src/index.ts` | Parse `spectator` param, enforce vote block, broadcast `isSpectator` in state |

## Test Coverage

- JoinGate renders checkbox and toggles button text
- Server rejects vote from spectator with error message
- Spectator sees badge instead of vote grid
- Spectator can still trigger reveal/reset
- `broadcastState` includes `isSpectator`
