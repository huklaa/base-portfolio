# Analytics Methodology

This document explains how Base Portfolio Explorer derives its local analytics from public Base data. The goal is reproducibility and clarity rather than opaque scoring.

## Data source and scope

- Network: Base mainnet (`chainId 8453`).
- Primary source: Base Blockscout public APIs.
- Normal transaction history is currently capped at the first 10,000 indexed transactions returned by the explorer endpoint.
- Token balances and NFT holdings are current snapshots, not full historical balance series.

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

### Builder attribution

Current implementation performs best-effort detection of the repeating ERC-8021 marker at the end of transaction calldata. It is intentionally documented as a signal, not a complete decoder. A future parser will validate the full canonical data-suffix structure and decode codes where reliable.

Base documentation states that Builder Code attribution is appended as an ERC-8021 calldata suffix and can be verified by inspecting the repeating `8021` marker at the end of input data.

## Wallet archetypes

Archetypes are explainable labels selected from combinations of transaction volume, active days, app diversity, repeat depth, concentration, and detectable attribution signals. They are descriptive shortcuts, not identities or rankings.

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

## Machine-readable public profile

JSON export schema version `1.0.0` currently includes:

- Base chain metadata,
- public wallet address,
- portfolio summary,
- activity metrics,
- Economic Fingerprint,
- Behavior Delta,
- methodology labels,
- known data limits,
- safety metadata,
- project attribution.

No wallet connection, private key, signature, approval, or transaction is required to generate the export.

## Known limitations

- Explorer indexing and rate limits can produce partial results.
- Current token balances do not reconstruct historical stablecoin balances.
- Normal transactions alone are insufficient for a complete token-transfer/payment history.
- Contract addresses are not equivalent to app identities; one app may use many contracts and multiple apps may interact with the same protocol contracts.
- ERC-8021 support is currently signal detection, not full suffix decoding.
- Smart-account/user-operation activity may require additional data sources for complete coverage.

These limits are why the product presents explainable evidence instead of claiming authoritative identity, creditworthiness, reward eligibility, or economic value.
