import { describe, expect, it } from "vitest";
import { bootstrap, checkSecret, openDb } from "@/lib/db";
import { buildImageModel, freeNumbers } from "@/lib/image-model";
import { parseImport } from "@/lib/importer";
import { createSales, getActiveRaffle, listSales, releaseSale, SaleError, updateSale } from "@/lib/sales";
import { computeSummary } from "@/lib/summary";
import type { Raffle, Sale } from "@/lib/types";

function setup() {
  const db = openDb(":memory:");
  bootstrap(db, { ADMIN_USER: "admin", ADMIN_PASSWORD: "secreto123" } as unknown as NodeJS.ProcessEnv);
  return { db, raffle: getActiveRaffle(db)! };
}

describe("ventas", () => {
  it("no deja vender un número dos veces", () => {
    const { db, raffle } = setup();
    createSales(db, raffle, [45], { buyer_name: "Juan" }, 1);
    expect(() => createSales(db, raffle, [45], { buyer_name: "María" }, 1)).toThrow(SaleError);
    try {
      createSales(db, raffle, [45], { buyer_name: "María" }, 1);
    } catch (e) {
      expect((e as SaleError).status).toBe(409);
      expect((e as SaleError).taken).toEqual([45]);
    }
    expect(listSales(db, raffle.id).filter((s) => s.number === 45)).toHaveLength(1);
  });

  it("la restricción vive en la base, no solo en el código", () => {
    const { db, raffle } = setup();
    const sql = "INSERT INTO sales (raffle_id, number, buyer_name) VALUES (?, 7, 'x')";
    db.prepare(sql).run(raffle.id);
    expect(() => db.prepare(sql).run(raffle.id)).toThrow(/UNIQUE/);
  });

  it("venta múltiple es todo o nada", () => {
    const { db, raffle } = setup();
    createSales(db, raffle, [10], { buyer_name: "Juan" }, 1);
    expect(() => createSales(db, raffle, [9, 10, 11], { buyer_name: "María" }, 1)).toThrow(/10/);
    expect(listSales(db, raffle.id).map((s) => s.number)).toEqual([10]);
  });

  it("rechaza números fuera de rango y sin nombre", () => {
    const { db, raffle } = setup();
    expect(() => createSales(db, raffle, [0], { buyer_name: "x" }, 1)).toThrow(/rango/);
    expect(() => createSales(db, raffle, [151], { buyer_name: "x" }, 1)).toThrow(/rango/);
    expect(() => createSales(db, raffle, [5], { buyer_name: "  " }, 1)).toThrow(/nombre/);
  });

  it("liberar deja el número disponible otra vez y queda en el registro", () => {
    const { db, raffle } = setup();
    const [s] = createSales(db, raffle, [3], { buyer_name: "Juan" }, 1);
    updateSale(db, s.id, { buyer_name: "Juan", paid: true }, 1);
    releaseSale(db, s.id, 1);
    createSales(db, raffle, [3], { buyer_name: "Otra" }, 1);
    const actions = (db.prepare("SELECT action FROM audit WHERE number = 3 ORDER BY id").all() as { action: string }[]).map((a) => a.action);
    expect(actions).toEqual(["alta", "pago", "liberación", "alta"]);
  });
});

describe("admin", () => {
  it("RESET_ADMIN_PASSWORD cambia la clave del admin existente", () => {
    const { db } = setup();
    const env = (pass: string, reset = "") => ({ ADMIN_USER: "admin", ADMIN_PASSWORD: pass, RESET_ADMIN_PASSWORD: reset }) as unknown as NodeJS.ProcessEnv;
    const hash = () => (db.prepare("SELECT secret_hash FROM users WHERE username = 'admin'").get() as { secret_hash: string }).secret_hash;
    bootstrap(db, env("otra-clave")); // sin reset no toca nada
    expect(checkSecret("secreto123", hash())).toBe(true);
    bootstrap(db, env("nueva-clave-1", "1"));
    expect(checkSecret("nueva-clave-1", hash())).toBe(true);
  });
});

describe("imagen", () => {
  const raffle = { id: 1, min_number: 1, max_number: 150 } as Raffle;
  const sold = (nums: number[]) => nums.map((number, i) => ({ number, paid: i % 2 })) as Sale[];

  it("muestra todos los números en orden; libres exactamente los libres y vendidos en gris", () => {
    const soldNums = [1, 2, 45, 99, 150, 77];
    const sales = sold(soldNums);
    const p = (n: number) => String(n).padStart(3, "0");
    for (const format of ["square", "story"] as const) {
      const model = buildImageModel(raffle, sales, format);
      expect(model.cells.map((c) => c.label)).toEqual(Array.from({ length: 150 }, (_, i) => p(i + 1)));
      const freeLabels = model.cells.filter((c) => !c.sold).map((c) => c.label);
      expect(freeLabels).toEqual(Array.from({ length: 150 }, (_, i) => i + 1).filter((n) => !soldNums.includes(n)).map(p));
      expect(model.cells.filter((c) => c.sold).map((c) => c.label)).toEqual([...soldNums].sort((a, b) => a - b).map(p));
      expect(model.free).toHaveLength(144);
    }
  });

  it("si no queda ninguno, todas las celdas van en gris", () => {
    const all = sold(Array.from({ length: 150 }, (_, i) => i + 1));
    const m = buildImageModel(raffle, all, "square");
    expect(m.cells.every((c) => c.sold)).toBe(true);
    expect(m.free).toHaveLength(0);
    expect(freeNumbers(raffle, all)).toEqual([]);
  });

  it.each([150, 87, 20, 3, 1])("con %i libres todas las celdas entran, no se pisan y se leen", (n) => {
    const sales = sold(Array.from({ length: 150 - n }, (_, i) => i + 1));
    for (const [format, photo] of [["square", false], ["square", true], ["story", false], ["story", true]] as const) {
      const m = buildImageModel(raffle, sales, format, photo);
      expect(m.cells).toHaveLength(150);
      expect(m.cells.filter((c) => !c.sold)).toHaveLength(n);
      for (const c of m.cells) {
        expect(c.x).toBeGreaterThanOrEqual(m.box.x);
        expect(c.y).toBeGreaterThanOrEqual(m.box.y);
        expect(c.x + c.size).toBeLessThanOrEqual(m.box.x + m.box.w);
        expect(c.y + c.size).toBeLessThanOrEqual(m.box.y + m.box.h);
      }
      const keys = new Set(m.cells.map((c) => `${c.x},${c.y}`));
      expect(keys.size).toBe(150);
      expect(m.layout.cell).toBeGreaterThanOrEqual(48); // con 150 números sigue siendo legible
    }
  });
});

describe("resumen", () => {
  it("calcula vendidos, cobrado, pendiente y por vendedor", () => {
    const raffle = { min_number: 1, max_number: 150, price: 3000 } as Raffle;
    const sales = [
      { number: 1, paid: 1, seller_id: 1, buyer_name: "A" },
      { number: 2, paid: 0, seller_id: 1, buyer_name: "C" },
      { number: 3, paid: 1, seller_id: 2, buyer_name: "B" },
      { number: 4, paid: 0, seller_id: 2, buyer_name: "B" },
      { number: 5, paid: 0, seller_id: null, buyer_name: "A" },
    ] as Sale[];
    const s = computeSummary(raffle, sales, [
      { id: 1, name: "Fede" },
      { id: 2, name: "Mateo" },
    ]);
    expect(s).toMatchObject({
      total: 150,
      sold: 5,
      paid: 2,
      reserved: 3,
      free: 145,
      collected: 6000,
      pending: 9000,
      ifAllSoldPaid: 15000,
      ifAllNumbersSold: 450000,
    });
    expect(s.bySeller).toEqual([
      { id: 1, name: "Fede", sold: 2, paid: 1, collected: 3000 },
      { id: 2, name: "Mateo", sold: 2, paid: 1, collected: 3000 },
      { id: null, name: "Sin vendedor", sold: 1, paid: 0, collected: 0 },
    ]);
    expect(s.unpaid.map((x) => x.number)).toEqual([5, 4, 2]);
  });
});

describe("importar", () => {
  it("marca repetidos, fuera de rango y ya vendidos", () => {
    const rows = [
      { row: 5, cells: [1, "Juan", "11 1234", "05/10/2026", "Sí", "Fede", ""] },
      { row: 6, cells: [1, "María", "", "", "No", "", ""] },
      { row: 7, cells: [200, "Pedro", "", "", "No", "", ""] },
      { row: 8, cells: [9, "Ana", "", "", "Si", "Nuevo", ""] },
      { row: 9, cells: [10, "", "", "", "", "", ""] }, // número sin vender
      { row: 10, cells: [12, "Luz", "", "fecha", "quizás", "", ""] },
    ];
    const r = parseImport(rows, { min_number: 1, max_number: 150 }, new Set([9]), [{ id: 3, name: "Fede", username: "fede" }]);
    expect(r.skipped).toBe(1);
    expect(r.rows.map((x) => [x.row, x.errors.length > 0])).toEqual([[5, false], [6, true], [7, true], [8, true], [10, true]]);
    expect(r.rows[0]).toMatchObject({ number: 1, paid: true, seller_id: 3, date: "2026-10-05" });
    expect(r.rows[1].errors[0]).toMatch(/Repetido.*fila 5/);
    expect(r.rows[2].errors[0]).toMatch(/rango/);
    expect(r.rows[3].errors[0]).toMatch(/vendido/);
    expect(r.rows[4].errors).toHaveLength(2);
    expect(r.valid).toBe(1);
  });
});
