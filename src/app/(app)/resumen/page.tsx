"use client";
import { Banknote, CheckCircle2, Clock, Download, Hash, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { api, useRifa } from "@/components/rifa-provider";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import { money, pad } from "@/lib/format";
import { computeSummary, priceOf } from "@/lib/summary";
import type { Sale } from "@/lib/types";

/** Número;Nombre;Pagado de todo lo vendido. ";" y BOM para que el Excel en español lo abra bien. */
function downloadCsv(sales: Sale[], max: number) {
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["Número", "Nombre", "Pagado"], ...[...sales].sort((a, b) => a.number - b.number).map((s) => [pad(s.number, max), s.buyer_name, s.paid ? "Sí" : "No"])];
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `numeros-rifa-${new Date().toLocaleDateString("sv-SE", { timeZone: "America/Buenos_Aires" })}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); // en iPhone revocar al toque corta la descarga
}

export default function ResumenPage() {
  const { state, refresh } = useRifa();
  const { raffle, sales, users } = state;
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!raffle) return <PageHeader title="Resumen" />;
  const s = computeSummary(raffle, sales, users);
  const icon = "size-4 text-muted-foreground";
  const pct = Math.round((s.sold / s.total) * 100);

  // agrupar "falta cobrar" por persona, así se le cobra todo junto
  const debtors = new Map<string, { key: string; name: string; contact: string; sales: Sale[]; owes: number }>();
  for (const x of s.unpaid) {
    const key = `${x.buyer_name.toLowerCase()}|${x.contact}`;
    const d = debtors.get(key) ?? { key, name: x.buyer_name, contact: x.contact, sales: [], owes: 0 };
    d.sales.push(x);
    d.owes += priceOf(raffle, x);
    debtors.set(key, d);
  }

  async function markPaid(d: { name: string; sales: Sale[]; owes: number }) {
    setBusy(true);
    let ok = 0;
    try {
      // ponytail: un PATCH por número (mismo camino que "Marcar como pagado" del detalle); se mandan todos los datos para no pisar nada
      for (const x of d.sales) {
        await api(`/api/sales/${x.id}`, {
          method: "PATCH",
          json: { buyer_name: x.buyer_name, contact: x.contact, paid: true, seller_id: x.seller_id, notes: x.notes },
        });
        ok++;
      }
      toast.success(`¡${d.name} pagó! ${ok === 1 ? "1 número" : `${ok} números`} · ${money(d.owes)}`);
      setConfirming(null);
    } catch (e) {
      toast.error(`${(e as Error).message}${ok ? ` (se marcaron ${ok} de ${d.sales.length})` : ""}`);
    }
    setBusy(false);
    await refresh();
  }

  return (
    <>
      <PageHeader title="Resumen" />
      <div className="space-y-6 p-4">
        <section>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium">Vendidos {s.sold} de {s.total}</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="bg-pagado" style={{ width: `${(s.paid / s.total) * 100}%` }} />
            <div className="bg-reservado" style={{ width: `${(s.reserved / s.total) * 100}%` }} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatsCard title="Vendidos" value={String(s.sold)} hint={`${s.paid} pagados · ${s.reserved} reservados`} icon={<Ticket className={icon} />} />
          <StatsCard title="Libres" value={String(s.free)} hint={`de ${s.total} números`} icon={<Hash className={icon} />} />
          <StatsCard title="Recaudado" value={money(s.collected)} tone="positive" hint={`${s.paid} números pagados`} icon={<Banknote className={icon} />} />
          <StatsCard title="Falta cobrar" value={money(s.pending)} tone="warning" hint={`${s.reserved} números reservados`} icon={<Clock className={icon} />} />
          <StatsCard title="Si se cobra todo lo vendido" value={money(s.ifAllSoldPaid)} />
          <StatsCard title={`Si se venden los ${s.total}`} value={money(s.ifAllNumbersSold)} />
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold">Por vendedor</h2>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Vendedor</th>
                  <th className="px-3 py-2 text-right font-medium">Vend.</th>
                  <th className="px-3 py-2 text-right font-medium">Pag.</th>
                  <th className="px-3 py-2 text-right font-medium">Recaudado</th>
                </tr>
              </thead>
              <tbody>
                {s.bySeller.map((r) => (
                  <tr key={r.id ?? "none"} className="border-t">
                    <td className="px-3 py-2.5 font-medium">{r.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.sold}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.paid}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(r.collected)}</td>
                  </tr>
                ))}
                {!s.bySeller.length && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Todavía no hay ventas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold">Falta cobrar ({debtors.size} {debtors.size === 1 ? "persona" : "personas"})</h2>
          <ul className="divide-y rounded-xl border">
            {[...debtors.values()].map((d) => (
              <li key={d.key} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setConfirming(confirming === d.key ? null : d.key)} aria-expanded={confirming === d.key}>
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.sales.map((x) => pad(x.number, raffle.max_number)).join(", ")} · {money(d.owes)}
                    </p>
                  </button>
                  {d.contact && (
                    <a href={`tel:${d.contact.replace(/[^\d+]/g, "")}`} className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                      {d.contact}
                    </a>
                  )}
                </div>
                {confirming === d.key && (
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setConfirming(null)} disabled={busy}>Cancelar</Button>
                    <Button className="flex-[2] bg-pagado hover:bg-pagado/90" onClick={() => markPaid(d)} disabled={busy}>
                      <CheckCircle2 /> {busy ? "Guardando…" : `Pagó ${money(d.owes)}`}
                    </Button>
                  </div>
                )}
              </li>
            ))}
            {!debtors.size && <li className="px-3 py-4 text-center text-sm text-muted-foreground">¡Está todo cobrado! 🎉</li>}
          </ul>
          {!!debtors.size && <p className="mt-1.5 text-xs text-muted-foreground">Tocá a una persona para marcar que pagó todos sus números.</p>}
        </section>

        <Button variant="outline" size="lg" className="w-full" onClick={() => downloadCsv(sales, raffle.max_number)} disabled={!sales.length}>
          <Download /> Descargar CSV (números y nombres)
        </Button>
      </div>
    </>
  );
}
