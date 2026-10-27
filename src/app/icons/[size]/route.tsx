import { ImageResponse } from "next/og";

// Íconos de la PWA generados al vuelo (192, 512, 180 para iOS).
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Math.min(1024, Math.max(16, Number((await params).size) || 192));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fa7d00",
          color: "white",
          fontSize: size * 0.42,
          fontWeight: 800,
          letterSpacing: -size * 0.02,
        }}
      >
        Nº
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
