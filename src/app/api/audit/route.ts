import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getActiveRaffle } from "@/lib/sales";

export const dynamic = "force-dynamic";

// ?number=N → historial de ese número (cualquier usuario). Sin número → últimos 300 cambios (solo admin).
export const GET = handle(async (req: Request) => {
  const number = new URL(req.url).searchParams.get("number");
  await requireUser(number ? undefined : "admin");
  const db = getDb();
  const raffle = getActiveRaffle(db);
  if (!raffle) return { entries: [] };
  const sql = `SELECT a.*, u.name AS user_name FROM audit a LEFT JOIN users u ON u.id = a.user_id
               WHERE a.raffle_id = ? ${number ? "AND a.number = ?" : ""} ORDER BY a.id DESC LIMIT 300`;
  return { entries: number ? db.prepare(sql).all(raffle.id, Number(number)) : db.prepare(sql).all(raffle.id) };
});
