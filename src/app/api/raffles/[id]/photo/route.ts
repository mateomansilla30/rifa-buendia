import fs from "node:fs";
import path from "node:path";
import { HttpError, requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { uploadsDir } from "@/lib/raffles";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser("admin");
  const id = Number((await params).id);
  const file = (await req.formData()).get("photo");
  if (!(file instanceof File)) throw new HttpError(400, "No llegó ninguna foto");
  const ext = TYPES[file.type];
  if (!ext) throw new HttpError(400, "La foto tiene que ser JPG, PNG o WEBP");
  if (file.size > 8 * 1024 * 1024) throw new HttpError(400, "La foto pesa más de 8 MB");
  const name = `rifa-${id}-${Date.now()}.${ext}`;
  fs.mkdirSync(uploadsDir(), { recursive: true });
  fs.writeFileSync(path.join(uploadsDir(), name), Buffer.from(await file.arrayBuffer()));
  getDb().prepare("UPDATE raffles SET photo = ? WHERE id = ?").run(name, id);
  return { photo: name };
});
