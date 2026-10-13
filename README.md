# CHAMÉA Boutique

Source code exported from the CHAMÉA Boutique Site. It includes the storefront, product and blog pages, shopping interactions, and the integrated `/studio` editor.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

The local app runs with the Vinext/Cloudflare Worker stack. Use the terminal URL printed by the dev server.

## Keep all features when deploying

The integrated Studio and image uploads use server routes, ChatGPT sign-in, a D1 database, and an R2 bucket. Set the `ADMIN_EMAIL` runtime variable to the authorized editor's email, and provision D1 (`DB`) and R2 (`BUCKET`) bindings before deploying.

GitHub Pages only serves static files. It cannot run these API routes, ChatGPT sign-in, D1, or R2, so publishing this project on Pages alone will not preserve Studio editing or image uploads. Use a Cloudflare Workers compatible deployment (Cloudflare's free plan may be sufficient) to keep the full feature set. See [DEPLOYMENT.md](DEPLOYMENT.md) for the requirements and options.

## Included

- `app/`: storefront, integrated Studio, and server routes
- `public/`: brand assets, fonts, styles, and interactive storefront scripts
- `lib/seed.json`: default store/editor content
- `scripts/`, `build/`, and `vite.config.ts`: Vinext/Cloudflare build support
- `.openai/hosting.json`: original Sites binding names and project metadata

## Notes

Store/cart/favorites and order flow are a demo experience. The checkout does not submit real payments or orders.