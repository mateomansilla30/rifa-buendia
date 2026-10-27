// Importación desde el Excel que usaban: hoja "Ventas", encabezados en fila 4, datos desde la 5,
// columnas A–G = Número elegido, Nombre, Contacto, Fecha, Pagado (Sí/No), Vendido por, Notas.
import type { Raffle, User } from "./types";

export const SHEET = "Ventas";
export const HEADER_ROW = 4;
export const HEADERS = ["Número elegido", "Nombre", "Contacto", "Fecha", "Pagado", "Vendido por", "Notas"];

export type Cell = string | number | boolean | Date | null | undefined;

export interface ImportRow {
  row: number; // fila del Excel
  number: number | null;
  buyer_name: string;
  contact: string;
  date: string | null; // yyyy-mm-dd
  paid: boolean;
  seller: string;
  seller_id: number | null;
  notes: string;
  errors: string[];
}

export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const str = (v: Cell) => (v instanceof Date ? v.toISOString() : v == null ? "" : String(v)).trim();

function parseDate(v: Cell): string | null | "error" {
  if (v instanceof Date) return isNaN(+v) ? "error" : v.toISOString().slice(0, 10); // Excel guarda la fecha "local" como UTC
  const s = str(v);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!m) return "error";
  const [d, mo] = [Number(m[1]), Number(m[2])];
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "error";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parsePaid(v: Cell): boolean | "error" {
  if (typeof v === "boolean") return v;
  const s = norm(str(v));
  if (["si", "s", "yes", "x", "1", "pagado", "true"].includes(s)) return true;
  if (["no", "n", "", "0", "false"].includes(s)) return false;
  return "error";
}

/** rows: valores A–G de cada fila de datos, con su número de fila. */
export function parseImport(
  rows: { row: number; cells: Cell[] }[],
  raffle: Pick<Raffle, "min_number" | "max_number">,
  soldNumbers: Set<number>,
  users: Pick<User, "id" | "name" | "username">[],
) {
  const seen = new Map<number, number>(); // número → fila donde apareció primero
  const newSellers = new Set<string>();
  const out: ImportRow[] = [];
  let skipped = 0;

  for (const { row, cells } of rows) {
    const [num, name, contact, date, paid, seller, notes] = Array.from({ length: 7 }, (_, i) => cells[i]);
    if (!str(name) && !str(contact) && !str(paid) && !str(seller) && !str(notes)) {
      skipped++; // fila vacía o número sin vender
      continue;
    }
    const errors: string[] = [];
    const n = typeof num === "number" ? num : /^\d+$/.test(str(num)) ? Number(str(num)) : NaN;
    if (!str(num)) errors.push("Falta el número");
    else if (!Number.isInteger(n)) errors.push(`Número inválido: "${str(num)}"`);
    else if (n < raffle.min_number || n > raffle.max_number) errors.push(`Fuera de rango (${raffle.min_number}–${raffle.max_number})`);
    else if (seen.has(n)) errors.push(`Repetido (ya está en la fila ${seen.get(n)})`);
    else if (soldNumbers.has(n)) errors.push("Ya está vendido en la app");
    if (Number.isInteger(n) && !seen.has(n)) seen.set(n, row);
    if (!str(name)) errors.push("Falta el nombre");
    const d = parseDate(date);
    if (d === "error") errors.push(`Fecha inválida: "${str(date)}"`);
    const p = parsePaid(paid);
    if (p === "error") errors.push(`Pagado tiene que ser "Sí" o "No" (dice "${str(paid)}")`);
    const sellerName = str(seller);
    const match = sellerName ? users.find((u) => norm(u.name) === norm(sellerName) || norm(u.username) === norm(sellerName)) : undefined;
    if (sellerName && !match && !errors.length) newSellers.add(sellerName);

    out.push({
      row,
      number: Number.isInteger(n) ? n : null,
      buyer_name: str(name),
      contact: str(contact),
      date: d === "error" ? null : d,
      paid: p === true,
      seller: sellerName,
      seller_id: match?.id ?? null,
      notes: str(notes),
      errors,
    });
  }
  return { rows: out, valid: out.filter((r) => !r.errors.length).length, skipped, newSellers: [...newSellers] };
}
