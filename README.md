# Base Portfolio Explorer

A read-only Base mainnet portfolio and activity explorer for public EVM addresses.

## Live app

https://huklaa.github.io/base-portfolio/

## What it does

- Reads ETH and ERC-20 balances on Base mainnet.
- Calculates portfolio value and token allocation when explorer price data is available.
- Supports optional manual cost basis, P/L, stablecoin share, and target-allocation comparison.
- Shows recent Base transactions and links each one to Base Blockscout.
- Calculates an independent Base Activity Score from transaction count, active days, unique contract interactions, asset diversity, and NFT ownership.
- Shows first activity, first contract interaction, NFT ownership milestone, and latest indexed activity in an onchain timeline.
- Estimates historical gas spent in ETH from indexed transactions and shows its approximate value at the current ETH exchange rate.
- Displays currently indexed Base NFTs.
- Generates a downloadable shareable Base Card with public wallet analytics.
- Includes useful links to Base, Base documentation, ecosystem resources, Blockscout, and GitHub.

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

- Base Blockscout public APIs for address, token, NFT, and transaction data.
- Base mainnet, chain ID `8453`.

Explorer APIs may rate-limit requests or return partial data. Transaction-derived activity metrics are capped at the first 10,000 transactions returned by the explorer endpoint and the UI clearly labels this when applicable.

## Activity Score

The Activity Score is a local heuristic created for this project. It is **not an official Base, Coinbase, reward, eligibility, airdrop, or reputation score**.

## Creator

- X: https://x.com/1kipcak
- GitHub: https://github.com/huklaa

Independent community project. Not affiliated with Coinbase or Base.
