# Lethe Circuits

Noir workspace for the private-note flow used by Lethe.

This folder contains:
- Note commitment generation (`deposit`)
- Withdrawal authorization + Merkle membership (`withdraw`)
- Deterministic test vector generation (`test_data_generator`)

## Workspace Structure

- `deposit/`: Commitment circuit for creating a private note from secret inputs.
- `withdraw/`: Spend circuit that proves note ownership and membership in the Merkle tree.
- `test_data_generator/`: Utility circuit to output values used by integration tests/scripts.
- `Nargo.toml`: Workspace manifest with all circuit members.

## Circuit Details

### `deposit`

File: `/Users/jonatan/Desktop/Lethe/circuits/deposit/src/main.nr`

Purpose:
- Computes a note commitment from private note data.

Inputs:
- Private: `secret`, `nullifier`, `k_units`

Outputs:
- Public: `commitment`

Main constraint:
- `commitment = H(0, secret, nullifier, k_units)`

### `withdraw`

File: `/Users/jonatan/Desktop/Lethe/circuits/withdraw/src/main.nr`

Purpose:
- Proves a note is valid and spendable for withdrawal.

Private inputs:
- `secret`, `nullifier`
- `path_elements[DEPTH]`, `path_indices[DEPTH]` (Merkle proof)
- `new_secret`, `new_nullifier` (for change note)

Public inputs:
- `root`
- `nullifier_hash`
- `k_units` (note size)
- `w_units` (units to withdraw)

Public output:
- `new_commitment` for remaining units

Main constraints:
- `w_units <= k_units`
- Note commitment is reconstructed from private inputs
- Recomputed Merkle root equals provided `root`
- Recomputed `nullifier_hash` equals provided public hash
- Change note commitment is computed for `k_units - w_units`

Merkle path convention:
- `path_indices[i] == true` means current node is the right child at level `i`
- `path_elements[i]` is the sibling hash at level `i`

### `test_data_generator`

File: `/Users/jonatan/Desktop/Lethe/circuits/test_data_generator/src/main.nr`

Purpose:
- Generates deterministic values for scripts/tests.

Outputs:
- `commitment`
- `nullifier_hash`
- `new_commitment`

Input defaults are in:
- `/Users/jonatan/Desktop/Lethe/circuits/test_data_generator/Prover.toml`

## Hash Function Note

Current implementation uses `dep::std::hash::pedersen_hash` because the local toolchain is `nargo 0.22.0`.

If you need strict parity with Cairo Poseidon hashing, upgrade Noir and migrate these hash calls accordingly.

## Commands (Runbook)

From workspace root:

```bash
cd /Users/jonatan/Desktop/Lethe/circuits
```

Check toolchain:

```bash
nargo --version
```

Run all circuit tests:

```bash
nargo test
```

Compile all circuits:

```bash
nargo compile
```

Execute test data generator with `Prover.toml`:

```bash
nargo execute --package test_data_generator
```

Compile a single circuit:

```bash
nargo compile --package deposit
nargo compile --package withdraw
```

Run tests for a single circuit:

```bash
nargo test --package deposit
nargo test --package withdraw
nargo test --package test_data_generator
```

## Typical Dev Flow

1. Edit circuit source in `deposit/src/main.nr` or `withdraw/src/main.nr`
2. Run `nargo test`
3. Run `nargo compile`
4. Run `nargo execute --package test_data_generator` if test vectors are needed

## Garaga Integration (Cairo Verifier Generation)

This project includes a script to generate Starknet/Cairo verifier projects for the Noir circuits using `bb` + `garaga`.

Prerequisites:
- `nargo` installed and on PATH
- `bb` available (global `bb`, or from `webapp/node_modules/.bin/bb`)
- `garaga` installed (example: `pip install garaga==1.0.1`)

Generate both verifier projects:

```bash
cd /Users/jonatan/Desktop/Lethe/circuits
npm run garaga:verifier
```

Generate a single verifier project:

```bash
cd /Users/jonatan/Desktop/Lethe/circuits
npm run garaga:verifier:deposit
npm run garaga:verifier:withdraw
```

Outputs:
- Verification keys:
  - `target/garaga/deposit/vk.bin`
  - `target/garaga/withdraw/vk.bin`
- Cairo verifier projects:
  - `/Users/jonatan/Desktop/Lethe/contracts/garaga-verifiers/lethe_deposit_verifier`
  - `/Users/jonatan/Desktop/Lethe/contracts/garaga-verifiers/lethe_withdraw_verifier`

Notes:
- The script uses `bb write_vk` with `--verifier_target evm` and then runs `garaga gen --system ultra_keccak_zk_honk`.
- If you explicitly set `VERIFIER_TARGET=starknet` but your `bb` binary shows `Starknet Garaga Extensions: disabled`, the script automatically falls back to `evm`.
- If the destination project folder already exists, the script fails intentionally to avoid overwriting generated code silently.

Troubleshooting:
- If Garaga crashes with `Option() missing 1 required positional argument: 'default'`, your Python Typer stack is incompatible. Run:
  - `pip install --upgrade "typer>=0.12,<1" "click>=8.1,<9" garaga==1.0.1`
- If Garaga fails while running `scarb fmt`, ensure `scarb --version` works in your current shell (asdf/shims or scarbup setup).
