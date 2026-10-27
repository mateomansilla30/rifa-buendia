import type { DB } from "./db";
import { pad } from "./format";
import type { Raffle, Sale } from "./types";

export class SaleError extends Error {
  constructor(message: string, public status = 400, public taken: number[] = []) {
    super(message);
  }
}

export interface SaleInput {
  buyer_name: string;
  contact?: string;
  paid?: boolean;
  seller_id?: number | null;
  notes?: string;
}

export function getActiveRaffle(db: DB) {
  return db.prepare("SELECT * FROM raffles WHERE active = 1 ORDER BY id DESC LIMIT 1").get() as Raffle | undefined;
}

export function listSales(db: DB, raffleId: number) {
  return db.prepare("SELECT * FROM sales WHERE raffle_id = ? ORDER BY number").all(raffleId) as Sale[];
}

export function logAudit(db: DB, raffleId: number, number: number | null, userId: number | null, action: string, detail = "") {
  db.prepare("INSERT INTO audit (raffle_id, number, user_id, action, detail) VALUES (?, ?, ?, ?, ?)").run(raffleId, number, userId, action, detail);
}

function clean(input: SaleInput) {
  const buyer_name = String(input.buyer_name ?? "").trim();
  if (!buyer_name) throw new SaleError("Falta el nombre del comprador");
  return {
    buyer_name: buyer_name.slice(0, 120),
    contact: String(input.contact ?? "").trim().slice(0, 60),
    paid: input.paid ? 1 : 0,
    seller_id: input.seller_id ?? null,
    notes: String(input.notes ?? "").trim().slice(0, 500),
  };
}

const describe = (s: { buyer_name: string; paid: number; contact?: string }) =>
  `${s.buyer_name}${s.contact ? ` (${s.contact})` : ""} · ${s.paid ? "pagado" : "reservado"}`;

/**
 * Vende uno o varios números a la misma persona. Todo o nada: si alguno ya está tomado
 * (la restricción UNIQUE(raffle_id, number) es la que manda), no se vende ninguno.
 */
export function createSales(db: DB, raffle: Raffle, numbers: number[], input: SaleInput, userId: number | null, createdAt?: string) {
  const data = clean(input);
  const nums = [...new Set(numbers.map(Number))].sort((a, b) => a - b);
  if (!nums.length) throw new SaleError("Elegí al menos un número");
  const out = nums.filter((n) => !Number.isInteger(n) || n < raffle.min_number || n > raffle.max_number);
  if (out.length) throw new SaleError(`Fuera de rango: ${out.join(", ")}`);

  const insert = db.prepare(
    `INSERT INTO sales (raffle_id, number, buyer_name, contact, paid, seller_id, notes, created_at, updated_at)
     VALUES (@raffle_id, @number, @buyer_name, @contact, @paid, @seller_id, @notes,
             COALESCE(@created_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')), strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
  );
  try {
    db.transaction(() => {
      for (const number of nums) {
        insert.run({ ...data, raffle_id: raffle.id, number, created_at: createdAt ?? null });
        logAudit(db, raffle.id, number, userId, "alta", describe(data));
      }
    })();
  } catch (e) {
    if ((e as { code?: string }).code !== "SQLITE_CONSTRAINT_UNIQUE") throw e;
    const placeholders = nums.map(() => "?").join(",");
    const taken = db
      .prepare(`SELECT s.number, u.name FROM sales s LEFT JOIN users u ON u.id = s.seller_id WHERE s.raffle_id = ? AND s.number IN (${placeholders})`)
      .all(raffle.id, ...nums) as { number: number; name: string | null }[];
    const p = (n: number) => pad(n, raffle.max_number);
    const [one] = taken;
    throw new SaleError(
      taken.length === 1
        ? `¡Uy! ${one.name ? `${one.name} acaba de vender el ${p(one.number)}` : `El ${p(one.number)} ya está vendido`}. Elegí otro.`
        : `¡Uy! Ya están vendidos: ${taken.map((t) => `${p(t.number)}${t.name ? ` (${t.name})` : ""}`).join(", ")}. No se cargó ninguno.`,
      409,
      taken.map((t) => t.number),
    );
  }
  return db.prepare(`SELECT * FROM sales WHERE raffle_id = ? AND number IN (${nums.map(() => "?").join(",")})`).all(raffle.id, ...nums) as Sale[];
}

function getSale(db: DB, id: number) {
  const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id) as Sale | undefined;
  if (!sale) throw new SaleError("Ese número ya fue liberado por otra persona", 404);
  return sale;
}

export function updateSale(db: DB, id: number, input: SaleInput, userId: number | null) {
  const before = getSale(db, id);
  const data = clean(input);
  db.prepare(
    `UPDATE sales SET buyer_name=@buyer_name, contact=@contact, paid=@paid, seller_id=@seller_id, notes=@notes,
     updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=@id`,
  ).run({ ...data, id });
  const action = !before.paid && data.paid ? "pago" : "edición";
  logAudit(db, before.raffle_id, before.number, userId, action, `${describe(before)} → ${describe(data)}`);
  return getSale(db, id);
}

export function releaseSale(db: DB, id: number, userId: number | null) {
  const before = getSale(db, id);
  db.transaction(() => {
    db.prepare("DELETE FROM sales WHERE id = ?").run(id);
    logAudit(db, before.raffle_id, before.number, userId, "liberación", describe(before));
  })();
}
