import path from "node:path";
import { HttpError } from "./auth";

export const uploadsDir = () => path.join(path.dirname(process.env.DATABASE_PATH || "/data/rifa.db"), "uploads");

export function raffleFields(b: Record<string, unknown>) {
  const name = String(b.name ?? "").trim();
  const price = Number(b.price);
  const min_number = Number(b.min_number ?? 1);
  const max_number = Number(b.max_number ?? 150);
  const draw_date = b.draw_date ? String(b.draw_date) : null;
  if (!name) throw new HttpError(400, "La rifa necesita un nombre");
  if (!Number.isInteger(price) || price < 0) throw new HttpError(400, "Precio inválido");
  if (!Number.isInteger(min_number) || !Number.isInteger(max_number) || min_number < 0 || max_number < min_number || max_number - min_number > 9999)
    throw new HttpError(400, "Rango de números inválido");
  if (draw_date && !/^\d{4}-\d{2}-\d{2}$/.test(draw_date)) throw new HttpError(400, "Fecha inválida");
  return { name, prize: String(b.prize ?? "").trim(), price, draw_date, alias: String(b.alias ?? "").trim(), min_number, max_number };
}
