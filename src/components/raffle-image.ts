// Dibuja en un canvas el modelo de lib/image-model.ts. Todo del lado del cliente.
import { date, money } from "@/lib/format";
import type { buildImageModel } from "@/lib/image-model";
import type { Raffle } from "@/lib/types";

export interface Palette {
  id: string;
  name: string;
  bg: string;
  band: string;
  bandText: string;
  bandMuted: string;
  text: string;
  accent: string;
  cellBg: string;
  cellText: string;
  cellBorder: string;
  soldBg: string;
  soldText: string;
}

export const PALETTES: Palette[] = [
  { id: "naranja", name: "Naranja", bg: "#fff7ed", band: "#fa7d00", bandText: "#ffffff", bandMuted: "#ffe7cc", text: "#3b1d00", accent: "#e06c00", cellBg: "#fa7d00", cellText: "#ffffff", cellBorder: "#fa7d00", soldBg: "#e7e5e4", soldText: "#b5b0ab" },
  { id: "noche", name: "Noche", bg: "#0a0a0a", band: "#1a1a1a", bandText: "#ffffff", bandMuted: "#ffb366", text: "#ebebeb", accent: "#ff9933", cellBg: "#ff9933", cellText: "#1a0d00", cellBorder: "#ff9933", soldBg: "#1c1c1c", soldText: "#4a4a4a" },
  { id: "menta", name: "Menta", bg: "#f0fdf4", band: "#047857", bandText: "#ffffff", bandMuted: "#bbf7d0", text: "#064e3b", accent: "#059669", cellBg: "#059669", cellText: "#ffffff", cellBorder: "#059669", soldBg: "#e5e7eb", soldText: "#a1a1aa" },
];

type Model = ReturnType<typeof buildImageModel>;

/** Parte el texto en líneas que entren en maxW; si no entra en maxLines, achica la letra. */
function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, size: number, maxW: number, maxLines: number) {
  for (let px = size; px > 14; px -= 2) {
    ctx.font = font(px);
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { lines, px };
  }
  ctx.font = font(14);
  return { lines: [text], px: 14 };
}

function drawLines(ctx: CanvasRenderingContext2D, fit: { lines: string[]; px: number }, x: number, y: number, lineH = 1.15) {
  for (const l of fit.lines) {
    ctx.fillText(l, x, y);
    y += fit.px * lineH;
  }
  return y;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

export function drawRaffleImage(
  canvas: HTMLCanvasElement,
  model: Model,
  raffle: Raffle,
  pal: Palette,
  fonts: { body: string; heading: string },
  photo: HTMLImageElement | null,
) {
  const { width: W, height: H, format, cells, free, box } = model;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const heading = (w: number) => (px: number) => `${w} ${px}px ${fonts.heading}`;
  const body = (w: number) => (px: number) => `${w} ${px}px ${fonts.body}`;
  const story = format === "story";
  const pad = story ? 80 : 60;

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);

  // --- Encabezado
  const bandH = box.y - (story ? 150 : 120);
  ctx.fillStyle = pal.band;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, bandH, [0, 0, 48, 48]);
  ctx.fill();

  const info = [raffle.price ? `${money(raffle.price)} el número` : "", raffle.draw_date ? `Sorteo ${date(raffle.draw_date)}` : ""].filter(Boolean).join("  ·  ");
  const alias = raffle.alias ? `Alias: ${raffle.alias}` : "";
  ctx.textBaseline = "top";

  if (story) {
    let y = 90;
    if (photo) {
      drawCover(ctx, photo, (W - 340) / 2, y, 340, 340, 40);
      y += 380;
    }
    ctx.textAlign = "center";
    ctx.fillStyle = pal.bandText;
    y = drawLines(ctx, fitText(ctx, raffle.name, heading(800), 72, W - pad * 2, 2), W / 2, y) + 8;
    ctx.fillStyle = pal.bandMuted;
    y = drawLines(ctx, fitText(ctx, raffle.prize, body(600), 44, W - pad * 2, 2), W / 2, y) + 16;
    ctx.fillStyle = pal.bandText;
    for (const t of [info, alias].filter(Boolean)) y = drawLines(ctx, fitText(ctx, t, body(700), 38, W - pad * 2, 1), W / 2, y) + 4;
  } else {
    const photoSize = 250;
    if (photo) drawCover(ctx, photo, W - pad - photoSize, 45, photoSize, photoSize, 28);
    const maxW = W - pad * 2 - (photo ? photoSize + 30 : 0);
    ctx.textAlign = "left";
    ctx.fillStyle = pal.bandText;
    let y = 52;
    y = drawLines(ctx, fitText(ctx, raffle.name, heading(800), 58, maxW, 2), pad, y) + 6;
    ctx.fillStyle = pal.bandMuted;
    y = drawLines(ctx, fitText(ctx, raffle.prize, body(600), 34, maxW, 1), pad, y) + 14;
    ctx.fillStyle = pal.bandText;
    for (const t of [info, alias].filter(Boolean)) y = drawLines(ctx, fitText(ctx, t, body(700), 28, maxW, 1), pad, y) + 4;
  }

  // --- "Quedan X números"
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const quedanY = box.y - (story ? 40 : 28);
  if (free.length) {
    const big = story ? 96 : 76;
    const parts = free.length === 1 ? ["Queda ", "1", " número"] : ["Quedan ", String(free.length), " números"];
    ctx.font = heading(800)(big);
    const widths = parts.map((p) => ctx.measureText(p).width);
    let x = (W - widths.reduce((a, b) => a + b)) / 2;
    ctx.textAlign = "left";
    parts.forEach((p, i) => {
      ctx.fillStyle = i === 1 ? pal.accent : pal.text;
      ctx.fillText(p, x, quedanY);
      x += widths[i];
    });
  } else {
    ctx.fillStyle = pal.accent;
    ctx.font = heading(800)(story ? 96 : 76);
    ctx.fillText("¡No quedan números!", W / 2, quedanY);
  }

  // --- Grilla con todos los números: libres resaltados, vendidos en gris
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const c of cells) {
    ctx.fillStyle = c.sold ? pal.soldBg : pal.cellBg;
    ctx.strokeStyle = c.sold ? pal.soldBg : pal.cellBorder;
    ctx.lineWidth = Math.max(2, c.size * 0.03);
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.size, c.size, c.size * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.sold ? pal.soldText : pal.cellText;
    const ratio = c.label.length <= 2 ? 0.5 : c.label.length === 3 ? 0.38 : 0.3;
    ctx.font = heading(800)(Math.round(c.size * ratio));
    ctx.fillText(c.label, c.x + c.size / 2, c.y + c.size / 2 + c.size * 0.03);
  }

  // --- Pie
  ctx.fillStyle = pal.text;
  ctx.globalAlpha = 0.75;
  ctx.font = body(600)(story ? 36 : 26);
  ctx.fillText(free.length ? "Elegí tu número y avisanos 🙌" : "¡Gracias a todos por sumarse!", W / 2, H - (story ? 70 : 38));
  ctx.globalAlpha = 1;
}
