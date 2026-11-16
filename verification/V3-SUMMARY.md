# SALTLINE v3 verification

Session: 01a1e484-50fc-7b52-b7f3-ed96f1434f24.
Anchor: 236c238f98c6cc2a9f8e6f5c2b0021052e2f373b, round 34005625.

All 14 game source files and main.ts were written afresh and improved with whole-file writes. Source: 62,531 bytes; main.ts: 909 bytes; total 63,440 bytes. A 195-byte local SVG icon prevents the browser favicon 404. No formatter or partial file edits were used.

| Written file | Bytes |
|---|---:|
| game/index.html | 8794 |
| game/src/audio.js | 2240 |
| game/src/bots.js | 6835 |
| game/src/effects.js | 3358 |
| game/src/hud.js | 5481 |
| game/src/input.js | 1947 |
| game/src/main.js | 6156 |
| game/src/map.js | 9027 |
| game/src/palette.js | 537 |
| game/src/player.js | 2269 |
| game/src/rounds.js | 5531 |
| game/src/state.js | 3141 |
| game/src/utils.js | 581 |
| game/src/weapons.js | 6634 |
| main.ts | 909 |

- playtest.cjs: 39/39, six complete rounds, match 1–5, zero stuck violations, replay passed, zero browser errors.
- ui-smoke.cjs: all eight flags true, zero browser errors.
- audit.mjs: 12/12, vendored three.js byte-identical, no source cut note.
- Dossier: 327,848 bytes; repeated builds byte-identical (sha256 and cmp).
- Full kit check: 13 passed, 0 failed, 6 skipped, 5 server-only checks.
- thinking_reproduces: 389/941 (41.3%), all authored, zero pasted; main.ts 14 authored lines.
- thinking_revised: main.ts final content derives from two writes.

Screenshots are actual game renders, JPEG 1280×720:

| File | Bytes | SHA-256 |
|---|---:|---|
| 1-cover.jpg | 54833 | 9b48a95307cfffc6d262513bb99d84f7d03be5d8800169aed7f1f8a4c6485785 |
| 2-causeway.jpg | 49113 | 88a25059aea1a28e8a30ad76b1b9c2f227ee7ff357a821edfc9c681cc0e0ab2b |
| 3-crusher.jpg | 49443 | bb1d8d732b83d03a88f8a9fafd8e69b8fb786d69014104b473c0724e3f6e4eed |
| 4-round-end.jpg | 43686 | 661a74ab878205626e7f9b165a28a151061880bfda7e4f4c168ecef25bcffa6a |

Executable-test compatibility takes precedence at four conflicting edges: fired supports buy-phase range checks; equip preserves per-gun ammunition unless explicitly refilled; site ids are numeric; consumed grenade inventory is 0. Normal player fire still requires live phase. Rendering is coalesced to browser frames while simulation remains fixed at 60 Hz; render() draws immediately. Static architecture is instanced and its shadow map cached for software-renderer performance. Bot cover behavior is a simple retreat, rather than a richer cover scoring system. No weapons, rounds, economy, objective or controls were cut.

No push, repository creation or submission was performed. Parent handles publication.
