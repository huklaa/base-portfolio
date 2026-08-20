# Base Portfolio Explorer

A read-only Base mainnet portfolio, activity, and wallet-behavior explorer for public EVM addresses.

## Live app

https://huklaa.github.io/base-portfolio/

## Product direction

The project is evolving from a simple portfolio viewer into a Base-native wallet intelligence layer. The goal is to explain **how a wallet participates in the Base economy**, not merely what it currently holds.

## What it does

- Reads ETH and ERC-20 balances on Base mainnet.
- Calculates portfolio value and token allocation when explorer price data is available.
- Supports optional manual cost basis, P/L, stablecoin share, and target-allocation comparison.
- Shows the latest Base transactions with transaction type, timestamp, and direct Blockscout link.
- Calculates an independent Base Activity Score from transaction count, active days, unique contract interactions, asset diversity, and NFT ownership.
- Builds a **Base Economic Fingerprint** from public transaction history: app diversity, repeat usage, top-app concentration, cadence, longevity, and Base-native attribution.
- Assigns explainable behavioral archetypes such as Protocol Explorer, App Loyalist, Base Power User, or Attributed Builder Explorer.
- Adds a **Wallet Behavior Delta** comparing the latest 30 days with the previous 30 days for transactions, active days, app diversity, gas spend, newly discovered apps, and revisited apps.
- Adds a visual **Base App Graph** with wallet → contract relationships, interaction-weighted edges, first/last interaction dates, repeat usage, top relationship share, explorer links, and best-effort Blockscout contract labels.
- Adds **Stablecoin & Payment Behavior** from recent indexed ERC-20 transfer history: 30-day inbound/outbound flow, net priced flow, transfer trends, counterparties, and stablecoin mix. Stablecoins are accepted only through an explicit Base contract allowlist; token symbols alone are not trusted.
- Adds a **Builder Attribution Footprint** with strict ERC-8021 marker validation:
  - validates the exact 16-byte `0x80218021802180218021802180218021` suffix,
  - reports attributed transaction count and share,
  - decodes canonical schema-0 Builder Codes,
  - reports unique and top decoded codes,
  - detects unsupported schema IDs without speculative decoding,
  - shows first/latest strict attribution milestones.
- Adds **Smart-account / ERC-4337 coverage** using Blockscout's account-abstraction indexer when available.
  - does not classify a contract wallet as a Base Account merely because code exists at the address,
  - recognizes Coinbase Smart Wallet factory v1.0 and v1.1 only when factory evidence matches the published deployment addresses,
  - recognizes Base ERC-4337 EntryPoint v0.6 and v0.7 addresses when reported,
  - treats a missing or unavailable indexer result as inconclusive rather than proof of non-use.
- Adds **ERC-8021 attribution inside ERC-4337 UserOperations**:
  - fetches sender-filtered UserOperations from Blockscout,
  - reads `userOp.callData` instead of transaction-level calldata,
  - applies the same strict ERC-8021 parser,
  - reports attributed UserOps, decoded schema-0 codes, detected schemas, and first/latest attribution,
  - explicitly labels the result as a bounded paginated view rather than lifetime accounting.
- Generates plain-language behavioral insights rather than hiding results behind a single opaque score.
- Estimates historical gas spent in ETH from indexed normal transactions.
- Displays currently indexed Base NFTs.
- Generates a downloadable shareable Base Card containing public wallet analytics and the wallet archetype.
- Exports a **machine-readable JSON public profile (v1.4)** for builders and agents, including activity, Economic Fingerprint, normal-transaction Builder Attribution, UserOperation Builder Attribution, Behavior Delta, stablecoin flow, smart-account evidence, methodology flags, data limits, and safety metadata.
- Generates a shareable address URL without connecting the wallet.

## Why this exists

Most portfolio products focus on balances, P/L, alerts, or broad multi-chain tracking. This project is intentionally Base-first and focuses on explainable economic behavior: which apps a wallet uses, which ones it returns to, how concentrated its activity is, how behavior changes over time, how stable value moves through it, which Base-native attribution signals are publicly visible, and whether public ERC-4337 account-abstraction evidence exists.

The analysis is descriptive rather than judgmental. It is intended to become useful for users, builders, growth teams, and agents that need a compact public summary of Base behavior.

## Privacy and safety

This app is deliberately read-only. It does **not** connect a wallet, request a signature/private key/approval, execute a swap, transfer assets, or submit any blockchain transaction. Only a public EVM address is required.

## Data sources

- Base Blockscout public APIs for address, token, NFT, normal transaction, token-transfer, account-abstraction/UserOperation, and best-effort contract label data.
- Base mainnet, chain ID `8453`.

Explorer APIs may rate-limit requests or return partial data. Normal-transaction activity metrics are capped at the first 10,000 transactions returned by the explorer endpoint. Stablecoin flow is limited to the recent paginated ERC-20 transfer records fetched by the client and is not lifetime accounting. Account-abstraction and UserOperation indexing can also be incomplete or temporarily unavailable.

## Scores and classifications

The Activity Score, Economic Fingerprint dimensions, behavioral archetypes, and Behavior Delta summaries are local heuristics created for this project. They are **not official Base, Coinbase, credit, risk, reward, eligibility, airdrop, or reputation scores**.

Builder attribution is transaction/UserOperation evidence, not an identity claim. Schema 0 is decoded; other detected ERC-8021 schema IDs remain undecoded unless their structure is implemented and validated. Likewise, smart-account labeling is evidence-based: recognized Coinbase Smart Wallet labels require a matching published factory address, and an absent indexer record is not treated as proof that an address never used account abstraction.

## Methodology

See `METHODOLOGY.md` for formulas, data scope, assumptions, and known limitations.

## Quality checks

The repository includes standalone Node tests for strict ERC-8021 parsing, UserOperation attribution, Behavior Delta, App Graph aggregation, stablecoin-flow summaries, and smart-account response normalization, plus GitHub Actions syntax/test checks for the browser modules.

## Creator

- X: https://x.com/1kipcak
- GitHub: https://github.com/huklaa

Independent community project. Not affiliated with Coinbase or Base.
