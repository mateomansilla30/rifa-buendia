import { HttpError, requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createSales, getActiveRaffle } from "@/lib/sales";

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const db = getDb();
  const raffle = getActiveRaffle(db);
  if (!raffle) throw new HttpError(400, "No hay ninguna rifa activa");
  const body = await req.json();
  return { sales: createSales(db, raffle, body.numbers ?? [], { seller_id: me.id, ...body }, me.id) };
});
