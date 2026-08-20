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
- Builds a **Base Economic Fingerprint** from public transaction history:
  - app/contract diversity,
  - repeat contract usage,
  - top-app concentration,
  - activity cadence,
  - wallet longevity,
  - detectable ERC-8021 Builder Code attribution signals.
- Assigns an explainable behavioral archetype such as Protocol Explorer, App Loyalist, Base Power User, or Attributed Builder Explorer.
- Shows an **App Relationship Map** with the wallet's most-used contract destinations and interaction counts.
- Adds a **Wallet Behavior Delta** comparing the latest 30 days with the previous 30 days:
  - transaction activity trend,
  - active-day trend,
  - contract/app diversity trend,
  - gas-spend trend,
  - newly discovered contract destinations,
  - previously used destinations revisited,
  - a plain-language summary of the behavioral change.
- Adds a visual **Base App Graph**:
  - wallet → contract relationship edges,
  - interaction-weighted edge strength,
  - first and last interaction dates,
  - repeat-vs-one-time relationships,
  - top relationship share,
  - best-effort public contract labels from Blockscout.
- Generates plain-language behavioral insights rather than hiding the result behind a single opaque score.
- Shows first activity, first contract interaction, first detectable Builder Code attribution, NFT ownership milestone, and latest indexed activity in an onchain timeline.
- Estimates historical gas spent in ETH from indexed transactions and shows its approximate value at the current ETH exchange rate.
- Displays currently indexed Base NFTs.
- Generates a downloadable shareable Base Card containing public wallet analytics and the wallet archetype.
- Exports a **machine-readable JSON public profile** for builders and agents, including chain metadata, activity, Economic Fingerprint, Behavior Delta, methodology flags, data limits, and safety metadata.
- Generates a shareable address URL without connecting the wallet.
- Includes useful links to Base, Base documentation, ecosystem resources, Blockscout, and GitHub.

## Why the Economic Fingerprint exists

Most portfolio products focus on balances, P/L, alerts, or broad multi-chain wallet tracking. This project is intentionally Base-first and focuses on explainable economic behavior: whether a wallet explores many apps, repeatedly returns to the same apps, concentrates activity in one destination, stays active over time, and carries Base-native transaction-attribution signals.

The fingerprint is deliberately descriptive rather than judgmental. It is designed to become useful for users, builders, growth teams, and eventually agents that need a compact public summary of Base behavior.

The Behavior Delta adds a second dimension: not only **what kind of Base user is this wallet?**, but also **how is its behavior changing right now?** The App Graph makes those relationships visible, and the JSON profile makes the analysis reusable outside the page.

## Privacy and safety

This app is deliberately read-only.

It does **not**:

- connect a wallet,
- request a signature,
- request a private key,
- request an approval,
- execute a swap,
- transfer assets,
- or submit any blockchain transaction.

Only a public EVM address is required.

## Data sources

- Base Blockscout public APIs for address, token, NFT, transaction, and best-effort contract label data.
- Base mainnet, chain ID `8453`.

Explorer APIs may rate-limit requests or return partial data. Transaction-derived activity metrics are capped at the first 10,000 transactions returned by the explorer endpoint and the UI clearly labels this when applicable.

## Scores and classifications

The Activity Score, Economic Fingerprint dimensions, behavioral archetypes, and Behavior Delta summaries are local heuristics created for this project. They are **not official Base, Coinbase, credit, risk, reward, eligibility, airdrop, or reputation scores**.

ERC-8021 detection is a best-effort check for the attribution sentinel in indexed transaction calldata. A zero count does not prove that an app or wallet never used Builder Codes, and a detected suffix should be treated as a public attribution signal rather than an identity claim.

## Quality checks

The repository includes standalone Node tests for the 30-day Behavior Delta and App Graph aggregation logic, plus GitHub Actions syntax/test checks for the browser modules.

## Creator

- X: https://x.com/1kipcak
- GitHub: https://github.com/huklaa

Independent community project. Not affiliated with Coinbase or Base.
