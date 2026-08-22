# Base Portfolio

**Base-native wallet intelligence for public EVM addresses.**  
Understand not only what a wallet holds, but **how it participates in the Base economy**.

[![Live App](https://img.shields.io/badge/Live-base--portfolio.xyz-0052FF?style=for-the-badge)](https://base-portfolio.xyz/)
[![Base](https://img.shields.io/badge/Network-Base-0052FF?style=for-the-badge)](https://base.org/)
[![Read Only](https://img.shields.io/badge/Wallet-read--only-success?style=for-the-badge)](#privacy-and-safety)

> No wallet connection. No signature. No private key. Enter any public Base address and explore.

## Try it

**Live:** https://base-portfolio.xyz/

Fallbacks:
- Cloudflare Pages: https://base-portfolio.pages.dev/
- GitHub Pages: https://huklaa.github.io/base-portfolio/

## Why Base Portfolio is different

Most portfolio tools answer **“What does this wallet hold?”**

Base Portfolio also asks:

- Which Base apps does this wallet actually use?
- Does it return to the same protocols or explore new ones?
- How has its behavior changed over the last 30 days?
- What stablecoin and payment patterns are visible?
- Is there public ERC-4337 / smart-account evidence?
- Are ERC-8021 builder-attribution signals present?

The result is an explainable, Base-first public wallet profile instead of a single opaque score.

## Highlights

- **Portfolio overview** — ETH/ERC-20 balances, value, allocation and optional manual cost basis.
- **Base Activity Score** — derived from transaction count, active days, contract interactions, asset diversity and NFT ownership.
- **Base Economic Fingerprint** — app diversity, repeat usage, concentration, cadence, longevity and Base-native attribution.
- **Behavior archetypes** — explainable labels such as Protocol Explorer, App Loyalist and Base Power User.
- **Wallet Behavior Delta** — compares the latest 30 days with the previous 30 days.
- **Base App Graph** — visual wallet → contract relationships with interaction-weighted edges.
- **Stablecoin & Payment Behavior** — recent inbound/outbound flow, counterparties, stablecoin mix and trends.
- **ERC-8021 Builder Attribution** — strict marker validation and canonical schema-0 decoding.
- **ERC-4337 / smart-account coverage** — evidence-based detection using indexed account-abstraction data.
- **ERC-8021 inside UserOperations** — attribution analysis from `userOp.callData`.
- **NFT coverage** — currently indexed Base NFTs.
- **Shareable Base Card** — downloadable public wallet analytics card.
- **Machine-readable JSON profile** — public profile output for builders and agents.
- **Shareable address URLs** — analyze a wallet without connecting it.

## Built for

- Base users who want a clearer view of their onchain behavior
- Builders researching real wallet activity
- Growth and ecosystem teams studying app usage patterns
- Agents and developer tools that need compact public wallet intelligence

## Privacy and safety

Base Portfolio is deliberately **read-only**.

It does **not**:

- connect a wallet,
- request signatures,
- request private keys,
- request token approvals,
- execute swaps,
- transfer assets,
- submit blockchain transactions.

Only a public EVM address is required.

## Data sources

- Base Blockscout public APIs
- Base mainnet — chain ID `8453`

The app uses explorer/indexer data for balances, tokens, NFTs, transactions, token transfers, contract labels and account-abstraction/UserOperation evidence.

Explorer APIs may rate-limit requests or return partial data. The UI is designed to surface coverage limitations instead of pretending incomplete data is complete.

## Reliability philosophy

A wallet intelligence product is only useful when it is honest about its data.

Base Portfolio therefore prefers:

- explicit coverage indicators,
- fallback data paths where possible,
- bounded-query labels,
- evidence-based classifications,
- transparent methodology,
- no speculative identity or eligibility claims.

## Scores and classifications

The Activity Score, Economic Fingerprint dimensions, behavioral archetypes and Behavior Delta summaries are local heuristics created for this project.

They are **not official Base, Coinbase, credit, risk, reward, eligibility, airdrop or reputation scores**.

Builder attribution is transaction/UserOperation evidence, not an identity claim. Smart-account labeling is also evidence-based: a contract wallet is not classified as a Base Account merely because code exists at the address.

## Methodology

See [`METHODOLOGY.md`](METHODOLOGY.md) for formulas, scope, assumptions and known limitations.

## Quality checks

The repository includes standalone Node tests covering areas such as:

- strict ERC-8021 parsing,
- UserOperation attribution,
- Behavior Delta,
- App Graph aggregation,
- stablecoin-flow summaries,
- smart-account response normalization,
- activity-filter syntax,
- data-coverage handling.

GitHub Actions checks are also included for browser modules.

## Roadmap

The project is evolving from a portfolio viewer into a **Base-native wallet intelligence layer**.

Near-term direction:

- stronger app/protocol attribution,
- better historical behavior comparison,
- richer stablecoin/payment intelligence,
- more transparent data-quality indicators,
- improved agent-readable wallet profiles,
- more shareable Base-native insights.

## Contributing

Useful issues, bug reports, data-quality edge cases and focused pull requests are welcome.

If you find a wallet that produces an incorrect or confusing result, opening an issue with the public address and expected behavior is especially helpful.

## Support the project

If Base Portfolio is useful to you, **star the repository**. It helps more Base builders and users discover the project.

## Creator

Built by [@huklaa](https://github.com/huklaa)  
X: https://x.com/1kipcak

Independent community project. Not affiliated with Coinbase or Base.
