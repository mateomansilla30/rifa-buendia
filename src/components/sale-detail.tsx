"use client";
import { CheckCircle2, Pencil, Phone, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dateTime, money } from "@/lib/format";
import type { AuditEntry, Sale } from "@/lib/types";
import { api, useRifa } from "./rifa-provider";
import { SaleForm } from "./sale-form";

export function SaleDetail({ sale, onDone }: { sale: Sale; onDone: () => void }) {
  const { state, refresh } = useRifa();
  const [mode, setMode] = useState<"view" | "edit" | "confirmRelease">("view");
  const [history, setHistory] = useState<AuditEntry[] | null>(null);
  const seller = state.users.find((u) => u.id === sale.seller_id);

  useEffect(() => {
    api<{ entries: AuditEntry[] }>(`/api/audit?number=${sale.number}`).then((r) => setHistory(r.entries), () => setHistory([]));
  }, [sale.number, sale.updated_at]);

  async function save(body: object, msg: string) {
    try {
      await api(`/api/sales/${sale.id}`, { method: "PATCH", json: body });
      toast.success(msg);
      await refresh();
      setMode("view");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function release() {
    try {
      await api(`/api/sales/${sale.id}`, { method: "DELETE" });
      toast.success(`Liberaste el ${sale.number}`);
      await refresh();
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const base = { buyer_name: sale.buyer_name, contact: sale.contact, paid: !!sale.paid, seller_id: sale.seller_id, notes: sale.notes };

  if (mode === "edit")
    return <SaleForm initial={base} submitLabel="Guardar cambios" onCancel={() => setMode("view")} onSubmit={(v) => save(v, "Cambios guardados")} />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xl font-bold">{sale.buyer_name}</p>
          {sale.contact && (
            <a href={`tel:${sale.contact.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <Phone className="size-3.5" /> {sale.contact}
            </a>
          )}
        </div>
        <span
          className={
            sale.paid
              ? "shrink-0 rounded-md bg-pagado px-2 py-1 text-xs font-semibold text-pagado-foreground"
              : "shrink-0 rounded-md bg-reservado px-2 py-1 text-xs font-semibold text-reservado-foreground"
          }
        >
          {sale.paid ? "Pagado" : "Reservado, falta pagar"}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Vendido por</dt>
          <dd className="font-medium">{seller?.name ?? "Sin vendedor"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cargado</dt>
          <dd className="font-medium">{dateTime(sale.created_at)}</dd>
        </div>
        {sale.notes && (
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Notas</dt>
            <dd className="whitespace-pre-wrap">{sale.notes}</dd>
          </div>
        )}
      </dl>

      {mode === "confirmRelease" ? (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm">
            ¿Seguro que querés liberar el <b>{sale.number}</b>? Se borra la venta a <b>{sale.buyer_name}</b> y el número vuelve a estar libre.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setMode("view")}>No, volver</Button>
            <Button variant="destructive" className="flex-1" onClick={release}>Sí, liberar</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {!sale.paid && (
            <Button size="lg" className="bg-pagado hover:bg-pagado/90" onClick={() => save({ ...base, paid: true }, `¡El ${sale.number} quedó pagado! (${money(state.raffle?.price ?? 0)})`)}>
              <CheckCircle2 /> Marcar como pagado
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => setMode("edit")}><Pencil /> Editar</Button>
            <Button variant="outline" size="lg" className="text-destructive" onClick={() => setMode("confirmRelease")}><Unlock /> Liberar</Button>
          </div>
        </div>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historial</h3>
        {!history ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <ol className="space-y-2 border-l-2 pl-3 text-sm">
            {history.map((h) => (
              <li key={h.id}>
                <span className="font-medium capitalize">{h.action}</span> · {h.user_name ?? "—"}
                <span className="block text-xs text-muted-foreground">{dateTime(h.created_at)} · {h.detail}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
