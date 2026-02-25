# Lethe - Private BTC Yield Vault

Lethe is a Starknet project for private BTC-position management with ZK notes.

## Live demo

- Demo app: [https://lethe-sable.vercel.app](https://lethe-sable.vercel.app)
- Current network: **Starknet Sepolia**
- Current asset setup: **mock token flow** using `MockWBTC` (test/demo only)

## What is implemented now

### On-chain contracts

- `Vault`:
  - public accounting (`total_shares`, share price math)
  - deposit/withdraw entrypoints gated by proof verification
  - transfers ERC20 assets
- `MerkleTree`:
  - commitment insertion
  - root validity history checks
- `NullifierRegistry`:
  - nullifier spent tracking (double-spend prevention)
- `VesuStrategy`:
  - strategy adapter layer for capital deployment
  - vault-only `deposit_assets` / `withdraw_assets`
  - reads strategy position using `convert_to_assets` from vToken shares
  - admin rescue function with guardrails
- Mocks:
  - `MockWBTC`
  - `MockVToken` (minimal vToken behavior for local/sepolia demo setups)

### Proof system

- Noir circuits are used to produce and verify deposit/withdraw proofs.
- On-chain proof verification uses **Garaga-generated verifier contracts** (`contracts/garaga-verifiers`).
- Withdrawals rely on note membership + nullifier constraints.
- Notes are commitment-based and stored in an append-only Merkle tree.

## Shares and share units

Lethe tracks ownership in **k-units** (share units), not per-address balances.

- `total_shares` in the vault is tracked as k-units.
- `UNIT_ATOMS = 1000` means one full share is split into 1000 units. Minimum deposit/withdraw is the value in wBTC
  equivalent to 0.001 share.
- Price helpers:
  - `get_share_price()` returns full-share price
  - `get_k_units_price(k)` returns price for `k` units

Operationally:

- Deposits mint k-units (from proof public inputs) and increase `total_shares`.
- Withdrawals burn spent units from `total_shares`.
- Users hold private notes that encode their unit ownership off-address.

## How privacy is achieved

Privacy is implemented with commitments + ZK proofs:

- A deposit creates a commitment inserted into the Merkle tree.
- Withdraw uses a proof that validates:
  - note membership in a valid Merkle root
  - correct nullifier relation
  - withdrawal-unit constraints
- Nullifier registry enforces one-time spend.

Result:

- ownership and spend path are private
- no public per-user vault balance mapping
- public solvency/accounting remains auditable

## Merkle tree reconstruction and path service

Withdraw proof generation needs a valid Merkle path for a note commitment.  
Instead of requiring each client to index chain history, Lethe backend provides this as a service.

- Backend continuously polls relevant on-chain events (commitment insertions / tree updates).
- It reconstructs and keeps an updated Merkle tree state off-chain.
- For proof generation, clients call backend to fetch:
  - `path_elements`
  - `path_indices`
  - current/valid root

This gives all clients a consistent path source for withdraw proofs while the on-chain contracts still enforce correctness by verifying the submitted root and proof.

## How yield is achieved

Yield comes from deploying part of vault assets into strategy:

- Vault can hold assets directly and/or deploy assets to `VesuStrategy`.
- Current implementation deposits **10% of each deposit** into strategy.
- `VesuStrategy` interacts with vToken and reports deployed value via:
  - vToken share balance
  - `convert_to_assets(shares)`
- Vault total assets are:
  - `available assets in vault` + `assets locked in strategy`

As deployed assets grow, share-unit price increases over time, which is how yield is reflected for note holders.

### Webapp flow

- Deposit/withdraw UX now shows clear modal stages:
  1. generating proof
  2. approve transaction in wallet
  3. success

## Architecture summary

- **Vault handles accounting and user-facing economic state.**
- **Strategy handles capital deployment logic only.**
- **Private ownership is represented via notes + commitments, not address balances.**
- **Nullifiers guarantee one-time note spend.**

## Important notes

- This is an **experimental prototype**.
- The Sepolia deployment currently uses **mock assets** (including `MockWBTC`) for testing/demo.
- This repository is not a Bitcoin bridge or Bitcoin consensus implementation.

## Repository layout

- `/contracts` - Cairo smart contracts and tests
- `/circuits` - Noir circuits for ZK proofs
- `/backend` - backend services for proof/transaction orchestration
- `/webapp` - frontend application

The result is a **private, non-custodial yield vault** that preserves transparency where it matters and privacy where it counts.

## Author

- [Jonatan Chaverri](https://github.com/Jonatan-Chaverri)
- jonathan.chaverri12@gmail.com
