import ExcelJS from "exceljs";
import { HttpError, requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";
import { HEADER_ROW, SHEET, norm, parseImport, type Cell } from "@/lib/importer";
import { getActiveRaffle, listSales, logAudit } from "@/lib/sales";
import type { User } from "@/lib/types";

function cellValue(v: ExcelJS.CellValue): Cell {
  if (v == null || typeof v !== "object" || v instanceof Date) return v as Cell;
  if ("result" in v) return cellValue(v.result as ExcelJS.CellValue); // fórmula
  if ("richText" in v) return v.richText.map((t) => t.text).join("");
  if ("text" in v) return String(v.text); // hipervínculo
  return null;
}

// multipart: file + mode=preview|confirm. Confirmar vuelve a leer el archivo e importa solo las filas sin errores.
export const POST = handle(async (req: Request) => {
  const me = await requireUser("admin");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Subí el archivo .xlsx");

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new HttpError(400, "No pude leer el archivo. ¿Es un .xlsx?");
  }
  const ws = wb.getWorksheet(SHEET) ?? wb.worksheets.find((w) => norm(w.name) === norm(SHEET));
  if (!ws) throw new HttpError(400, `El archivo no tiene una hoja "${SHEET}"`);

  const rows: { row: number; cells: Cell[] }[] = [];
  ws.eachRow((r, i) => {
    if (i > HEADER_ROW) rows.push({ row: i, cells: [1, 2, 3, 4, 5, 6, 7].map((c) => cellValue(r.getCell(c).value)) });
  });

  const db = getDb();
  const raffle = getActiveRaffle(db);
  if (!raffle) throw new HttpError(400, "No hay ninguna rifa activa");
  const users = db.prepare("SELECT id, name, username FROM users").all() as User[];
  const sold = new Set(listSales(db, raffle.id).map((s) => s.number));
  const preview = parseImport(rows, raffle, sold, users);
  if (form.get("mode") !== "confirm") return preview;

  const valid = preview.rows.filter((r) => !r.errors.length);
  try {
    db.transaction(() => {
      const sellerIds = new Map<string, number>();
      for (const name of preview.newSellers) {
        const username = norm(name).replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "vendedor";
        const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
        const { lastInsertRowid } = db
          .prepare("INSERT INTO users (username, name, role) VALUES (?, ?, 'seller')") // sin PIN: el admin se lo pone después
          .run(exists ? `${username}.${Date.now() % 1000}` : username, name);
        sellerIds.set(norm(name), Number(lastInsertRowid));
      }
      const insert = db.prepare(
        `INSERT INTO sales (raffle_id, number, buyer_name, contact, paid, seller_id, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
      );
      for (const r of valid) {
        const sellerId = r.seller_id ?? (r.seller ? sellerIds.get(norm(r.seller)) ?? null : null);
        // mediodía en Argentina (15 UTC) para que la fecha no se corra de día
        insert.run(raffle.id, r.number, r.buyer_name, r.contact, r.paid ? 1 : 0, sellerId, r.notes, r.date ? `${r.date}T15:00:00.000Z` : null);
        logAudit(db, raffle.id, r.number, me.id, "importación", `${r.buyer_name} · ${r.paid ? "pagado" : "reservado"} (fila ${r.row})`);
      }
    })();
  } catch (e) {
    if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE")
      throw new HttpError(409, "Alguien vendió uno de esos números mientras tanto. Volvé a generar la vista previa.");
    throw e;
  }
  return { imported: valid.length, skippedWithErrors: preview.rows.length - valid.length, newSellers: preview.newSellers };
});
