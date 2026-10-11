# Base explorer provider

Blockscout's v12 migration deprecates per-instance public APIs. The documented PRO API supports Base (8453), but every tier requires an API key, including the free tier.

Official references:
- https://docs.blockscout.com/devs/apis
- https://docs.blockscout.com/devs/pro-api
- https://docs.blockscout.com/devs/pro-api-responses-and-routes

## Cloudflare Pages configuration

Obtain a key through the official Blockscout PRO portal linked in those docs. Add `BLOCKSCOUT_API_KEY` as an encrypted secret in the existing Cloudflare Pages project's production environment (and preview if desired), then redeploy. Never put the key in Git, client JavaScript, a URL, or chat.

`/api/explorer-config` exposes only a configured boolean. When true, the browser gate forwards read-only explorer calls to `/api/explorer`, which allows only this app's Base endpoints and supplies server-side authorization to `https://api.blockscout.com/8453`. There are no transaction submission routes. The proxy validates JSON without rounding integer fields and suppresses upstream error bodies.

Without a key the existing public explorer URL remains in use, and can fail due to provider migration or access restrictions. A 403/challenge is not retried. The proxy itself returns 503 if unconfigured. Missing transaction history remains an explicit error, never a zero-activity wallet.

Requests and response bodies have deadlines. Canceled requests are never retried, and release the queue so later wallet searches can proceed.

## Verification after configuration

1. Open `/tests/explorer-provider.html` on the deployed site and confirm configured is true.
2. Load a public active Base wallet. Inspect network calls to `/api/explorer`: successful JSON and no credentials in browser requests.
3. Verify transaction charts, compare two wallets, and export CSV with actual loaded transactions.
4. Verify an empty wallet has a genuine successful empty API response, and an unavailable API shows an explicit error.

A configured boolean alone does not prove the key is valid or that upstream data works. Production data verification requires successful API responses and UI checks.


## Envio history provider

Set `ENVIO_API_TOKEN` as a production Cloudflare Pages secret and redeploy.
`/api/explorer-config` exposes only the selected history provider, never the key.
The read-only `/api/history` adapter queries the fixed Base HyperSync endpoint.
The browser scans from genesis, pins the first response's end block and rejects
incomplete scans, more than 10,000 rows, invalid cursors and upstream failures.
Gas metrics retain their existing L2 execution scope; L1 fees are separately
preserved in history rows, not included in those metrics.
This provider replaces transaction history only, not token/NFT balance discovery.
Blockscout Free no longer includes Base as of October 1, 2026; do not assume a
free Blockscout key restores those endpoints. Envio's free package is rate limited.

References: https://docs.envio.dev/docs/HyperSync/hypersync-query and
https://docs.envio.dev/docs/HyperSync/api-tokens
