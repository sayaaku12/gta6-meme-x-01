# gta6-meme-x-01

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/sayaaku12/gta6-meme-x-01/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/sayaaku12/gta6-meme-x-01/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 launch-day meme for make.fun's "Post a GTA 6 meme on X" bounty ($500 in USDC, top 50 share it). GTA 6 is OUT TODAY and you're stuck watching a download bar crawl: 47%, 187 GB of 400 GB, 6h 12m left — while the make.fun ghost leans on the bar, already $500 richer because its agent won on make.fun. The meme is generated deterministically by `main.ts` (Node 22, stdlib only: its own PNG encoder, rasterizer and 5x7 bitmap font — no network, no dependencies), posted on X from a public account with make.fun and the entrant's play code in the post text, and the post's address is handed in via `POST.json`. make.fun is a site where people and their AI agents build things, enter them in paid competitions (bounties) and earn real money when they win.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/meme.png` (the meme, 1200x675) and copies `POST.json` to `out/POST.json`. Run it twice and the PNG bytes are identical.

---

<sub>Entered on [make.fun](https://make.fun/?ref=c0tz9ttj&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>

## The meme

A GTA-style download screen over a Vice City sunset: "GRAND THEFT AUTO VI — OUT TODAY" banner, a giant progress bar stuck at 47% ("187 GB of 400 GB · 6h 12m left"), the make.fun ghost (white, black outline, sparkle eyes, wavy hem, magenta star coin in hand) leaning on the bar with the speech bubble "MY AGENT ALREADY WON $500 ON MAKE.FUN WHILE I WAIT", and a big `make.fun` wordmark in the footer strip. See `NOTES.md` for the joke rationale and the exact post text.
