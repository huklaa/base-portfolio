# Base Portfolio Explorer Roadmap

Base Portfolio Explorer is a read-only Base mainnet analytics tool. The product intentionally avoids wallet connection, signatures, approvals, swaps, transaction submission, credit/risk scoring, and unsupported reward or eligibility claims.

## Shipped

- Public Base address analysis with portfolio, indexed transaction history, active days, contract usage, gas estimates, NFTs, and journey milestones.
- Base Economic Fingerprint with explainable descriptive dimensions and wallet archetypes.
- Strict ERC-8021 builder attribution and ERC-4337 / UserOperation evidence.
- App Relationship Map and Behavior Delta.
- Verified-contract stablecoin flow analysis with 90-day coverage metadata.
- Descriptive stablecoin payment patterns and recurring counterparties.
- Evidence & Coverage panel that makes partial indexer history explicit.
- Machine-readable public profile v1.5 with JSON Schema.
- Transaction-type filters.
- Clear rate-limit, timeout, outage, and network-error states.
- Blockscout request deduplication to reduce redundant explorer traffic.
- Mobile usability pass and safe-area support.
- Shareable Base Card, native profile sharing, and canonical profile links.
- Custom production domain: https://base-portfolio.xyz.
- Recent-analysis shortcuts for locally revisiting addresses.
- Side-by-side public wallet comparison mode.
- Shared-link summary focus, clearer empty states, accessibility polish, and deploy smoke tests.

## Next candidates

These are intentionally not commitments and should be implemented only when they add clear user value without weakening the read-only trust model.

- Optional time-range controls for activity and behavior comparisons.
- More explicit indexer provenance per panel.
- Contract/app labeling from verifiable public metadata.
- Exportable comparison snapshots.
- Performance budgets and lightweight browser integration tests.
- Additional accessibility audits for screen readers and reduced-motion preferences.

## Product constraints

- Public onchain data only.
- No private wallet data or wallet connection required.
- No transaction submission or signing.
- No fabricated official Base/Coinbase metrics, rewards, airdrop eligibility, creditworthiness, solvency, income, or risk conclusions.
- Partial indexer coverage must be disclosed rather than silently treated as complete history.
