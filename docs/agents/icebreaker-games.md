# Ice Breaker Games

A new ice breaker game is accepted only if it meets the rules below. They are the ones the Air Hockey game was built to ([air-hockey](https://github.com/korial29/air-hockey)): a retro opens on any laptop or phone, often on a shaky connection, and a game must not make the app heavier for everyone.

Read this file before proposing or building a game.

## Size

| Rule | Limit | Air Hockey today |
| --- | --- | --- |
| Main bundle growth (registry entry, component, adapter) | ≤ 2 KB gzip | +1.5 KB |
| The game's own chunk, its dependencies included | ≤ 20 KB gzip | 18.0 KB |

- **Load the game on demand**: `import('…')` when the game starts (step `play`), never a static import of the game code. The lobby, the wheel and the other phases must not download it.
- **No new runtime dependency** other than the game itself, and no game engine or library (Phaser, Pixi, three.js, physics engines…).
- **No assets**: no images, fonts, audio or video. Draw with Canvas 2D, SVG, CSS or emoji.
- No WebAssembly or Workers for game logic: an ice breaker is a few shapes.

Measure after `npm run build`:

```bash
for f in dist/assets/*.js; do echo "$f $(gzip -9 -c "$f" | wc -c)"; done
```

Compare with the same command on `main`: the main chunk may grow by 2 KB at most, the new chunk must stay under 20 KB.

## Performance

- **60 fps** on a laptop with 16 players. Paint what does not move once (offscreen canvas), animate only what does.
- **Never write the session per frame.** `mutateSession` is a database transaction: it only records steps (lobby, play, done). Live game state stays in memory on the server.
- **Real-time games**: the server is authoritative, at a fixed step. A client sends its input only, the server answers with snapshots.
  - Binary frames when they go out more than once a second, at most 60 Hz.
  - Snapshots go out with `socket.volatile.emit`: the next one replaces a lost one.
  - Cap what a client may send (Air Hockey: 1 KB per frame) and drop the rest.
  - Turn-based games keep using the session state and the existing `icebreaker:*` events.
- **One game per session, in this process** (see `server/utils/airHockey.js`): stop it when its last player leaves. Several app instances would need sticky routing by session id.

## Integration

- Go through Retro's Socket.io connection and `authorizeActor`: no second WebSocket server, no port of its own.
- The server sets the player names from the session, never from the client.
- Isolate the game's styles (Shadow DOM or scoped classes): nothing global.
- **Phones**: playable with a thumb (controls at least 44 px), text at least 12 px, and a hint when the game needs landscape.
- Register the game on both sides: `server/utils/iceBreaker.js` and `src/icebreaker/games.ts`.

## Tests

- Server: the game's host or state helpers (join, leave, payload caps, name from the session).
- Client: the lobby does not load the game; the game loads at `play` and is destroyed on leave.
