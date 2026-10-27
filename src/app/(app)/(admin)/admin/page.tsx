"use client";
import { Database, FileSpreadsheet, FileText, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { api, useRifa } from "@/components/rifa-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateTime, money, pad } from "@/lib/format";
import type { ImportRow } from "@/lib/importer";
import type { AuditEntry, Raffle, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const lbl = "mb-1.5 block text-sm font-medium";
const card = "space-y-4 rounded-2xl border bg-card p-4";

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="space-y-5 p-4">
        <Raffles />
        <Sellers />
        <ImportExport />
        <AuditLog />
      </div>
    </>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold">{children}</h2>;
}

// ---------------- Rifas

type RaffleRow = Raffle & { sold: number };

function Raffles() {
  const { refresh } = useRifa();
  const [raffles, setRaffles] = useState<RaffleRow[]>([]);
  const [editing, setEditing] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { raffles } = await api<{ raffles: RaffleRow[] }>("/api/raffles");
    setRaffles(raffles);
    setEditing((e) => e ?? raffles.find((r) => r.active)?.id ?? raffles[0]?.id ?? null);
  }, []);
  useEffect(() => void load(), [load]);

  const current = raffles.find((r) => r.id === editing);

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      await load();
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function create() {
    await act(async () => {
      const { id } = await api<{ id: number }>("/api/raffles", {
        method: "POST",
        json: { name: "Nueva rifa", prize: "", price: 3000, min_number: 1, max_number: 150 },
      });
      setEditing(id);
    }, "Rifa creada. Completá los datos y activala.");
  }

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <H>Rifa</H>
        <Button variant="outline" size="sm" onClick={create}><Plus /> Nueva rifa</Button>
      </div>

      {raffles.length > 1 && (
        <ul className="space-y-2">
          {raffles.map((r) => (
            <li key={r.id} className={cn("flex items-center gap-2 rounded-lg border p-2 pl-3", r.id === editing && "border-primary")}>
              <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(r.id)}>
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.sold} vendidos</p>
              </button>
              {r.active ? (
                <span className="rounded-md bg-pagado px-2 py-1 text-xs font-semibold text-pagado-foreground">Activa</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => act(() => api(`/api/raffles/${r.id}`, { method: "PATCH", json: { activate: true } }), "Rifa activada")}>
                  Activar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {current && (
        <RaffleForm
          key={current.id}
          raffle={current}
          onSave={(v) => act(() => api(`/api/raffles/${current.id}`, { method: "PATCH", json: v }), "Rifa guardada")}
          onPhoto={(file) =>
            act(() => {
              const fd = new FormData();
              fd.append("photo", file);
              return api(`/api/raffles/${current.id}/photo`, { method: "POST", body: fd });
            }, "Foto subida")
          }
          onRemovePhoto={() => act(() => api(`/api/raffles/${current.id}`, { method: "PATCH", json: { removePhoto: true } }), "Foto quitada")}
        />
      )}
    </section>
  );
}

function RaffleForm({
  raffle,
  onSave,
  onPhoto,
  onRemovePhoto,
}: {
  raffle: Raffle;
  onSave: (v: object) => void;
  onPhoto: (f: File) => void;
  onRemovePhoto: () => void;
}) {
  const [v, setV] = useState({
    name: raffle.name,
    prize: raffle.prize,
    price: String(raffle.price),
    draw_date: raffle.draw_date ?? "",
    alias: raffle.alias,
    min_number: String(raffle.min_number),
    max_number: String(raffle.max_number),
  });
  const field = (k: keyof typeof v, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div>
      <label htmlFor={`r-${k}`} className={lbl}>{label}</label>
      <Input id={`r-${k}`} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...props} />
    </div>
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...v, price: Number(v.price), min_number: Number(v.min_number), max_number: Number(v.max_number), draw_date: v.draw_date || null });
      }}
    >
      {field("name", "Nombre", { required: true })}
      {field("prize", "Premio")}
      <div className="grid grid-cols-2 gap-3">
        {field("price", "Precio por número ($)", { inputMode: "numeric", pattern: "\\d*", required: true })}
        {field("draw_date", "Fecha del sorteo", { type: "date" })}
      </div>
      {field("alias", "Alias de cobro (Mercado Pago)", { autoCapitalize: "none" })}
      <div className="grid grid-cols-2 gap-3">
        {field("min_number", "Número mínimo", { inputMode: "numeric", pattern: "\\d*", required: true })}
        {field("max_number", "Número máximo", { inputMode: "numeric", pattern: "\\d*", required: true })}
      </div>
      <p className="text-xs text-muted-foreground">
        {Number(v.max_number) - Number(v.min_number) + 1} números · si se venden todos: {money((Number(v.max_number) - Number(v.min_number) + 1) * Number(v.price || 0))}
      </p>

      <div>
        <span className={lbl}>Foto del premio (opcional, va en la imagen)</span>
        <div className="flex items-center gap-3">
          {raffle.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/uploads/${raffle.photo}`} alt="Premio" className="size-16 rounded-lg border object-cover" />
          ) : (
            <div className="grid size-16 place-items-center rounded-lg border border-dashed text-muted-foreground"><ImagePlus className="size-5" /></div>
          )}
          <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
            <Upload /> {raffle.photo ? "Cambiar" : "Subir foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          </label>
          {raffle.photo && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onRemovePhoto}><Trash2 /> Quitar</Button>
          )}
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full">Guardar rifa</Button>
    </form>
  );
}

// ---------------- Vendedores

function Sellers() {
  const { refresh } = useRifa();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: "", username: "", pin: "" });
  const [pinFor, setPinFor] = useState<number | null>(null);
  const [newPin, setNewPin] = useState("");

  const load = useCallback(async () => setUsers((await api<{ users: User[] }>("/api/users")).users), []);
  useEffect(() => void load(), [load]);

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      await load();
      await refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }

  return (
    <section className={card}>
      <H>Vendedores</H>
      <ul className="divide-y rounded-lg border">
        {users.map((u) => (
          <li key={u.id} className="space-y-2 p-3">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className={cn("truncate font-medium", !u.active && "text-muted-foreground line-through")}>{u.name}</p>
                <p className="text-xs text-muted-foreground">
                  @{u.username} · {u.role === "admin" ? "admin" : "vendedor"}
                  {!u.has_pin && <span className="text-amber-700"> · sin PIN, no puede entrar</span>}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setPinFor(pinFor === u.id ? null : u.id); setNewPin(""); }}>
                {u.role === "admin" ? "Clave" : "PIN"}
              </Button>
              {u.role !== "admin" && (
                <Button size="sm" variant="ghost" onClick={() => act(() => api(`/api/users/${u.id}`, { method: "PATCH", json: { active: !u.active } }), u.active ? "Vendedor desactivado" : "Vendedor activado")}>
                  {u.active ? "Desactivar" : "Activar"}
                </Button>
              )}
            </div>
            {pinFor === u.id && (
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await act(() => api(`/api/users/${u.id}`, { method: "PATCH", json: { pin: newPin } }), "Clave actualizada")) setPinFor(null);
                }}
              >
                <Input
                  type={u.role === "admin" ? "password" : "text"}
                  inputMode={u.role === "admin" ? undefined : "numeric"}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder={u.role === "admin" ? "Nueva contraseña (8+)" : "Nuevo PIN (4 a 8 dígitos)"}
                  autoComplete="new-password"
                />
                <Button type="submit" className="h-11">Guardar</Button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form
        className="space-y-3 rounded-lg bg-muted p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act(() => api("/api/users", { method: "POST", json: form }), `${form.name} ya puede entrar con su PIN`)) setForm({ name: "", username: "", pin: "" });
        }}
      >
        <p className="text-sm font-semibold">Agregar vendedor</p>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Nombre (ej: Fede)" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value, username: form.username || "" })} />
          <Input placeholder="Usuario (ej: fede)" value={form.username} required autoCapitalize="none" onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
        </div>
        <Input placeholder="PIN (4 a 8 dígitos)" inputMode="numeric" pattern="\d{4,8}" value={form.pin} required onChange={(e) => setForm({ ...form, pin: e.target.value })} />
        <Button type="submit" className="w-full"><Plus /> Agregar</Button>
      </form>
    </section>
  );
}

// ---------------- Importar / exportar

interface Preview {
  rows: ImportRow[];
  valid: number;
  skipped: number;
  newSellers: string[];
}

function ImportExport() {
  const { state, refresh } = useRifa();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const max = state.raffle?.max_number ?? 150;

  async function send(mode: "preview" | "confirm") {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", mode);
    try {
      if (mode === "preview") setPreview(await api<Preview>("/api/import", { method: "POST", body: fd }));
      else {
        const r = await api<{ imported: number; skippedWithErrors: number }>("/api/import", { method: "POST", body: fd });
        toast.success(`Importadas ${r.imported} ventas${r.skippedWithErrors ? ` (${r.skippedWithErrors} filas con errores quedaron afuera)` : ""}`);
        setPreview(null);
        setFile(null);
        await refresh();
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  const errors = preview?.rows.filter((r) => r.errors.length) ?? [];

  return (
    <section className={card}>
      <H>Importar y exportar</H>
      <div className="grid grid-cols-2 gap-2">
        <a href="/api/export?format=xlsx" className={buttonVariants({ variant: "outline" })}><FileSpreadsheet /> Excel</a>
        <a href="/api/export?format=csv" className={buttonVariants({ variant: "outline" })}><FileText /> CSV</a>
        <a href="/api/backup" className={cn(buttonVariants({ variant: "outline" }), "col-span-2")}><Database /> Descargar backup de la base</a>
      </div>

      <div className="space-y-3 rounded-lg bg-muted p-3">
        <p className="text-sm font-semibold">Importar desde el Excel</p>
        <p className="text-xs text-muted-foreground">
          Hoja &quot;Ventas&quot;, encabezados en la fila 4 y datos desde la 5. Columnas A–G: Número elegido, Nombre, Contacto, Fecha, Pagado (Sí/No), Vendido por, Notas.
        </p>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }}
          className="block w-full text-sm file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-background file:px-3 file:font-medium"
        />
        <Button className="w-full" variant="outline" disabled={!file || busy} onClick={() => send("preview")}>Ver vista previa</Button>

        {preview && (
          <div className="space-y-3">
            <p className="text-sm">
              <b>{preview.valid}</b> ventas listas para importar · <b className={errors.length ? "text-destructive" : ""}>{errors.length}</b> con errores · {preview.skipped} filas vacías
            </p>
            {preview.newSellers.length > 0 && (
              <p className="text-xs text-muted-foreground">Se van a crear estos vendedores (sin PIN): {preview.newSellers.join(", ")}</p>
            )}
            <div className="max-h-80 overflow-auto rounded-lg border bg-background">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr><th className="p-2">Fila</th><th className="p-2">Nº</th><th className="p-2">Nombre</th><th className="p-2">Pagó</th><th className="p-2">Estado</th></tr>
                </thead>
                <tbody>
                  {[...errors, ...preview.rows.filter((r) => !r.errors.length)].map((r) => (
                    <tr key={r.row} className={cn("border-t", r.errors.length && "bg-destructive/5")}>
                      <td className="p-2 tabular-nums">{r.row}</td>
                      <td className="p-2 tabular-nums">{r.number != null ? pad(r.number, max) : "—"}</td>
                      <td className="p-2">{r.buyer_name || "—"}</td>
                      <td className="p-2">{r.paid ? "Sí" : "No"}</td>
                      <td className={cn("p-2", r.errors.length ? "font-medium text-destructive" : "text-emerald-700")}>{r.errors.join(" · ") || "OK"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="w-full" disabled={!preview.valid || busy} onClick={() => send("confirm")}>
              Importar {preview.valid} ventas{errors.length ? ` (sin las ${errors.length} con errores)` : ""}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------- Registro de cambios

function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const { state } = useRifa();
  const max = state.raffle?.max_number ?? 150;
  useEffect(() => {
    api<{ entries: AuditEntry[] }>("/api/audit").then((r) => setEntries(r.entries), () => setEntries([]));
  }, [state.sales]);

  return (
    <section className={card}>
      <H>Registro de cambios</H>
      {!entries ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !entries.length ? (
        <p className="text-sm text-muted-foreground">Todavía no hay cambios.</p>
      ) : (
        <ol className="max-h-96 divide-y overflow-auto rounded-lg border text-sm">
          {entries.map((e) => (
            <li key={e.id} className="p-2.5">
              <p>
                <b className="tabular-nums">{e.number != null ? pad(e.number, max) : "—"}</b> · <span className="capitalize">{e.action}</span> · {e.user_name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">{dateTime(e.created_at)} · {e.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
