# Base Portfolio Explorer — Product Roadmap

## Product thesis

Base Portfolio Explorer should not compete as another generic multi-chain balance tracker. Its wedge is **Base-native, explainable wallet intelligence**: turn a public Base address into a compact description of how that wallet participates in the Base economy.

The current product combines an Economic Fingerprint, time-aware Behavior Delta, app relationships, recent stablecoin/payment behavior, strict Builder Attribution evidence, and machine-readable public exports.

## Why this direction

Generic portfolio products already cover balances, token/NFT holdings, P/L, and multi-chain tracking well. A stronger Base-native product should focus on signals that are especially useful inside the Base ecosystem: app relationships, ERC-8021 attribution, Base-specific activity history, behavior change, stablecoin/payment flow, and analytics consumable by humans or agents.

## Phase 1 — Economic Fingerprint (implemented in PR #4)

- Explainable wallet archetype.
- App diversity and repeat depth.
- Top-app concentration.
- Active-day cadence and wallet longevity.
- Top contract/app relationships.
- Base attribution dimension.
- Fingerprint included in the downloadable Base Card.

### Guardrails

All scores/classifications are local heuristics. They must never be presented as official Base/Coinbase, credit, risk, reputation, reward, airdrop, or eligibility scores.

## Phase 2 — Wallet Behavior Delta (implemented in PR #4)

- latest 30 days vs previous 30 days,
- new contract destinations discovered,
- previously used destinations revisited,
- active days gained/lost,
- transaction count trend,
- contract/app diversity trend,
- gas-spend trend,
- plain-language behavior-change summary.

## Phase 3 — Base App Graph (implemented in PR #4)

- wallet → app/contract edges,
- interaction count and weighted edges,
- first/last interaction,
- repeat usage,
- share of wallet contract activity,
- explorer links,
- best-effort public contract labels from Blockscout.

## Phase 4 — Stablecoin & Payment Behavior (first version implemented in PR #4)

Implemented from recent Blockscout ERC-20 transfer history:

- recognized stablecoin transfer filtering,
- 30-day inbound/outbound transfer counts,
- priced inbound/outbound USD flow when exchange-rate data is available,
- net priced flow,
- transfer-count change vs previous 30 days,
- top/recurring counterparties,
- stablecoin mix by transfer flow.

Still planned:

- deeper pagination / longer historical coverage,
- payment-like pattern classification and cadence,
- contract-address allowlists rather than symbol-only recognition,
- smart-account/user-operation transfer coverage,
- historical stablecoin balance reconstruction where reliable.

This remains descriptive, not a credit, income, solvency, or risk score.

## Phase 5 — Builder Attribution Footprint (strict schema-0 version implemented in PR #4)

Implemented:

- validates the exact ERC-8021 16-byte marker `0x80218021802180218021802180218021`,
- attributed transaction count and share,
- canonical schema-0 Builder Code decoding,
- unique/top decoded codes,
- first/latest strict attribution,
- detected schema-ID counts,
- unsupported schema IDs are detected but intentionally not guessed,
- reconciles the Economic Fingerprint attribution dimension and attributed archetype against strict evidence.

Still planned:

- validated parsing for additional ERC-8021 schemas,
- code-registry metadata/links where authoritative,
- richer builder-facing attribution summaries.

## Phase 6 — Public Profile & API (partially implemented in PR #4)

Implemented now:

- URL-addressable wallet analysis via `?address=`,
- downloadable JSON public profile v1.2,
- copyable machine-readable JSON,
- chain, methodology, data-limit, and safety metadata,
- Economic Fingerprint, strict Builder Attribution, Behavior Delta, and recent stablecoin-flow summaries in export.

Still planned:

- stable hosted profile URLs independent of client state,
- optional API endpoint for app/agent consumption,
- formal JSON Schema,
- versioned heuristic methodology so old results can be reproduced exactly.

## Phase 7 — Builder / Growth View

Longer-term B2B direction:

- compare cohorts of public addresses,
- app retention / repeat-usage summaries,
- acquisition-source attribution where ERC-8021 data supports it,
- overlap between apps,
- returning-vs-exploring behavior,
- aggregate privacy-preserving views rather than exposing unnecessary user-level detail.

## What not to build yet

Avoid diluting the product with generic features already done well elsewhere unless they directly support the Base-native intelligence thesis:

- generic multi-chain portfolio tracking,
- swaps/trading execution,
- wallet custody,
- copy trading,
- opaque "alpha" or airdrop eligibility scores,
- financial/credit risk ratings.

## Near-term success criteria

Before an accelerator application, the product should demonstrate:

1. A working Base-native differentiator, not just a portfolio page.
2. Clearly explainable insights unavailable from a raw block explorer.
3. Reliable mobile UX.
4. A reproducible methodology documented in the repository.
5. Real usage: public profiles analyzed, repeat visitors, shared Base Cards, or direct feedback from Base users/builders.
6. A clear path from consumer explorer → developer/growth intelligence API.

## Positioning

> **Base Portfolio Explorer turns any public Base address into an explainable economic fingerprint — showing app relationships, activity behavior, stablecoin movement, strict attribution evidence, and how that behavior changes over time.**

The defensible differentiation is the **combination of Base-first scope, explainable behavioral profiling, strict ERC-8021-aware attribution, relationship mapping, time-aware change analysis, stablecoin/payment behavior, and a machine-readable intelligence layer.**
