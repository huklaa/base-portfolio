# Base Portfolio Reader

A read-only Base mainnet portfolio viewer for public EVM addresses.

## Live app

https://huklaa.github.io/base-portfolio/

## What it does

- Reads ETH and selected ERC-20 balances on Base mainnet.
- Shows portfolio value, allocation, optional cost basis, P/L, and target allocation calculations.
- Uses public onchain data only.
- Does **not** request a wallet connection, signature, private key, approval, swap, transfer, or transaction.

## Source snapshot

This Pages deployment intentionally preserves the earlier Base Portfolio Reader from `huklaa/crypto-test` at commit:

`059fd2705b2480d327ce7ff4e7920fb636b270f9`

The deployment workflow builds that fixed snapshot for the `/base-portfolio/` GitHub Pages path so later changes to the Chainling site do not alter this reader.

## Network

- Base mainnet chain ID: `8453`
- Read-only analytics

This repository is kept separate from Chainling so the two sites can be maintained and deployed independently.
