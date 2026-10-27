// Modelo de la imagen de números disponibles: qué números van y dónde. El dibujo (canvas) está en
// components/raffle-image.tsx y solo pinta lo que sale de acá, así esto se puede testear sin navegador.
import { pad } from "./format";
import type { Raffle, Sale } from "./types";

export type ImageFormat = "square" | "story";

export const SIZES: Record<ImageFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
};

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Números libres en orden: todo el rango menos los vendidos (pagados o reservados, ambos van en gris). */
export function freeNumbers(raffle: Pick<Raffle, "min_number" | "max_number">, sales: Pick<Sale, "number">[]) {
  const sold = new Set(sales.map((s) => s.number));
  const free: number[] = [];
  for (let n = raffle.min_number; n <= raffle.max_number; n++) if (!sold.has(n)) free.push(n);
  return free;
}

const GAP = 0.12; // separación como fracción del lado de la celda

/** Elige columnas y tamaño de celda para que entren n celdas cuadradas en la caja, lo más grandes posible. */
export function gridLayout(n: number, box: Box, maxCell: number) {
  let best = { cols: 1, rows: n, cell: 0, waste: Infinity };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cell = Math.min(maxCell, box.w / (cols + (cols - 1) * GAP), box.h / (rows + (rows - 1) * GAP));
    const waste = rows * cols - n;
    // celda más grande; si empatan (tope maxCell), la que deja menos huecos y después la de menos filas
    const tie = Math.abs(cell - best.cell) <= 0.01;
    if (cell > best.cell + 0.01 || (tie && (waste < best.waste || (waste === best.waste && rows < best.rows)))) best = { cols, rows, cell, waste };
  }
  const cell = Math.floor(best.cell);
  const gap = Math.floor(cell * GAP);
  const gridW = best.cols * cell + (best.cols - 1) * gap;
  const gridH = best.rows * cell + (best.rows - 1) * gap;
  return {
    cols: best.cols,
    rows: best.rows,
    cell,
    gap,
    x0: Math.round(box.x + (box.w - gridW) / 2),
    y0: Math.round(box.y + (box.h - gridH) / 2),
  };
}

/** Caja disponible para la grilla según formato y si hay foto (en historia la foto va arriba y ocupa lugar). */
export function gridBox(format: ImageFormat, hasPhoto: boolean): Box {
  if (format === "square") return { x: 60, y: 440, w: 960, h: 570 };
  const top = hasPhoto ? 1020 : 700;
  return { x: 80, y: top, w: 920, h: 1800 - top };
}

export function buildImageModel(raffle: Raffle, sales: Pick<Sale, "number">[], format: ImageFormat, hasPhoto = false) {
  const free = freeNumbers(raffle, sales);
  const freeSet = new Set(free);
  const all = Array.from({ length: raffle.max_number - raffle.min_number + 1 }, (_, i) => raffle.min_number + i);
  const box = gridBox(format, hasPhoto);
  // Van todos los números en orden; los vendidos se pintan en gris (sold: true).
  const layout = gridLayout(all.length, box, format === "square" ? 190 : 210);
  const cells = all.map((n, i) => ({
    x: layout.x0 + (i % layout.cols) * (layout.cell + layout.gap),
    y: layout.y0 + Math.floor(i / layout.cols) * (layout.cell + layout.gap),
    size: layout.cell,
    label: pad(n, raffle.max_number),
    sold: !freeSet.has(n),
  }));
  return { ...SIZES[format], format, free, cells, box, layout };
}
