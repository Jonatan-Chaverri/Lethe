# Lethe - Private BTC Yield Vault

## Overview

This project implements a **privacy-preserving yield vault for BTC exposure** using **wBTC on Starknet** and **zero-knowledge proofs**.

Users can:

* deposit wBTC into a shared yield vault
* earn yield over time via a standard share-based accounting model
* withdraw principal + yield **without revealing which deposit funded the withdrawal**
* keep balances, position evolution, and profit attribution private

The protocol achieves privacy by **decoupling ownership from addresses**, using **Merkle-tree commitments** and **zero-knowledge membership proofs**, while keeping global solvency and yield math fully public and auditable.

This is **not** a Bitcoin consensus or bridging protocol.
It operates *on top of* wBTC and Starknet.

---

## High-level design

The protocol separates concerns into three layers:

1. **Public vault accounting (on-chain, transparent)**
2. **Private ownership tracking (Merkle tree)**
3. **Zero-knowledge authorization (Noir circuits)**

### Core idea

Users do not have on-chain balances.

Instead, they own **private notes** that represent a fixed number of **vault shares**, recorded as commitments in a Merkle tree.
Yield accrues by increasing a **global exchange rate**, not by updating user balances.

Ownership is proven **only at withdrawal time**, via a ZK proof.

---

## Public vault model (ERC-4626–style)

The vault follows a standard share-based model:

### Public state

* `total_assets` — total wBTC held by the vault
* `total_shares` — total shares outstanding
* `assets_per_share = total_assets / total_shares`

Yield increases `total_assets`, which increases `assets_per_share`.
No per-user state is updated when yield accrues.

---

## Fixed-unit private notes

### Share units

To simplify zero-knowledge accounting and avoid fractional arithmetic, the protocol uses **fixed share units**.

* Shares are represented internally as integers (`share atoms`)
* A constant unit size is chosen, e.g.:

```text
SHARE_ATOMS = 10^18        // internal precision
UNIT_ATOMS  = 10^13        // = 0.00001 share
```

All private ownership is expressed as multiples of `UNIT_ATOMS`.

### Note semantics

A **note** represents ownership of `k` fixed share units.

Notes are private and unlinkable.

---

## Commitments and Merkle tree

### Commitment format

Each note is represented by a cryptographic commitment:

```text
commitment = Poseidon(
  0,              // domain separator (leaf)
  secret,
  nullifier,
  k               // number of fixed share units
)
```

* `secret` — private randomness known only to the user
* `nullifier` — unique value used to prevent double-spends
* `k` — number of fixed share units owned

### Merkle tree

* All commitments are stored in an **append-only Merkle tree**
* The contract maintains:

  * the current Merkle root
  * a history of valid roots
* The tree uses:

  * **Poseidon hash**
  * **non-commutative left/right hashing**
  * explicit domain separation for leaves and internal nodes

The Merkle tree commits to **private ownership state**, not balances.

---

## Nullifiers and double-spend prevention

Each note can be spent **exactly once**.

At withdrawal time:

* the user reveals `nullifier_hash = Poseidon(nullifier)`
* the contract checks that this nullifier has not been used
* the nullifier is then permanently marked as spent

This guarantees:

* no double withdrawals
* no balance inflation
* correct total accounting

---

## Deposit flow

1. User deposits `D` wBTC into the vault
2. Vault computes:

   ```text
   minted_shares = D / assets_per_share
   k = floor(minted_shares / UNIT_ATOMS)
   ```
3. Dust (if any) is handled by policy (refund or donation)
4. User generates:

   * `secret`
   * `nullifier`
   * `commitment`
5. Commitment is appended to the Merkle tree
6. `total_assets` and `total_shares` are updated

**No ZK proof is required for deposits.**

---

## Withdrawal flow

Withdrawals require a **zero-knowledge proof**.

### User proves:

* knowledge of `(secret, nullifier, k)`
* the commitment exists in the Merkle tree
* the commitment corresponds to the current (or past valid) root
* `w ≤ k` where `w` is the number of units withdrawn

### Contract logic:

1. Verify the ZK proof
2. Check nullifier is unused
3. Mark nullifier as spent
4. Compute payout:

   ```text
   shares_withdrawn = w * UNIT_ATOMS
   payout = shares_withdrawn * assets_per_share
   ```
5. Transfer `payout` wBTC to the recipient
6. If `w < k`, mint a **new commitment** for `k - w` units

Withdrawals can be:

* partial
* delayed
* routed through relayers
* sent to fresh addresses

This breaks deposit ↔ withdrawal linkage.

---

## Zero-knowledge circuits (Noir)

The protocol uses **Noir** to define authorization logic.

### Core circuit: `Withdraw`

The circuit enforces:

1. Commitment correctness

   ```text
   commitment = Poseidon(0, secret, nullifier, k)
   ```
2. Merkle membership

   * commitment exists in the tree
   * correct path and direction bits
3. Nullifier binding

   ```text
   nullifier_hash = Poseidon(nullifier)
   ```
4. Unit constraint

   ```text
   w ≤ k
   ```

### What the circuit does NOT do

* It does **not** compute yield
* It does **not** track balances
* It does **not** update global state

All economic logic remains public and auditable.

---

## Contracts

### Vault contract

Responsibilities:

* hold wBTC
* track `total_assets`, `total_shares`
* compute `assets_per_share`
* process deposits and withdrawals

### Merkle tree contract / module

Responsibilities:

* append commitments
* store current and historical roots
* expose roots for proof verification

### Nullifier registry

Responsibilities:

* track spent nullifiers
* prevent double-spends

---

## Privacy guarantees

The protocol provides:

* **Unlinkability**
  Deposits cannot be linked to withdrawals

* **Balance privacy**
  No on-chain per-user balances exist

* **Profit privacy**
  Observers cannot prove how much a given user earned

What is still public:

* total vault assets
* total yield
* individual transfer amounts (ERC-20 limitation)

---

## Non-goals

This project does **not**:

* verify Bitcoin consensus
* replace wBTC custody assumptions
* hide transaction amounts at the token level
* provide anonymity against timing analysis without user discipline

---

## Future extensions

* Relayer network for gas abstraction
* Batched withdrawals
* Note splitting / merging circuits
* Shielded token integration (if available)
* BTC-native version using provable Bitcoin clients

---

## Status

This project is **experimental** and under active design.

The architecture prioritizes:

* correctness
* auditability
* minimal ZK complexity
* long-term maintainability

---

## Summary

This protocol applies **UTXO-style privacy** and **share-based yield accounting** to BTC exposure on Starknet.

It combines:

* simple public economics
* private ownership via commitments
* ZK proofs for authorization

The result is a **private, non-custodial yield vault** that preserves transparency where it matters and privacy where it counts.
