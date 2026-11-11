import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { getActiveRaffle } from "@/lib/sales";
import type { AuditEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

// ?number=N → historial de ese número (cualquier usuario). Sin número → últimos 300 cambios (solo admin).
// ?format=csv → el registro completo, del más viejo al más nuevo (solo admin).
export const GET = handle(async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const number = params.get("number");
  await requireUser(number ? undefined : "admin");
  const db = getDb();
  const raffle = getActiveRaffle(db);
  if (params.get("format") === "csv") {
    const rows = raffle
      ? (db
          .prepare(`SELECT a.*, u.name AS user_name FROM audit a LEFT JOIN users u ON u.id = a.user_id WHERE a.raffle_id = ? ORDER BY a.id`)
          .all(raffle.id) as AuditEntry[])
      : [];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Fecha", "Número", "Acción", "Usuario", "Detalle"],
      ...rows.map((e) => [dateTime(e.created_at), e.number ?? "", e.action, e.user_name ?? "", e.detail]),
    ];
    const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Buenos_Aires" });
    return new Response("﻿" + lines.map((r) => r.map(esc).join(";")).join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="registro-rifa-${stamp}.csv"` },
    });
  }
  if (!raffle) return { entries: [] };
  const sql = `SELECT a.*, u.name AS user_name FROM audit a LEFT JOIN users u ON u.id = a.user_id
               WHERE a.raffle_id = ? ${number ? "AND a.number = ?" : ""} ORDER BY a.id DESC LIMIT 300`;
  return { entries: number ? db.prepare(sql).all(raffle.id, Number(number)) : db.prepare(sql).all(raffle.id) };
});
