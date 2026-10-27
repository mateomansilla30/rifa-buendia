import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { raffleFields } from "@/lib/raffles";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireUser("admin");
  const raffles = getDb()
    .prepare("SELECT r.*, (SELECT COUNT(*) FROM sales s WHERE s.raffle_id = r.id) AS sold FROM raffles r ORDER BY r.id DESC")
    .all();
  return { raffles };
});

export const POST = handle(async (req: Request) => {
  await requireUser("admin");
  const f = raffleFields(await req.json());
  const { lastInsertRowid } = getDb()
    .prepare(
      `INSERT INTO raffles (name, prize, price, draw_date, alias, min_number, max_number)
       VALUES (@name, @prize, @price, @draw_date, @alias, @min_number, @max_number)`,
    )
    .run(f);
  return { id: Number(lastInsertRowid) };
});
