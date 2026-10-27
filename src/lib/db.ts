import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type DB = Database.Database;

// Cada entrada es una migración; se aplican en orden y PRAGMA user_version guarda por cuál vamos.
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','seller')),
    secret_hash TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE raffles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    prize TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL DEFAULT 0,
    draw_date TEXT,
    alias TEXT NOT NULL DEFAULT '',
    min_number INTEGER NOT NULL DEFAULT 1,
    max_number INTEGER NOT NULL DEFAULT 150,
    photo TEXT,
    active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    CHECK (max_number >= min_number)
  );
  CREATE TABLE sales (
    id INTEGER PRIMARY KEY,
    raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    buyer_name TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    paid INTEGER NOT NULL DEFAULT 0,
    seller_id INTEGER REFERENCES users(id),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (raffle_id, number)
  );
  CREATE TABLE audit (
    id INTEGER PRIMARY KEY,
    raffle_id INTEGER NOT NULL,
    number INTEGER,
    user_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX audit_raffle ON audit(raffle_id, number);
  `,
];

export function migrate(db: DB) {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

export function hashSecret(secret: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(secret, salt, 32).toString("hex");
}

export function checkSecret(secret: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const got = crypto.scryptSync(secret, salt, 32);
  return crypto.timingSafeEqual(got, Buffer.from(hash, "hex"));
}

export function openDb(file: string) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

/** Primer arranque: admin desde env y la rifa de Buendía. Opcional: datos de ejemplo. */
export function bootstrap(db: DB, env: NodeJS.ProcessEnv = process.env) {
  const hasAdmin = db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get();
  if (!hasAdmin) {
    const user = env.ADMIN_USER || "admin";
    const pass = env.ADMIN_PASSWORD;
    if (!pass) throw new Error("Falta ADMIN_PASSWORD para crear el admin en el primer arranque");
    db.prepare("INSERT INTO users (username, name, role, secret_hash) VALUES (?, ?, 'admin', ?)").run(
      user, user.charAt(0).toUpperCase() + user.slice(1), hashSecret(pass),
    );
  } else if (env.RESET_ADMIN_PASSWORD === "1" && env.ADMIN_PASSWORD) {
    // Recuperación: deja ADMIN_USER como admin activo con ADMIN_PASSWORD. Sacar la variable después.
    const user = env.ADMIN_USER || "admin";
    const hash = hashSecret(env.ADMIN_PASSWORD);
    const updated = db.prepare("UPDATE users SET secret_hash = ?, role = 'admin', active = 1 WHERE username = ?").run(hash, user);
    if (!updated.changes) db.prepare("INSERT INTO users (username, name, role, secret_hash) VALUES (?, ?, 'admin', ?)").run(user, user, hash);
    console.warn(`[rifa] Contraseña del admin "${user}" reseteada desde ADMIN_PASSWORD. Quitá RESET_ADMIN_PASSWORD.`);
  }
  const hasRaffle = db.prepare("SELECT 1 FROM raffles").get();
  if (!hasRaffle) {
    db.prepare(
      `INSERT INTO raffles (name, prize, price, min_number, max_number, active)
       VALUES ('Rifa a beneficio de Buendía', 'Monitor gamer Raptor 24" 100Hz Full HD', 3000, 1, 150, 1)`,
    ).run();
  }
  if (env.SEED_DEMO === "1") seedDemo(db);
}

function seedDemo(db: DB) {
  const raffle = db.prepare("SELECT * FROM raffles WHERE active = 1").get() as { id: number; min_number: number; max_number: number } | undefined;
  if (!raffle) return;
  if (db.prepare("SELECT 1 FROM sales WHERE raffle_id = ?").get(raffle.id)) return; // ya tiene ventas: no tocar
  const sellers = [
    ["fede", "Fede", "1111"],
    ["mateo", "Mateo", "2222"],
    ["sofi", "Sofi", "3333"],
  ].map(([u, n, pin]) => {
    db.prepare("INSERT OR IGNORE INTO users (username, name, role, secret_hash) VALUES (?, ?, 'seller', ?)").run(u, n, hashSecret(pin));
    return (db.prepare("SELECT id FROM users WHERE username = ?").get(u) as { id: number }).id;
  });
  const names = ["Juan Pérez", "María Gómez", "Lucas Fernández", "Carla Ruiz", "Tomás Díaz", "Abuela Marta", "Pedro Sosa", "Lu Martínez", "Nico Álvarez", "Vero Castro"];
  const insert = db.prepare("INSERT INTO sales (raffle_id, number, buyer_name, contact, paid, seller_id) VALUES (?, ?, ?, ?, ?, ?)");
  db.transaction(() => {
    for (let n = raffle.min_number, i = 0; n <= raffle.max_number; n++) {
      if ((n * 7) % 5 >= 2) continue; // ~40% vendidos, determinístico
      insert.run(raffle.id, n, names[i % names.length], "11 5" + String(1000000 + n * 137).slice(-7), i % 3 ? 1 : 0, sellers[i % sellers.length]);
      i++;
    }
  })();
}

const g = globalThis as unknown as { __rifaDb?: DB };

export function getDb() {
  if (!g.__rifaDb) {
    const db = openDb(process.env.DATABASE_PATH || "/data/rifa.db");
    bootstrap(db);
    g.__rifaDb = db;
  }
  return g.__rifaDb;
}
