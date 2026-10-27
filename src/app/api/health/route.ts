import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    getDb().prepare("SELECT 1").get();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 503 });
  }
}
