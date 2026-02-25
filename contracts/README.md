# Lethe Contracts

This folder contains the Starknet Cairo contracts for Lethe, plus TypeScript deployment scripts.

## Contracts and responsibilities

### `contracts/src/vault.cairo`

Primary protocol contract.

- Public accounting for share units (`total_shares`, share price, unit pricing)
- Deposit and withdraw execution
- Calls proof verifiers (deposit + withdraw)
- Moves assets between vault and strategy
- Handles final payout logic to recipients
- Upgradeable (admin-gated upgrade entrypoint)

### `contracts/src/vessu_strategy.cairo`

Capital deployment adapter.

- Strategy-side asset deployment/retrieval (`deposit_assets`, `withdraw_assets`)
- Reports locked/deployed assets back to vault (`get_total_locked_assets`)
- Vault-only execution for deposit/withdraw methods
- Minimal operational rescue function for admin
- No pool creation logic in current design

### `contracts/src/merkle_tree.cairo`

Commitment state layer.

- Inserts note commitments
- Tracks current root and valid root history
- Exposes root validity checks used during withdrawal

### `contracts/src/nullifier_registry.cairo`

Spend protection layer.

- Stores spent nullifiers
- Prevents double-spend of notes

### `contracts/src/verifier.cairo`

Verifier interface used by vault to validate proofs.

- Deposit proof verification
- Withdraw proof verification
- Integrates with Garaga-generated verifier contracts in this repo

### Mocks (for local/sepolia demo flows)

- `contracts/src/mocks/mock_wbtc.cairo`
  - Mock ERC20 with mint support for testing/demo
- `contracts/src/mocks/mock_v_token.cairo`
  - Minimal vToken-like mock used by strategy integration tests/demo setup

## Deploy to Sepolia

From `contracts/`:

```bash
npm run deploy:sepolia
```

This runs the deployment wrapper and writes latest deployment artifacts.

## Upgrade on Sepolia

Vault upgrade flow (supported path):

```bash
npm run deploy:sepolia:upgrade
```

Use this for upgrade deployments where only the vault upgrade path is intended.

## Deployment output and backend sync

After deployment/upgrade, generated addresses and metadata are written to:

- `deployments/deployedContracts.ts`

Then copy that file content to backend:

- source: `deployments/deployedContracts.ts`
- destination: `../backend/src/lib/contracts/abi/deployedContracts.ts`

This keeps backend contract bindings aligned with the latest deployed addresses.
