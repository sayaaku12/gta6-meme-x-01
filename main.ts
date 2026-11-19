// gta6-meme-x-01 — "47% download" GTA 6 launch-day meme generator.
// Node 22, stdlib only. Draws the meme pixel by pixel (own PNG encoder,
// own rasterizer, own 5x7 bitmap font), writes it to /output/meme.png and
// copies POST.json to /output/POST.json. Fully deterministic: same bytes
// on every run (no clock, no randomness, fixed zlib level).
//
// The joke: GTA 6 is OUT TODAY and you are stuck on a 47% download bar
// (187 GB of 400 GB, 6h 12m left) while the make.fun ghost leans on the
// bar, already $500 richer because its agent won on make.fun.

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------- colour helpers ----------
type RGB = [number, number, number];
function hex(h: string): RGB {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}
function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function lerpStops(stops: Array<[number, RGB]>, t: number): RGB {
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) return lerp(c0, c1, (t - t0) / (t1 - t0));
  }
  return stops[stops.length - 1][1];
}

// ---------- CRC32 (PNG chunks) ----------
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(
      raw,
      y * (1 + width * 4) + 1,
    );
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- canvas ----------
class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
    for (let i = 3; i < this.px.length; i += 4) this.px[i] = 255;
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }
  fillRect(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x++) this.set(x, y, c);
    }
  }
  vGrad(stops: Array<[number, RGB]>): void {
    for (let y = 0; y < this.h; y++) {
      const c = lerpStops(stops, y / (this.h - 1));
      for (let x = 0; x < this.w; x++) this.set(x, y, c);
    }
  }
  fillCircle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))));
      for (let x = cx - dx; x <= cx + dx; x++) this.set(x, y, c);
    }
  }
  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let rr = r - t; rr <= r; rr++) {
        this.set(Math.round(cx + rr * Math.cos(rad)), Math.round(cy + rr * Math.sin(rad)), c);
      }
    }
  }
  // Thick line: stamp circles along a Bresenham walk.
  line(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    const r = Math.max(1, Math.floor(w / 2));
    for (let guard = 0; guard < 10000; guard++) {
      this.fillCircle(x, y, r, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
  polyline(pts: Array<[number, number]>, w: number, c: RGB, closed: boolean): void {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      this.line(a[0], a[1], b[0], b[1], w, c);
    }
  }
  // Even-odd scanline fill for a simple polygon.
  fillPoly(pts: Array<[number, number]>, c: RGB): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.max(0, Math.ceil(minY)); y <= Math.min(this.h - 1, Math.floor(maxY)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(this.w - 1, Math.floor(xs[k + 1])); x++) {
          this.set(x, y, c);
        }
      }
    }
  }
  fillRoundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
    this.fillRect(x + r, y, x + w - r, y + h, c);
    this.fillRect(x, y + r, x + w, y + h - r, c);
    this.fillCircle(x + r, y + r, r, c);
    this.fillCircle(x + w - r, y + r, r, c);
    this.fillCircle(x + r, y + h - r, r, c);
    this.fillCircle(x + w - r, y + h - r, r, c);
  }
  strokeRoundRect(x: number, y: number, w: number, h: number, r: number, t: number, c: RGB): void {
    this.line(x + r, y, x + w - r, y, t, c);
    this.line(x + r, y + h, x + w - r, y + h, t, c);
    this.line(x, y + r, x, y + h - r, t, c);
    this.line(x + w, y + r, x + w, y + h - r, t, c);
    const corners: Array<[number, number, number, number]> = [
      [x + r, y + r, 180, 270],
      [x + w - r, y + r, 270, 360],
      [x + w - r, y + h - r, 0, 90],
      [x + r, y + h - r, 90, 180],
    ];
    for (const [cx, cy, a0, a1] of corners) {
      for (let a = a0; a <= a1; a += 2) {
        const rad = (a * Math.PI) / 180;
        this.fillCircle(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), Math.max(1, Math.floor(t / 2)), c);
      }
    }
  }
}

// ---------- 5x7 bitmap font ----------
// Each glyph is 7 rows of 5 cells ('#' = ink). Hand-drawn for this file.
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  // lowercase, for the make.fun wordmark
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  f: ['00110', '01000', '01110', '01000', '01000', '01000', '01000'],
  k: ['00000', '10000', '10010', '10100', '11000', '10100', '10010'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '11110', '10001', '10001', '10001', '10001'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
};
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
// Draw text; per-char colours override the default colour.
function drawText(
  cv: Canvas,
  s: string,
  x: number,
  y: number,
  scale: number,
  color: RGB,
  perChar?: Record<number, RGB>,
): void {
  let cx = x;
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]] ?? FONT[' '];
    const c = perChar?.[i] ?? color;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === '1') cv.fillRect(cx + col * scale, y + row * scale, cx + (col + 1) * scale, y + (row + 1) * scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(cv: Canvas, s: string, cx: number, y: number, scale: number, color: RGB, perChar?: Record<number, RGB>): void {
  drawText(cv, s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, color, perChar);
}
// Same text with a dark offset copy underneath, for contrast on busy art.
function drawTextShadowed(cv: Canvas, s: string, x: number, y: number, scale: number, color: RGB): void {
  drawText(cv, s, x + 3, y + 3, scale, hex('#000000'));
  drawText(cv, s, x, y, scale, color);
}

// ---------- shapes ----------
// Four-pointed sparkle (make.fun ghost eyes): 8-point star polygon.
function sparklePts(cx: number, cy: number, r: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const inner = Math.max(2, Math.round(r * 0.32));
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4 - Math.PI / 2;
    const rad = k % 2 === 0 ? r : inner;
    pts.push([Math.round(cx + rad * Math.cos(ang)), Math.round(cy + rad * Math.sin(ang))]);
  }
  return pts;
}
// Five-pointed star (the coin on the ghost's hand).
function star5Pts(cx: number, cy: number, r: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const inner = Math.round(r * 0.45);
  for (let k = 0; k < 10; k++) {
    const ang = (k * Math.PI) / 5 - Math.PI / 2;
    const rad = k % 2 === 0 ? r : inner;
    pts.push([Math.round(cx + rad * Math.cos(ang)), Math.round(cy + rad * Math.sin(ang))]);
  }
  return pts;
}

// The make.fun ghost: white body, thick black outline, two black sparkle
// eyes, wavy bottom hem, one round hand holding a magenta star coin.
// (ox, oy) = top-left of the ghost's box; w/h scale the whole ghost.
function drawGhost(cv: Canvas, ox: number, oy: number, w: number, h: number): void {
  const X = (u: number): number => Math.round(ox + (u / 220) * w);
  const Y = (v: number): number => Math.round(oy + (v / 260) * h);
  const outline: Array<[number, number]> = [];
  // Dome: sampled arc from left side over the top to the right side.
  // Centre (110, 95), radius 95, so the top of the dome is y = 0.
  for (let a = 180; a >= 0; a -= 6) {
    const rad = (a * Math.PI) / 180;
    outline.push([
      Math.round(ox + 110 + 95 * Math.cos(rad)),
      Math.round(oy + 95 - 95 * Math.sin(rad)),
    ]);
  }
  // Right side down to the hem.
  outline.push([X(205), Y(212)]);
  // Wavy hem: four smooth scallops dipping down, leftwards. Each scallop
  // is a sampled half-circle so the hem reads as waves, not zigzag teeth.
  for (let k = 0; k < 4; k++) {
    const cx = 205 - 23.75 - k * 47.5;
    for (let a = 0; a <= 180; a += 15) {
      const rad = (a * Math.PI) / 180;
      outline.push([X(Math.round(cx + 23.75 * Math.cos(rad))), Y(Math.round(212 + 32 * Math.sin(rad)))]);
    }
  }
  // Left side back up (arc points already cover the top; close the shape).
  cv.fillPoly(outline, hex('#ffffff'));
  cv.polyline(outline, Math.max(4, Math.round(w * 0.03)), hex('#000000'), true);
  // Sparkle eyes.
  const eyeR = Math.round(w * 0.09);
  cv.fillPoly(sparklePts(X(75), Y(112), eyeR), hex('#000000'));
  cv.fillPoly(sparklePts(X(145), Y(112), eyeR), hex('#000000'));
  // Round little hand on the right, holding the magenta star coin.
  const handR = Math.round(w * 0.075);
  cv.fillCircle(X(204), Y(182), handR, hex('#ffffff'));
  cv.ring(X(204), Y(182), handR, Math.max(2, Math.round(w * 0.015)), hex('#000000'));
  const coinR = Math.round(w * 0.11);
  cv.fillCircle(X(228), Y(162), coinR, hex('#ff2d78'));
  cv.ring(X(228), Y(162), coinR, Math.max(2, Math.round(w * 0.015)), hex('#000000'));
  cv.fillPoly(star5Pts(X(228), Y(162), Math.round(coinR * 0.62)), hex('#ffffff'));
}

// ---------- scene ----------
function buildMeme(): Buffer {
  const W = 1200;
  const H = 675;
  const cv = new Canvas(W, H);
  const WHITE = hex('#ffffff');
  const BLACK = hex('#000000');
  const MAGENTA = hex('#ff2d78');
  const ORANGE = hex('#ff8a3d');
  const PINK = hex('#ff5ea8');

  // Vice City dusk: deep purple sky melting into a sunset band.
  cv.vGrad([
    [0, hex('#160a2e')],
    [0.22, hex('#3d1157')],
    [0.42, hex('#8a2a6e')],
    [0.58, hex('#e0517a')],
    [0.72, hex('#ff8a3d')],
    [0.86, hex('#2a0f45')],
    [1, hex('#12081f')],
  ]);
  // Low sun + glow, centred in the gap between DOWNLOADING... and 47%.
  cv.fillCircle(700, 185, 52, hex('#ffd97a'));
  cv.ring(700, 185, 60, 4, hex('#ffb35c'));
  cv.ring(700, 185, 69, 3, hex('#ff8a5c'));

  // Top banner: black band, title + OUT TODAY.
  cv.fillRect(0, 0, W, 128, BLACK);
  cv.fillRect(0, 128, W, 6, MAGENTA);
  drawTextCentered(cv, 'GRAND THEFT AUTO VI', W / 2, 20, 6, WHITE);
  drawTextCentered(cv, 'OUT TODAY', W / 2, 78, 4, PINK);

  // Download block.
  drawTextShadowed(cv, 'DOWNLOADING...', 60, 168, 4, WHITE);
  drawTextShadowed(cv, '47%', 1020, 158, 9, WHITE);
  // Progress bar: dark track, white edge, 47% magenta-to-orange fill.
  const barX = 60;
  const barY = 232;
  const barW = 1080;
  const barH = 78;
  cv.fillRoundRect(barX, barY, barW, barH, 20, hex('#241a33'));
  cv.strokeRoundRect(barX, barY, barW, barH, 20, 5, WHITE);
  const fillW = Math.floor(barW * 0.47);
  for (let x = 0; x < fillW; x++) {
    const c = lerp(MAGENTA, ORANGE, x / Math.max(1, fillW));
    for (let y = barY + 6; y < barY + barH - 6; y++) cv.set(barX + 6 + x, y, c);
  }
  // Shine stripe across the top of the fill.
  for (let x = 0; x < fillW; x++) {
    for (let y = barY + 8; y < barY + 22; y++) {
      const i = (y * W + barX + 6 + x) * 4;
      cv.px[i] = Math.min(255, cv.px[i] + 60);
      cv.px[i + 1] = Math.min(255, cv.px[i + 1] + 60);
      cv.px[i + 2] = Math.min(255, cv.px[i + 2] + 60);
    }
  }
  drawText(cv, '187 GB OF 400 GB', 60, 330, 4, WHITE);
  const rightLabel = '6H 12M LEFT';
  drawText(cv, rightLabel, W - 60 - textWidth(rightLabel, 4), 330, 4, WHITE);

  // Ghost (large, left) + speech bubble (right).
  drawGhost(cv, 84, 368, 200, 232);
  // Bubble tail first, then the bubble covers its base.
  cv.fillPoly([[470, 560], [560, 560], [330, 452]], WHITE);
  cv.line(470, 560, 330, 452, 5, BLACK);
  cv.line(560, 560, 330, 452, 5, BLACK);
  const bubX = 420;
  const bubY = 388;
  const bubW = 730;
  const bubH = 178;
  cv.fillRoundRect(bubX, bubY, bubW, bubH, 26, WHITE);
  cv.strokeRoundRect(bubX, bubY, bubW, bubH, 26, 5, BLACK);
  drawText(cv, 'MY AGENT ALREADY', bubX + 36, bubY + 22, 5, BLACK);
  drawText(cv, 'WON $500 ON', bubX + 36, bubY + 66, 5, BLACK);
  drawText(cv, 'MAKE.FUN WHILE I WAIT', bubX + 36, bubY + 110, 5, BLACK);

  // Footer strip: big make.fun wordmark, magenta dot.
  cv.fillRect(0, 606, W, 69, BLACK);
  cv.fillRect(0, 606, W, 4, MAGENTA);
  drawTextCentered(cv, 'make.fun', W / 2, 620, 7, WHITE, { 4: MAGENTA });

  return encodePNG(W, H, cv.px);
}

// ---------- entrypoint ----------
function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'meme.png'), buildMeme());
  try {
    copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
  } catch (err) {
    console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
    process.exit(1);
  }
}
main();
