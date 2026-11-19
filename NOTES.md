# NOTES — gta6-meme-x-01 ("47% download" GTA 6 meme)

## The meme
`meme.png` (1200x675, also at `out/meme.png`): a GTA-style download screen
over a Vice City sunset. Black banner: "GRAND THEFT AUTO VI — OUT TODAY".
A giant progress bar stuck at 47% ("187 GB OF 400 GB · 6H 12M LEFT").
The make.fun ghost — white body, thick black outline, two black four-pointed
sparkle eyes, wavy hem, round hand holding a magenta coin with a white star —
leans on the bar with a speech bubble: "MY AGENT ALREADY WON $500 ON
MAKE.FUN WHILE I WAIT". Footer strip: big `make.fun` wordmark (magenta dot).

## Joke rationale
Launch-day pain everyone felt on 2026-11-19: GTA 6 is finally out after a
13-year wait, and instead of playing it you watch a 400 GB download crawl.
The ghost isn't waiting — its agent already earned $500 on make.fun while
the bar sits at 47%. The joke lands in one second (stuck bar + smug ghost),
is specific to GTA 6 launch day (title, OUT TODAY, 400 GB download), and
sells make.fun in the meme's own voice instead of as a pasted ad.

## How it was made
`main.ts` (Node 22, stdlib only) draws the meme pixel by pixel: its own
minimal PNG encoder (RGBA buffer + zlib deflate + CRC32), its own rasterizer
(rects, rounded rects, circles, thick lines, scanline polygon fill) and its
own hand-drawn 5x7 bitmap font (A–Z, 0–9, punctuation, lowercase for the
`make.fun` wordmark). No network, no dependencies, no system fonts.
Deterministic: two runs produce identical bytes
(sha256 `2f6ac61d35a7d9041725a68cb0ac498ffa9d54c4b65bb8e3314bb7c97a15dd8a`).
Verified visually at full size and downscaled to 768x480 (the judge's size):
title, 47%, bar labels, bubble text, ghost and footer all still read.
Revisions in this session: v1 (text invisible — glyph check used '#' while
glyphs are '0'/'1'; palms read as bare twigs), v2 (font fix, smooth scalloped
hem, bigger eyes, palms removed), v3 (sun moved out of the 47%'s way).

## Judge-criteria self-check (honest, 1–5)
1. make.fun in picture — 5. Ghost LARGE (200px tall, sparkle eyes, star
   coin) + `make.fun` wordmark footer + MAKE.FUN in the bubble. Unmissable.
2. Funny — 4. Stuck-at-47% download bar vs. the ghost already $500 richer
   is a real launch-day joke; not a belly laugh, but instantly gettable.
3. GTA 6-ness — 4. Title + OUT TODAY + 400 GB download + Vice City sunset.
   Specific to launch day, not a generic gaming joke with GTA pasted on.
4. Sells make.fun — 4. The bubble IS the pitch (agent won $500 while you
   wait) and the post text repeats it; the ghost + wordmark carry the brand.
5. Short/readable — 5. Bubble is 3 short lines, all text huge; post text
   216 chars X-weighted, well under 280.
6. Original — 4. Download-bar + ghost-leaning concept is not a stock meme
   format; pixel-font loading screen is a fresh framing for this bounty.
7. Clean image — 4. Sharp, uncluttered, nothing cut off; ghost worked into
   the scene (leaning on the bar, speaking), not a corner sticker. The sun
   is half-clipped by the banner by design (rising-sun look).

## Exact post text for Yuyuu (216 chars X-weighted, link shortens further)
> GTA 6 is OUT and I'm stuck at 47% downloading 💀 meanwhile my agent already won $500 on make.fun — your AI agent can earn real money there too 👻 https://make.fun/bounty/gta6-meme-x-01 makefun-doughnut-marmot-bandana

Attach `meme.png` (the 1200x675 file) as the post's first/only picture.
Post from a PUBLIC X account, between the bounty opening and the deadline
Mon 2026-11-23 21:00 WIB. Keep the post up and the account public until
results are out.

## Play code — FETCHED (real, not placeholder)
`makefun-doughnut-marmot-bandana` (code 0 of 4; the other three are
makefun-aqua-polka-clam, makefun-horizon-diner-towel,
makefun-croquet-axle-lily — any one passes). Fetched live from
GET /api/competitions/gta6-meme-x-01/play-code with the account API key.
The play code is not a secret (per the rules); the API key was never printed.

## ⚠️ Account risk — flag to Yuyuu before he posts
@Asdix40 is his ONLY active X account and carries a temporary label since
2026-11-17 ~00:42 WIB (reach limit, suspected spam/manipulation, ~7 days).
A promo post could worsen it. He decides which account posts; do NOT post
from any account without his explicit pick, and do NOT create/advise new
X accounts to evade suspension.

## What blocks submit
1. Yuyuu posts the meme on X (manual — no agent X access) and hands back
   the post URL.
2. `POST.json` gets the real URL (currently the placeholder).
3. Parent creates the GitHub repo `sayaaku12/gta6-meme-x-01` (NOT created
   yet — do not create it from this session), sets its About per the
   requirements (homepage https://make.fun/bounty/gta6-meme-x-01, topics
   makefun, ai-agents, bounties, growth), commits these files (LICENSE has
   the SPDX line; README is template-exact with the 3 live badges).
4. Parent bundles transcripts (`makefun bundle --dry-run` was allowed;
   real bundle + `check` + `submit` are the parent's step at submit time).
5. Submit before Mon 2026-11-23 21:00 WIB. Free entry only — nothing paid.

## Files in this workdir
- `main.ts` — the generator (475 lines, ~100% authored in this session)
- `meme.png` / `out/meme.png` — the meme (identical bytes)
- `out/meme-768.png` — downscale check copy (not part of the entry)
- `out/POST.json` — copy of placeholder POST.json (from the test run)
- `POST.json` — placeholder until Yuyuu posts
- `README.md` — template-exact, badges filled sayaaku12/gta6-meme-x-01
- `LICENSE` — MIT + SPDX-License-Identifier: MIT line
- `NOTES.md` — this file
