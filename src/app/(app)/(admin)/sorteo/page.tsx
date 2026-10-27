"use client";
import { Dices, Phone, Trophy } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useRifa } from "@/components/rifa-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pad } from "@/lib/format";
import { cn } from "@/lib/utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SorteoPage() {
  const { state } = useRifa();
  const { raffle, sales, users } = state;
  const [input, setInput] = useState("");
  const [winner, setWinner] = useState<number | null>(null);
  const [rolling, setRolling] = useState<number | null>(null);
  if (!raffle) return <PageHeader title="Sorteo" />;

  const paid = sales.filter((s) => s.paid).map((s) => s.number);
  const sale = winner != null ? sales.find((s) => s.number === winner) : undefined;

  async function randomDraw() {
    if (!paid.length) return;
    setWinner(null);
    const pick = paid[crypto.getRandomValues(new Uint32Array(1))[0] % paid.length];
    // ruleta que va frenando
    for (let i = 0, delay = 40; i < 28; i++, delay *= 1.1) {
      setRolling(paid[Math.floor(Math.random() * paid.length)]);
      await sleep(delay);
    }
    setRolling(null);
    setWinner(pick);
  }

  const shown = rolling ?? winner;

  return (
    <>
      <PageHeader title="Sorteo" />
      <div className="space-y-5 p-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(input);
            if (Number.isInteger(n)) setWinner(n);
          }}
        >
          <Input inputMode="numeric" pattern="\d*" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Número ganador" aria-label="Número ganador" />
          <Button type="submit" size="lg" className="h-11">Buscar</Button>
        </form>

        <Button size="lg" variant="outline" className="w-full" disabled={!paid.length || rolling != null} onClick={randomDraw}>
          <Dices /> Sorteo al azar entre los {paid.length} pagados
        </Button>

        {shown != null && (
          <div className={cn("rounded-2xl border p-6 text-center", rolling == null && sale && "border-primary bg-accent")}>
            <p className={cn("font-heading text-7xl font-extrabold tabular-nums", rolling != null ? "text-muted-foreground" : "text-primary")}>
              {pad(shown, raffle.max_number)}
            </p>
            {rolling == null &&
              (shown < raffle.min_number || shown > raffle.max_number ? (
                <p className="mt-3 text-muted-foreground">Ese número no existe en esta rifa ({raffle.min_number}–{raffle.max_number}).</p>
              ) : !sale ? (
                <p className="mt-3 text-muted-foreground">Ese número no se vendió.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  <p className="flex items-center justify-center gap-2 text-2xl font-bold"><Trophy className="size-6 text-primary" /> {sale.buyer_name}</p>
                  {sale.contact && (
                    <a href={`tel:${sale.contact.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-primary">
                      <Phone className="size-4" /> {sale.contact}
                    </a>
                  )}
                  <p>
                    <span className={cn("rounded-md px-2 py-1 text-sm font-semibold", sale.paid ? "bg-pagado text-pagado-foreground" : "bg-reservado text-reservado-foreground")}>
                      {sale.paid ? "Pagó ✔" : "No pagó todavía"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">Vendido por {users.find((u) => u.id === sale.seller_id)?.name ?? "—"}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
