import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { releaseSale, updateSale } from "@/lib/sales";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  return { sale: updateSale(getDb(), Number((await params).id), await req.json(), me.id) };
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireUser();
  releaseSale(getDb(), Number((await params).id), me.id);
});
