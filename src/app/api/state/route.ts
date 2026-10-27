import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getActiveRaffle, listSales } from "@/lib/sales";

export const dynamic = "force-dynamic";

// Lo que el tablero consulta cada 5 s.
export const GET = handle(async () => {
  const me = await requireUser();
  const db = getDb();
  const raffle = getActiveRaffle(db) ?? null;
  const users = db.prepare("SELECT id, username, name, role, active FROM users ORDER BY name").all();
  return { me, raffle, users, sales: raffle ? listSales(db, raffle.id) : [] };
});
