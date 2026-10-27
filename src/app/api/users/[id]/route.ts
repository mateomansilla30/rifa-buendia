import { HttpError, requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb, hashSecret } from "@/lib/db";

// Editar nombre, PIN (vendedor) / contraseña (admin) o activar/desactivar. No se borra: sus ventas lo referencian.
export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requireUser("admin");
  const id = Number((await params).id);
  const { name, pin, active } = await req.json();
  const db = getDb();
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(id) as { role: string } | undefined;
  if (!user) throw new HttpError(404, "No existe ese usuario");
  if (name !== undefined) {
    if (!String(name).trim()) throw new HttpError(400, "Falta el nombre");
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(String(name).trim(), id);
  }
  if (pin) {
    const ok = user.role === "admin" ? String(pin).length >= 8 : /^\d{4,8}$/.test(pin);
    if (!ok)
      throw new HttpError(400, user.role === "admin" ? "La contraseña necesita 8 caracteres o más" : "El PIN tiene que tener entre 4 y 8 dígitos");
    db.prepare("UPDATE users SET secret_hash = ? WHERE id = ?").run(hashSecret(String(pin)), id);
    if (id !== me.id) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  if (active !== undefined) {
    if (id === me.id) throw new HttpError(400, "No podés desactivarte a vos mismo");
    db.prepare("UPDATE users SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
    if (!active) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
});
