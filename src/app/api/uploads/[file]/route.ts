import fs from "node:fs";
import path from "node:path";
import { uploadsDir } from "@/lib/raffles";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const file = path.basename((await params).file); // sin "../"
  const full = path.join(uploadsDir(), file);
  if (!fs.existsSync(full)) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(full)), {
    headers: {
      "Content-Type": MIME[file.split(".").pop()!] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
