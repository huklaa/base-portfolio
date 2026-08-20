# Analytics Methodology

This document explains how Base Portfolio Explorer derives its local analytics from public Base data. The goal is reproducibility and clarity rather than opaque scoring.

## Data source and scope

- Network: Base mainnet (`chainId 8453`).
- Primary source: Base Blockscout public APIs.
- Normal transaction history is currently capped at the first 10,000 indexed transactions returned by the explorer endpoint.
- Token balances and NFT holdings are current snapshots, not full historical balance series.
- Stablecoin-flow analytics use a bounded recent set of paginated ERC-20 token-transfer records rather than lifetime accounting.

## Activity Score

The Activity Score is a local heuristic from 0–100. It combines:

- transaction count: up to 35 points,
- distinct active days: up to 25 points,
- unique contract destinations: up to 20 points,
- current fungible-asset diversity: up to 10 points,
- currently indexed NFT ownership: up to 10 points.

Logarithmic transforms are used for transaction, active-day, and contract counts so extremely active wallets do not dominate the scale linearly.

This is not an official Base/Coinbase score and must not be interpreted as reward, eligibility, credit, risk, or reputation.

## Economic Fingerprint

The fingerprint describes wallet behavior using public normal transaction history.

### App diversity

Number of unique contract destinations called by the wallet, transformed onto a 0–100 display dimension.

### Repeat depth

`repeat contract calls / all contract calls`

A repeat call is a contract interaction whose destination appeared earlier in the indexed history.

### Breadth

`1 - top-app concentration`

Top-app concentration is the share of contract interactions sent to the most-used destination.

### Consistency

Approximate active days per month over the wallet's indexed Base lifetime, normalized for display.

### Longevity

Time between first and latest indexed Base transaction, logarithmically normalized.

## Builder Attribution Footprint / ERC-8021

The strict parser validates the complete 16-byte ERC-8021 marker at the end of transaction calldata:

`0x80218021802180218021802180218021`

A transaction is counted as attributed only when this exact marker is present at the end of even-length hexadecimal calldata.

### Schema ID

The byte immediately before the 16-byte marker is read as the schema ID.

### Schema 0 decoding

For canonical schema 0, the parser reads:

`[codes bytes][codesLength: 1 byte][schemaId: 1 byte][ERC-8021 marker: 16 bytes]`

The `codesLength` byte specifies how many bytes immediately precede it. Those bytes are decoded as text and split on commas into Builder Codes.

The parser validates bounds before decoding. Malformed lengths are rejected instead of truncated or guessed.

### Other schemas

Other schema IDs with the exact ERC-8021 marker are reported as detected attribution evidence, but their payload is not decoded unless that schema is explicitly implemented and validated. This avoids silently applying the wrong layout to future or registry-specific schemas.

### Fingerprint reconciliation

The Economic Fingerprint's Base-attribution dimension and `Attributed Builder Explorer` archetype are reconciled against this strict count. The earlier permissive marker signal is not treated as authoritative once the strict parser has run.

Builder attribution is evidence attached to transaction calldata; it is not proof of a person's identity or ownership of an application.

## Wallet archetypes

Archetypes are explainable labels selected from combinations of transaction volume, active days, app diversity, repeat depth, concentration, and strict attribution signals. They are descriptive shortcuts, not identities or rankings.

Examples include:

- Base Newcomer,
- Active Onchain User,
- Protocol Explorer,
- App Loyalist,
- Base Power User,
- Value Mover,
- Attributed Builder Explorer.

## Wallet Behavior Delta

Two fixed windows are compared relative to the current time:

- current window: latest 30 days,
- comparison window: the 30 days immediately before that.

For each window the project measures:

- normal transaction count,
- distinct active days,
- unique contract destinations,
- contract-call count,
- gas spent in ETH.

### New apps

A current-window contract destination is considered new when it does not appear anywhere in the indexed history before the current 30-day window.

### Revisited apps

A current-window contract destination is considered revisited when it also appears before the current 30-day window.

### Trend calculation

For a metric with non-zero previous value:

`((current - previous) / previous) × 100`

When the previous value is zero and the current value is non-zero, the UI displays the change as `new` instead of an infinite percentage.

## Base App Graph

The graph uses the ten most frequently called contract destinations in the indexed history.

For each relationship it records:

- contract address,
- interaction count,
- share of all contract calls,
- first interaction,
- latest interaction,
- whether the relationship is one-time or repeated.

Edge thickness is a visual transform of interaction count. Public contract names are fetched best-effort from Blockscout; an address remains the canonical identifier.

## Stablecoin & Payment Behavior

Recent ERC-20 token-transfer records are filtered to a documented set of recognizable stablecoin symbols. For the latest and previous 30-day windows, the project calculates:

- inbound and outbound transfer counts,
- priced inbound and outbound USD flow when an explorer exchange rate is available,
- net priced flow,
- transfer-count trend,
- top counterparties by number of stablecoin transfers,
- stablecoin mix by priced transfer flow.

These values are bounded by the fetched transfer pages. They are not lifetime cash-flow, income, solvency, credit, or risk measures. A future version should use verified token-contract allowlists instead of relying primarily on symbols.

## Machine-readable public profile

JSON export schema version `1.2.0` includes:

- Base chain metadata,
- public wallet address,
- portfolio summary,
- activity metrics,
- Economic Fingerprint,
- strict Builder Attribution Footprint,
- Behavior Delta,
- recent stablecoin flow when loaded,
- methodology labels,
- known data limits,
- safety metadata,
- project attribution.

No wallet connection, private key, signature, approval, or transaction is required to generate the export.

## Known limitations

- Explorer indexing and rate limits can produce partial results.
- Current token balances do not reconstruct historical stablecoin balances.
- Stablecoin flow is based on a bounded recent token-transfer fetch and recognized symbols, not audited accounting.
- Contract addresses are not equivalent to app identities; one app may use many contracts and multiple apps may interact with the same protocol contracts.
- ERC-8021 schema 0 is decoded, while unsupported schema payloads are intentionally left undecoded.
- Smart-account/user-operation activity may require additional data sources for complete coverage.

These limits are why the product presents explainable evidence instead of claiming authoritative identity, creditworthiness, reward eligibility, or economic value.
