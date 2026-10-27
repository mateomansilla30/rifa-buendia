import { login, loginBlocked } from "@/lib/auth";
import { handle } from "@/lib/api";

export const POST = handle(async (req: Request) => {
  const { username = "", password = "" } = await req.json();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${ip}|${String(username).toLowerCase()}`;
  const mins = loginBlocked(key);
  if (mins) return Response.json({ error: `Demasiados intentos. Probá en ${mins} min.` }, { status: 429 });
  const user = await login(String(username), String(password), key);
  if (!user) return Response.json({ error: "Usuario o clave incorrectos" }, { status: 401 });
  return { ok: true };
});
