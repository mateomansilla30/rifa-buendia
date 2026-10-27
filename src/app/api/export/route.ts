import ExcelJS from "exceljs";
import { HttpError, requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { date } from "@/lib/format";
import { HEADER_ROW, HEADERS, SHEET } from "@/lib/importer";
import { getActiveRaffle, listSales } from "@/lib/sales";

export const dynamic = "force-dynamic";

// ?format=xlsx|csv. El xlsx sale con el mismo formato que el importador (se puede volver a importar).
export const GET = handle(async (req: Request) => {
  await requireUser("admin");
  const db = getDb();
  const raffle = getActiveRaffle(db);
  if (!raffle) throw new HttpError(400, "No hay ninguna rifa activa");
  const names = new Map((db.prepare("SELECT id, name FROM users").all() as { id: number; name: string }[]).map((u) => [u.id, u.name]));
  const rows = listSales(db, raffle.id).map((s) => [
    s.number,
    s.buyer_name,
    s.contact,
    date(s.created_at),
    s.paid ? "Sí" : "No",
    s.seller_id ? names.get(s.seller_id) ?? "" : "",
    s.notes,
  ]);
  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Buenos_Aires" });
  const base = `ventas-rifa-${stamp}`;

  if (new URL(req.url).searchParams.get("format") === "csv") {
    // ; y BOM para que el Excel en español lo abra bien
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "﻿" + [HEADERS, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.csv"` },
    });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(SHEET);
  ws.getCell("A1").value = raffle.name;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A2").value = `${raffle.prize} · Exportado el ${date(new Date().toISOString())}`;
  ws.getRow(HEADER_ROW).values = HEADERS;
  ws.getRow(HEADER_ROW).font = { bold: true };
  rows.forEach((r, i) => (ws.getRow(HEADER_ROW + 1 + i).values = r));
  ws.columns.forEach((c, i) => (c.width = [16, 28, 18, 12, 10, 16, 40][i]));
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
    },
  });
});
