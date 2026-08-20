# Analytics Methodology

This document explains how Base Portfolio Explorer derives its local analytics from public Base data. The goal is reproducibility and clarity rather than opaque scoring.

## Data source and scope

- Network: Base mainnet (`chainId 8453`).
- Primary source: Base Blockscout public APIs.
- Normal transaction history is currently capped at the first 10,000 indexed transactions returned by the explorer endpoint.
- Token balances and NFT holdings are current snapshots, not full historical balance series.
- Stablecoin-flow analytics use a bounded recent set of paginated ERC-20 token-transfer records rather than lifetime accounting.
- Smart-account coverage uses Blockscout's ERC-4337 account-abstraction indexer on a best-effort basis.

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

For ERC-4337 wallets, Base documents that Builder Code suffixes are appended to `userOp.callData`, not transaction-level calldata. Normal-transaction parsing therefore cannot be treated as complete smart-account attribution coverage.

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

## Smart-account / ERC-4337 coverage

Base Accounts are backed by ERC-4337 smart wallets. Blockscout exposes an account-abstraction indexer for ERC-4337 accounts and user operations. The project queries the account record for the analyzed address and normalizes the result into a small evidence object.

### Evidence states

- `indexed`: Blockscout returned an account-abstraction record.
- `not-indexed`: no account record was returned.
- `unavailable`: the account-abstraction endpoint could not be queried successfully.

A `not-indexed` result is intentionally displayed as **not confirmed**. Absence from an explorer index is not proof that an address never used account abstraction.

### Coinbase Smart Wallet recognition

The project labels an indexed account as `Coinbase Smart Wallet` only when the reported factory matches a published deterministic Coinbase Smart Wallet factory:

- v1.1: `0xBA5ED110eFDBa3D005bfC882d75358ACBbB85842`
- v1.0: `0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a`

Other ERC-4337 accounts remain `unclassified` rather than being guessed from contract bytecode or naming.

### EntryPoint recognition

When reported by the indexer, the project recognizes Base's canonical ERC-4337 EntryPoint deployments:

- v0.6: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- v0.7: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

The presence of bytecode at an address is not used as proof of Base Account membership.

## Machine-readable public profile

JSON export schema version `1.3.0` includes:

- Base chain metadata,
- public wallet address,
- portfolio summary,
- activity metrics,
- Economic Fingerprint,
- strict Builder Attribution Footprint,
- Behavior Delta,
- recent stablecoin flow when loaded,
- smart-account / ERC-4337 evidence,
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
- Account-abstraction indexing can be incomplete or temporarily unavailable.
- Smart-account recognition only labels explicitly allowlisted Coinbase Smart Wallet factory deployments; other wallet families are not guessed.
- UserOperation-level Builder Code decoding remains a future phase because ERC-8021 data for smart wallets lives in `userOp.callData` and requires reliable operation-level access.

These limits are why the product presents explainable evidence instead of claiming authoritative identity, creditworthiness, reward eligibility, or economic value.
