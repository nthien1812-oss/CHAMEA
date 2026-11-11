# CHAMÉA AI Stylist — Gemini + retrieval-augmented generation

Separate backend for the existing static CHAMÉA website hosted on GitHub Pages.

## Architecture

* Front-end is left in `public/app.js` and stays on GitHub Pages.
* Vercel API at `/api/chat` retrieves relevant knowledge chunks from `data/knowledge.json` (lightweight **lexical RAG**, not Gemini File Search or a vector database).
* Product search/filtering is based on verified IDs in `data/catalog.json` with a refresh from the published `/CHAMEA/products.json` when reachable.
* Gemini generates text from only the retrieved catalog and knowledge chunks. Output product IDs are validated against retrieved products.
* The original client-side FAQ remains fallback if the backend is not configured or temporarily unavailable.

## Deploy

1. In Vercel import `nthien1812-oss/CHAMEA` as a **new, separate project**, with **Root Directory** set to `chamea-ai` and Framework Preset **Other**. Do not change the existing CHAMÉA storefront deployment.
2. In Vercel Project Settings → Environment Variables set `GEMINI_API_KEY` (secret; never commit or paste into client code). Optional `GEMINI_MODEL=gemini-2.5-flash`.
3. Deploy and check `https://<your-vercel-deployment-domain>/api/chat`. GET should return `{"status":"ready"}` once key is set. POST is only accepted for the authorized GitHub Pages Origin.
4. Set `aiChatEndpoint` in `public/data.js` to the **actual** deployed `https://<your-vercel-deployment-domain>/api/chat` URL. Commit; GitHub Pages auto deploys. Empty value retains the old chatbot.
5. Test sample questions about budget, recipient, bag model, unknown stock, warranty, shipping and privacy. Confirm no API key is exposed in GitHub Pages assets.

## Safety and operations

* Source catalog and policies are demo data. Chat does not make real bookings/orders, verify real stock or promise delivery/returns. Product prices are indicative, not final.
* IP-based throttling in a serverless function is best effort only; before a public marketing launch, add durable quota/abuse protection via Vercel WAF or persistent rate-limit service, set API quota and billing alerts in Google AI Studio.
* Third-party text processing: chat messages are sent to Vercel and Google's Gemini service. Publish an accurate privacy notice and request consent before production use.
* Knowledge base is a maintained reviewable JSON file; if policies/price are officially confirmed later, review and update it accordingly.
* This is **local retrieval-augmented generation**, suitable for a small catalog. For semantic document search at larger scale, add managed File Search or embeddings/vector search later.
