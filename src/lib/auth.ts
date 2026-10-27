import crypto from "node:crypto";
import { cookies } from "next/headers";
import { checkSecret, getDb } from "./db";
import type { User } from "./types";

const COOKIE = "rifa_session";
const DAYS = 30;

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("Falta SESSION_SECRET");
  return s || "dev-secret";
};
// En la base guardamos el HMAC del token, no el token: un backup filtrado no sirve para entrar.
const tokenId = (token: string) => crypto.createHmac("sha256", secret()).update(token).digest("hex");

// ponytail: rate limit en memoria (un solo contenedor); se resetea al reiniciar, alcanza para frenar fuerza bruta.
const attempts = new Map<string, { count: number; until: number }>();
const MAX_TRIES = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function loginBlocked(key: string) {
  const a = attempts.get(key);
  if (a && a.until > Date.now() && a.count >= MAX_TRIES) return Math.ceil((a.until - Date.now()) / 60000);
  return 0;
}

function registerFail(key: string) {
  const a = attempts.get(key);
  if (!a || a.until < Date.now()) attempts.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else a.count++;
}

export async function login(username: string, pass: string, key: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE username = ? AND active = 1").get(username.trim()) as
    | (User & { secret_hash: string | null })
    | undefined;
  if (!row || !checkSecret(pass, row.secret_hash)) {
    registerFail(key);
    return null;
  }
  attempts.delete(key);
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(tokenId(token), row.id, Date.now() + DAYS * 864e5);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: DAYS * 86400,
  });
  return row;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(tokenId(token));
  jar.delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return (
    (getDb()
      .prepare(
        `SELECT u.id, u.username, u.name, u.role, u.active FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires_at > ? AND u.active = 1`,
      )
      .get(tokenId(token), Date.now()) as User | undefined) ?? null
  );
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(role?: "admin") {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Tenés que iniciar sesión");
  if (role === "admin" && user.role !== "admin") throw new HttpError(403, "Solo el admin puede hacer esto");
  return user;
}
