import { env } from "cloudflare:workers";
import seed from "../../../lib/seed.json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!env.DB) return Response.json(seed, { headers: { "Cache-Control": "no-store" } });
    const row = await env.DB.prepare("SELECT payload FROM site_content WHERE id = ?1").bind("published").first<{ payload: string }>();
    const data = row?.payload ? JSON.parse(row.payload) : seed;
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(seed, { headers: { "Cache-Control": "no-store", "X-Content-Fallback": "1" } });
  }
}

export async function PUT(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  if (!email || email !== env.ADMIN_EMAIL?.toLowerCase()) {
    return Response.json({ error: "Bạn không có quyền cập nhật nội dung CHAMÉA." }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 2_000_000) return Response.json({ error: "Nội dung vượt quá giới hạn 2 MB." }, { status: 413 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || !("store" in payload) || !("editor" in payload)) {
    return Response.json({ error: "Thiếu dữ liệu cửa hàng hoặc giao diện." }, { status: 400 });
  }
  const serialized = JSON.stringify(payload);
  if (serialized.length > 2_000_000) return Response.json({ error: "Nội dung vượt quá giới hạn 2 MB." }, { status: 413 });
  if (!env.DB) return Response.json({ error: "Kho nội dung chưa sẵn sàng." }, { status: 503 });
  try {
    await env.DB.prepare("INSERT INTO site_content (id, payload, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at")
      .bind("published", serialized, Date.now()).run();
    return Response.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "Kho nội dung chưa sẵn sàng. Hãy tải lại Studio sau khi triển khai." }, { status: 503 });
  }
}
