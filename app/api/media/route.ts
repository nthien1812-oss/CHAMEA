import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  if (!email || email !== env.ADMIN_EMAIL?.toLowerCase()) {
    return Response.json({ error: "Bạn không có quyền tải ảnh lên." }, { status: 403 });
  }
  if (!env.BUCKET) return Response.json({ error: "Kho ảnh chưa sẵn sàng." }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Chưa chọn tệp ảnh." }, { status: 400 });
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  if (!allowed.has(file.type)) return Response.json({ error: "Chỉ nhận JPG, PNG, WEBP hoặc AVIF." }, { status: 415 });
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return Response.json({ error: "Ảnh phải nhỏ hơn 10 MB." }, { status: 413 });
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const key = `${crypto.randomUUID()}.${ext}`;
  await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
  return Response.json({ url: `/media/${key}`, name: file.name, size: file.size });
}
