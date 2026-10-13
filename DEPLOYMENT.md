# Deployment notes

## GitHub Pages

GitHub Pages serves static files. This project is a server-rendered Vinext app with API routes and Cloudflare bindings; Pages cannot run the content API, ChatGPT sign-in, D1, or R2. A Pages-only deployment would lose Studio publishing, image upload, and authentication. The current app is not configured as a static export.

## Preserve the integrated Studio

Use a runtime that supports the Cloudflare Worker/Vinext server build, with D1 binding `DB`, R2 binding `BUCKET`, and a private `ADMIN_EMAIL` runtime variable. Apply the migration in `drizzle/0000_cloudy_shard.sql` to create `site_content`.

The included `vite.config.ts` retains the original Sites integration. The original ChatGPT sign-in flow and identity headers are Sites-dispatch features. When deploying outside Sites, configure an authentication provider and update `app/chatgpt-auth.ts` plus the admin authorization checks to match it before exposing the editor. Do not deploy the editor without an authenticated identity and server-side allowlist.

The original Sites project ID was removed from `.openai/hosting.json`. Binding names remain `DB` and `BUCKET`; create equivalent resources in the target account and configure them there.

## Demo behavior

Cart, favorites, and the order flow are browser-side demo interactions. No payment is collected and orders are not sent to CHAMÉA.
