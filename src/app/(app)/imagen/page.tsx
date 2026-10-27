"use client";
import { Download, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { drawRaffleImage, PALETTES } from "@/components/raffle-image";
import { useRifa } from "@/components/rifa-provider";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { buildImageModel, type ImageFormat } from "@/lib/image-model";
import { cn } from "@/lib/utils";

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function ImagenPage() {
  const { state } = useRifa();
  const { raffle, sales } = state;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<ImageFormat>("square");
  const [paletteId, setPaletteId] = useState(PALETTES[0].id);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);

  // números vendidos como string estable para no redibujar en cada polling si nada cambió
  const soldKey = sales.map((s) => s.number).join(",");
  const model = useMemo(
    () => (raffle ? buildImageModel(raffle, soldKey ? soldKey.split(",").map((n) => ({ number: Number(n) })) : [], format, !!photo) : null),
    [raffle, soldKey, format, photo],
  );

  useEffect(() => {
    if (!raffle?.photo) return setPhoto(null);
    loadImage(`/api/uploads/${raffle.photo}`).then(setPhoto);
  }, [raffle?.photo]);

  useEffect(() => {
    if (!model || !raffle || !canvas.current) return;
    const css = getComputedStyle(document.body);
    const fonts = {
      body: css.getPropertyValue("--font-jakarta").trim() || css.fontFamily,
      heading: css.getPropertyValue("--font-bricolage").trim() || css.fontFamily,
    };
    Promise.all([document.fonts.load(`800 40px ${fonts.heading}`), document.fonts.load(`600 40px ${fonts.body}`)]).finally(() => {
      drawRaffleImage(canvas.current!, model, raffle, PALETTES.find((p) => p.id === paletteId)!, fonts, photo);
      setReady(true);
    });
  }, [model, raffle, paletteId, photo]);

  const fileName = `numeros-disponibles-${format === "square" ? "cuadrado" : "historia"}.png`;
  const toBlob = () => new Promise<Blob>((res, rej) => canvas.current!.toBlob((b) => (b ? res(b) : rej()), "image/png"));

  async function download() {
    const url = URL.createObjectURL(await toBlob());
    const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function share() {
    const file = new File([await toBlob()], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: raffle?.name });
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast.error("No se pudo compartir");
      }
    } else {
      toast.info("Tu navegador no deja compartir archivos: la descargamos");
      await download();
    }
  }

  if (!raffle) return <PageHeader title="Imagen" />;

  return (
    <>
      <PageHeader title="Imagen de números libres" />
      <div className="space-y-4 p-4">
        <Segmented<ImageFormat>
          value={format}
          onChange={setFormat}
          options={[
            { value: "square", label: "Cuadrada (WhatsApp)" },
            { value: "story", label: "Historia" },
          ]}
        />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Colores</span>
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPaletteId(p.id)}
              aria-label={p.name}
              aria-pressed={paletteId === p.id}
              className={cn("flex h-10 items-center gap-2 rounded-full border px-3 text-sm", paletteId === p.id && "border-primary ring-2 ring-primary/30")}
            >
              <span className="size-5 rounded-full border" style={{ background: `linear-gradient(135deg, ${p.band} 50%, ${p.bg} 50%)` }} />
              {p.name}
            </button>
          ))}
        </div>

        <div className={cn("mx-auto overflow-hidden rounded-xl border bg-muted shadow-sm", format === "story" ? "max-w-[300px]" : "max-w-[480px]")}>
          <canvas ref={canvas} className={cn("block h-auto w-full transition-opacity", !ready && "opacity-0")} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="outline" onClick={download}><Download /> Descargar</Button>
          <Button size="lg" onClick={share}><Share2 /> Compartir</Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">Se actualiza sola con cada venta. Los vendidos aparecen en gris.</p>
      </div>
    </>
  );
}
