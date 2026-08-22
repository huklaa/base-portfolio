# Base Rank methodology

Base Rank is a Base-native activity comparison built from public Base chain data.

## What is indexed

The scheduled indexer samples externally owned accounts (EOAs) observed in recent public Base transactions via Base Blockscout. The sample grows over time and is refreshed every six hours.

The UI deliberately says **indexed active wallets** until the index reaches full-chain coverage. It does not present the sample as every address ever created on Base.

## Rank score

Each indexed address is scored from Blockscout public address counters:

- transaction count: 60% of the score,
- token-transfer count: 40% of the score.

Both components are logarithmically scaled and the combined score is capped at 100. This prevents a few extremely high-volume wallets from making the rest of the distribution meaningless.

The current formula is:

- `txPart = min(60, log10(transactions + 1) / 4 * 60)`
- `transferPart = min(40, log10(tokenTransfers + 1) / 4 * 40)`
- `Base Rank Score = round(min(100, txPart + transferPart))`

This ranking score is separate from the richer **Base Activity Score** shown in the wallet dashboard. The Activity Score uses the wallet's fetched history, active days, contract interactions, assets and NFTs. Base Rank uses lightweight counters so thousands of public wallets can be compared consistently without pretending the indexer has complete deep history for every wallet.

## Refresh and coverage

`.github/workflows/base-rank-index.yml` runs the indexer every six hours and after the feature is deployed. Each run discovers recent active EOAs, adds a bounded number of new wallets, refreshes chain statistics and commits `data/base-rank-index.json`.

The public UI shows the current indexed sample size and refresh time. The chain-wide address count reported by Blockscout is context only and is **not** used as the rank denominator until those addresses are actually indexed.

## Privacy

All data used by Base Rank is already public on Base. No wallet connection, signature, private key, approval or transaction is requested.

A future ZK-verified layer can add opt-in proofs without changing the public Base Rank methodology.
