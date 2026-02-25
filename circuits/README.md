# Lethe Circuits

Noir workspace for Lethe’s private-note proof system.

## What this folder does

This folder defines and compiles the ZK circuits used by the protocol:

- `deposit`: creates a note commitment from private note data
- `withdraw`: proves note ownership + Merkle membership + spend constraints
- `test_data_generator`: deterministic helper outputs for tests/scripts

The generated circuit artifacts are used by the webapp proof flow and backend orchestration.

## Technology stack

- **Language:** Noir
- **Compiler/tooling:** `nargo`
- **Prover backend:** `bb` (Aztec backend)
- **Verifier generation:** `garaga`
- **Proof system used for verifier generation:** `ultra_keccak_zk_honk`

## Curve details

The circuits use the BN254 field in Noir components (for example via `std::field::bn254` / Poseidon BN254 helpers in `withdraw`).

## Workspace structure

- `deposit/src/main.nr`
- `withdraw/src/main.nr`
- `test_data_generator/src/main.nr`
- `Nargo.toml` (workspace manifest)

## Circuit responsibilities

### `deposit`

- Private inputs: `secret`, `nullifier`, `k_units`
- Public output: note commitment
- Core purpose: generate commitment used as Merkle leaf

### `withdraw`

- Proves:
  - note commitment consistency
  - membership in a valid Merkle root
  - nullifier consistency
  - unit constraint (`w_units <= k_units`)
- Outputs/uses data needed by on-chain withdrawal validation

### `test_data_generator`

- Deterministic fixture generator for test/integration pipelines.

## Build and test

From `circuits/`:

```bash
nargo test
nargo compile
```

Single package examples:

```bash
nargo compile --package deposit
nargo compile --package withdraw
nargo test --package deposit
nargo test --package withdraw
```

## Generate Garaga verifiers

From `circuits/`:

```bash
npm run garaga:verifier
```

Or per circuit:

```bash
npm run garaga:verifier:deposit
npm run garaga:verifier:withdraw
```

This runs `scripts/generate-garaga-verifier.sh` which:

1. Ensures `target/<circuit>.json` exists (compiles if needed)
2. Generates VK with `bb write_vk`
3. Generates Cairo verifier project with `garaga gen`

Output verifier projects:

- `../contracts/garaga-verifiers/lethe_deposit_verifier`
- `../contracts/garaga-verifiers/lethe_withdraw_verifier`

## Circuit artifact output and webapp sync

After compiling circuits, copy the circuit JSON artifacts to webapp:

- source:
  - `target/deposit.json`
  - `target/withdraw.json`
- destination:
  - `../webapp/public/noir/deposit.json`
  - `../webapp/public/noir/withdraw.json`

Example:

```bash
cp target/deposit.json ../webapp/public/noir/deposit.json
cp target/withdraw.json ../webapp/public/noir/withdraw.json
```

Note: the current webapp consumes `deposit.json` and `withdraw.json` directly (not a combined `circuits.json` file).

## Troubleshooting

- If `garaga` fails to start due Typer mismatch:
  - `pip install --upgrade "typer>=0.12,<1" "click>=8.1,<9" garaga==1.0.1`
- If verifier generation fails at formatting:
  - ensure `scarb --version` works in the current shell.
