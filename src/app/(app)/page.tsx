"use client";
import { CheckSquare, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { api, useRifa } from "@/components/rifa-provider";
import { SaleDetail } from "@/components/sale-detail";
import { SaleForm, type SaleValues } from "@/components/sale-form";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { norm } from "@/lib/importer";
import { pad } from "@/lib/format";
import type { Sale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "todos" | "libres" | "reservados" | "pagados";

export default function Board() {
  const { state, refresh } = useRifa();
  const { raffle, sales, users } = state;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [seller, setSeller] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [formNumbers, setFormNumbers] = useState<number[] | null>(null);
  const [detailNumber, setDetailNumber] = useState<number | null>(null);

  const byNumber = useMemo(() => new Map(sales.map((s) => [s.number, s])), [sales]);
  const detail = detailNumber != null ? byNumber.get(detailNumber) : undefined;

  if (!raffle) return <><PageHeader title="Tablero" /><p className="p-6 text-muted-foreground">No hay ninguna rifa activa. El admin la configura en Ajustes.</p></>;

  const max = raffle.max_number;
  const all = Array.from({ length: max - raffle.min_number + 1 }, (_, i) => raffle.min_number + i);
  const q = norm(query);
  const isNumberQuery = /^\d+$/.test(q);
  const matches = (n: number, s?: Sale) => {
    if (filter === "libres" && s) return false;
    if (filter === "reservados" && (!s || s.paid)) return false;
    if (filter === "pagados" && !s?.paid) return false;
    if (seller && String(s?.seller_id ?? "") !== seller) return false;
    if (isNumberQuery) return String(n).includes(String(Number(q))) || pad(n, max).includes(q);
    if (q) return !!s && (norm(s.buyer_name).includes(q) || norm(s.contact).includes(q));
    return true;
  };
  const visible = all.filter((n) => matches(n, byNumber.get(n)));
  const paidCount = sales.filter((s) => s.paid).length;

  function tap(n: number) {
    const s = byNumber.get(n);
    if (selectMode) {
      if (s) return toast.info(`El ${pad(n, max)} ya está vendido`);
      setSelected((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
    } else if (s) setDetailNumber(n);
    else setFormNumbers([n]);
  }

  async function sell(v: SaleValues) {
    const numbers = formNumbers ?? [];
    try {
      await api("/api/sales", { method: "POST", json: { ...v, numbers } });
      toast.success(numbers.length > 1 ? `¡Listo! ${numbers.length} números para ${v.buyer_name}` : `¡Listo! El ${pad(numbers[0], max)} es de ${v.buyer_name}`);
      setFormNumbers(null);
      setSelected([]);
      setSelectMode(false);
    } catch (e) {
      const taken: number[] = (e as { taken?: number[] }).taken ?? [];
      toast.error((e as Error).message, { duration: 6000 });
      if (taken.length) {
        const rest = numbers.filter((n) => !taken.includes(n));
        setSelected(rest);
        setFormNumbers(rest.length ? rest : null);
      }
    }
    await refresh();
  }

  return (
    <>
      <PageHeader title="Tablero">
        <div className="space-y-2 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar número o nombre" className="pl-9" />
          </div>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todos", label: "Todos" },
              { value: "libres", label: <><Dot className="border bg-libre" />Libres</> },
              { value: "reservados", label: <><Dot className="bg-reservado" />Reserv.</> },
              { value: "pagados", label: <><Dot className="bg-pagado" />Pagados</> },
            ]}
          />
          <div className="flex items-center gap-2">
            <select
              aria-label="Filtrar por vendedor"
              value={seller}
              onChange={(e) => setSeller(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">Todos los vendedores</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <Button
              variant={selectMode ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => {
                setSelectMode(!selectMode);
                setSelected([]);
              }}
            >
              <CheckSquare /> {selectMode ? "Seleccionando" : "Elegir varios"}
            </Button>
          </div>
        </div>
      </PageHeader>

      <p className="px-4 pt-3 text-xs text-muted-foreground">
        <b className="text-foreground">{all.length - sales.length}</b> libres · <b className="text-foreground">{sales.length - paidCount}</b> reservados · <b className="text-foreground">{paidCount}</b> pagados
        {selectMode && " · Tocá los libres que quieras cargar juntos"}
      </p>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground">No hay números que coincidan.</p>
      ) : (
        <ul className="grid grid-cols-5 gap-1.5 p-4 min-[400px]:grid-cols-6 sm:grid-cols-8 md:grid-cols-10">
          {visible.map((n) => {
            const s = byNumber.get(n);
            const isSel = selected.includes(n);
            return (
              <li key={n}>
                <button
                  onClick={() => tap(n)}
                  aria-label={`${n}: ${s ? `${s.paid ? "pagado" : "reservado"} por ${s.buyer_name}` : "libre"}`}
                  className={cn(
                    "flex aspect-square w-full flex-col items-center justify-center rounded-lg border text-base font-bold tabular-nums transition active:scale-95",
                    !s && "bg-libre hover:border-primary",
                    s && !s.paid && "border-transparent bg-reservado text-reservado-foreground",
                    s?.paid && "border-transparent bg-pagado text-pagado-foreground",
                    isSel && "border-transparent bg-foreground text-background ring-2 ring-primary ring-offset-2",
                    selectMode && s && "opacity-40",
                  )}
                >
                  {pad(n, max)}
                  {s && <span className="w-full truncate px-1 text-[10px] font-medium leading-tight opacity-80">{s.buyer_name.split(" ")[0]}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectMode && selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-3xl gap-2 border-t bg-background p-3">
          <Button variant="outline" size="lg" onClick={() => setSelected([])} aria-label="Limpiar selección"><X /></Button>
          <Button size="lg" className="flex-1" onClick={() => setFormNumbers([...selected].sort((a, b) => a - b))}>
            Cargar {selected.length} {selected.length === 1 ? "número" : "números"}
          </Button>
        </div>
      )}

      <Drawer open={!!formNumbers} onOpenChange={(o) => !o && setFormNumbers(null)}>
        <DrawerContent
          className="max-h-[88dvh]"
          title={formNumbers && (formNumbers.length === 1 ? `Vender el ${pad(formNumbers[0], max)}` : `Vender ${formNumbers.length} números`)}
          description={formNumbers && formNumbers.length > 1 ? formNumbers.map((n) => pad(n, max)).join(", ") : undefined}
        >
          {formNumbers && <SaleForm key={formNumbers.join()} submitLabel="Guardar venta" onSubmit={sell} />}
        </DrawerContent>
      </Drawer>

      <Drawer open={detailNumber != null} onOpenChange={(o) => !o && setDetailNumber(null)}>
        <DrawerContent className="max-h-[88dvh]" title={detailNumber != null ? `Número ${pad(detailNumber, max)}` : ""}>
          {detail ? (
            <SaleDetail key={detail.id} sale={detail} onDone={() => setDetailNumber(null)} />
          ) : (
            <p className="text-sm text-muted-foreground">Este número quedó libre (lo liberó otra persona).</p>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block size-2.5 rounded-full", className)} />;
}
