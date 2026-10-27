import { HttpError, requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb, hashSecret } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireUser("admin");
  return {
    users: getDb()
      .prepare("SELECT id, username, name, role, active, secret_hash IS NOT NULL AS has_pin FROM users ORDER BY role, name")
      .all(),
  };
});

export const POST = handle(async (req: Request) => {
  await requireUser("admin");
  const { name = "", username = "", pin = "" } = await req.json();
  if (!String(name).trim() || !/^[a-z0-9._-]{2,30}$/i.test(username))
    throw new HttpError(400, "Nombre o usuario inválido (usuario: letras, números, . _ -)");
  if (!/^\d{4,8}$/.test(pin)) throw new HttpError(400, "El PIN tiene que tener entre 4 y 8 dígitos");
  try {
    getDb()
      .prepare("INSERT INTO users (username, name, role, secret_hash) VALUES (?, ?, 'seller', ?)")
      .run(username.trim(), name.trim(), hashSecret(pin));
  } catch {
    throw new HttpError(409, "Ya existe un usuario con ese nombre de usuario");
  }
});
