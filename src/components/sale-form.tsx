"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useRifa } from "./rifa-provider";

export interface SaleValues {
  buyer_name: string;
  contact: string;
  paid: boolean;
  seller_id: number | null;
  notes: string;
}

const label = "mb-1.5 block text-sm font-medium";

export function SaleForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<SaleValues>;
  submitLabel: string;
  onSubmit: (v: SaleValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const { state } = useRifa();
  const [v, setV] = useState<SaleValues>({
    buyer_name: "",
    contact: "",
    paid: false,
    seller_id: state.me.id,
    notes: "",
    ...initial,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SaleValues>(k: K, val: SaleValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const sellers = state.users.filter((u) => u.active || u.id === v.seller_id);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit(v).finally(() => setBusy(false));
      }}
    >
      <div>
        <label htmlFor="buyer_name" className={label}>Nombre</label>
        <Input id="buyer_name" required autoFocus value={v.buyer_name} onChange={(e) => set("buyer_name", e.target.value)} placeholder="¿Quién lo compra?" autoComplete="off" />
      </div>
      <div>
        <label htmlFor="contact" className={label}>Contacto</label>
        <Input id="contact" type="tel" inputMode="tel" value={v.contact} onChange={(e) => set("contact", e.target.value)} placeholder="11 5555 5555" autoComplete="off" />
      </div>
      <label className="flex min-h-11 items-center justify-between rounded-lg border px-3">
        <span className="text-sm font-medium">¿Ya pagó?</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {v.paid ? "Sí, pagado" : "No, reservado"}
          <Switch checked={v.paid} onCheckedChange={(c) => set("paid", c)} />
        </span>
      </label>
      <div>
        <label htmlFor="seller" className={label}>Vendido por</label>
        <select
          id="seller"
          value={v.seller_id ?? ""}
          onChange={(e) => set("seller_id", e.target.value ? Number(e.target.value) : null)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base shadow-sm shadow-black/5 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
        >
          <option value="">Sin vendedor</option>
          {sellers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="notes" className={label}>Notas</label>
        <textarea
          id="notes"
          rows={2}
          value={v.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Opcional"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base shadow-sm shadow-black/5 placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
        />
      </div>
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onCancel}>Cancelar</Button>
        )}
        <Button type="submit" size="lg" className="flex-[2]" disabled={busy}>{busy ? "Guardando…" : submitLabel}</Button>
      </div>
    </form>
  );
}
