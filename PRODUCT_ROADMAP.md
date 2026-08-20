# Base Portfolio Explorer — Product Roadmap

## Product thesis

Base Portfolio Explorer should not compete as another generic multi-chain balance tracker. Its wedge is **Base-native, explainable wallet intelligence**: turn a public Base address into a compact description of how that wallet participates in the Base economy.

The current Economic Fingerprint is the first step. It combines app diversity, repeat usage, concentration, cadence, longevity, transaction attribution signals, app relationships, and a plain-language wallet archetype.

## Why this direction

Generic portfolio products already cover balances, token/NFT holdings, P/L, and multi-chain tracking well. A stronger Base-native product should focus on signals that are especially useful inside the Base ecosystem:

- app relationships and repeat usage,
- transaction attribution / Builder Codes (ERC-8021),
- Base-specific activity history,
- behavioral change over time,
- shareable public wallet summaries,
- builder/growth analytics that can eventually be consumed by humans or agents.

This direction also matches Base's 2026 emphasis on global markets, payments/stablecoins, agents, builders, Builder Codes, analytics, and measurable ecosystem growth.

## Phase 1 — Economic Fingerprint (implemented in PR #4)

- Explainable wallet archetype.
- App diversity and repeat depth.
- Top-app concentration.
- Active-day cadence and wallet longevity.
- Top contract/app relationships.
- ERC-8021 attribution signal detection.
- First-attribution milestone in the wallet timeline.
- Fingerprint included in the downloadable Base Card.

### Guardrails

All scores/classifications are local heuristics. They must never be presented as official Base/Coinbase, credit, risk, reputation, reward, airdrop, or eligibility scores.

## Phase 2 — Wallet Behavior Delta (implemented in PR #4)

A time-aware view now answers **"how is this wallet changing?"** rather than only describing all-time history.

Implemented comparisons:

- latest 30 days vs previous 30 days,
- new contract destinations discovered,
- previously used destinations revisited,
- active days gained/lost,
- transaction count trend,
- contract/app diversity trend,
- gas-spend trend,
- plain-language behavior-change summary.

The implementation deliberately does **not** claim a historical stablecoin-allocation trend yet because the current data source only loads present token balances plus normal transaction history. That feature belongs in the stablecoin/payment phase once reliable token-transfer history is added.

## Phase 3 — Base App Graph

Turn contract destinations into a lightweight relationship graph:

- wallet → app/contract edges,
- interaction count,
- first/last interaction,
- repeat usage,
- share of wallet activity,
- explorer links,
- verified contract/app labels when public data provides them.

The goal is not to become a full blockchain explorer. The graph should answer: **"Which Base apps does this wallet actually have a relationship with?"**

## Phase 4 — Stablecoin & Payment Behavior

Add Base-specific money-flow summaries without making financial-risk claims:

- stablecoin assets held,
- stablecoin transfer activity,
- inbound vs outbound transfer counts,
- recurring counterparties,
- payment-like transaction cadence,
- stablecoin concentration,
- historical stablecoin activity trend when reliable token-transfer data is available.

This should remain descriptive, not a credit score.

## Phase 5 — Builder Attribution Footprint

Improve ERC-8021 support beyond a binary signal:

- strict detection of the ERC-8021 sentinel,
- attributed transaction count and share,
- first/last detected attribution,
- multiple-code awareness where reliably decodable,
- links to Base documentation / validation tools,
- clearly label best-effort detection limitations.

Potential builder-facing view: "What share of this address's onchain activity contains Base-native attribution signals?"

## Phase 6 — Public Profile & API

Create stable, shareable read-only profiles:

- URL-addressable wallet profile,
- JSON export,
- compact machine-readable fingerprint,
- optional API endpoint for app/agent consumption,
- versioned heuristic metadata so results can be reproduced.

This turns the project from a page into a reusable Base wallet-intelligence layer.

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
2. At least one clearly explainable insight unavailable from a raw block explorer.
3. Reliable mobile UX.
4. A reproducible methodology documented in the repository.
5. Real usage: public profiles analyzed, repeat visitors, shared Base Cards, or direct feedback from Base users/builders.
6. A clear path from consumer explorer → developer/growth intelligence API.

## Positioning

Short version:

> **Base Portfolio Explorer turns any public Base address into an explainable economic fingerprint — showing app relationships, activity behavior, attribution signals, and how that behavior changes over time.**

The aim is not to claim that nobody has ever built wallet analytics. The defensible differentiation is the **combination of Base-first scope, explainable behavioral profiling, ERC-8021-aware attribution, relationship mapping, and a future machine-readable intelligence layer.**
