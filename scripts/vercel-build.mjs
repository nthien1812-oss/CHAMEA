// Vercel runs native Next.js, while the original preview uses Vinext/Cloudflare.
// Changes below are confined to Vercel's disposable build checkout.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const paths = [
  "app/api/content/route.ts",
  "app/api/media/route.ts",
  "app/media/[key]/route.ts",
  "app/studio/page.tsx",
];
for (const path of paths) {
  const source = readFileSync(path, "utf8");
  const marker = 'import { env } from "cloudflare:workers";';
  if (!source.includes(marker)) throw new Error("Cloudflare import not found: " + path);
  // Vercel has neither Cloudflare D1 nor R2 bindings. Fail closed for writes/uploads.
  const replacement = 'const env: any = { DB: null, BUCKET: null, ADMIN_EMAIL: undefined };';
  writeFileSync(path, source.replace(marker, replacement));
}
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
