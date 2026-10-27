"use client";
import { Banknote, Clock, Hash, Ticket } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useRifa } from "@/components/rifa-provider";
import { StatsCard } from "@/components/ui/stats-card";
import { money, pad } from "@/lib/format";
import { computeSummary } from "@/lib/summary";

export default function ResumenPage() {
  const { state } = useRifa();
  const { raffle, sales, users } = state;
  if (!raffle) return <PageHeader title="Resumen" />;
  const s = computeSummary(raffle, sales, users);
  const icon = "size-4 text-muted-foreground";
  const pct = Math.round((s.sold / s.total) * 100);

  // agrupar "falta cobrar" por persona, así se le cobra todo junto
  const debtors = new Map<string, { name: string; contact: string; numbers: number[] }>();
  for (const x of s.unpaid) {
    const key = `${x.buyer_name.toLowerCase()}|${x.contact}`;
    const d = debtors.get(key) ?? { name: x.buyer_name, contact: x.contact, numbers: [] };
    d.numbers.push(x.number);
    debtors.set(key, d);
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
          <StatsCard title="Recaudado" value={money(s.collected)} tone="positive" hint={`${s.paid} × ${money(raffle.price)}`} icon={<Banknote className={icon} />} />
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
              <li key={d.name + d.contact} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.numbers.map((n) => pad(n, raffle.max_number)).join(", ")} · {money(d.numbers.length * raffle.price)}
                  </p>
                </div>
                {d.contact && (
                  <a href={`tel:${d.contact.replace(/[^\d+]/g, "")}`} className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                    {d.contact}
                  </a>
                )}
              </li>
            ))}
            {!debtors.size && <li className="px-3 py-4 text-center text-sm text-muted-foreground">¡Está todo cobrado! 🎉</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
