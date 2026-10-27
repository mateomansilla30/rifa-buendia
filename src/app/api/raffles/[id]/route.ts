import { HttpError, requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { raffleFields } from "@/lib/raffles";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const body = await req.json();
  const db = getDb();
  if (body.activate) {
    db.transaction(() => {
      db.prepare("UPDATE raffles SET active = 0").run();
      db.prepare("UPDATE raffles SET active = 1 WHERE id = ?").run(id);
    })();
    return;
  }
  if (body.removePhoto) {
    db.prepare("UPDATE raffles SET photo = NULL WHERE id = ?").run(id);
    return;
  }
  const f = raffleFields(body);
  const outside = db
    .prepare("SELECT COUNT(*) AS n FROM sales WHERE raffle_id = ? AND (number < ? OR number > ?)")
    .get(id, f.min_number, f.max_number) as { n: number };
  if (outside.n) throw new HttpError(400, `Hay ${outside.n} número(s) vendidos fuera del nuevo rango`);
  db.prepare(
    `UPDATE raffles SET name=@name, prize=@prize, price=@price, draw_date=@draw_date, alias=@alias,
     min_number=@min_number, max_number=@max_number WHERE id=@id`,
  ).run({ ...f, id });
});
