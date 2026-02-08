#!/bin/bash

set -euo pipefail

BB_BIN="${BB_BIN:-$HOME/.bb/bb}"
if [[ ! -x "${BB_BIN}" ]]; then
  echo "Error: BB_BIN not found or not executable: ${BB_BIN}" >&2
  echo "Set BB_BIN explicitly, e.g. BB_BIN=$(command -v bb)" >&2
  exit 1
fi

echo "Using bb: ${BB_BIN}"
"${BB_BIN}" --version

nargo execute witness --package deposit
"${BB_BIN}" write_vk -s ultra_honk --oracle_hash keccak -b target/deposit.json -o target/garaga/deposit/vk_data
"${BB_BIN}" prove -s ultra_honk --oracle_hash keccak -b target/deposit.json -w target/witness.gz -o target/deposit_proof -vk target/garaga/deposit/vk_data/vk
"${BB_BIN}" verify -s ultra_honk --oracle_hash keccak -k target/garaga/deposit/vk_data/vk -p target/deposit_proof/proof -i target/deposit_proof/public_inputs
garaga calldata --system ultra_keccak_zk_honk --vk ./target/garaga/deposit/vk_data/vk --proof ./target/deposit_proof/proof --public-inputs ./target/deposit_proof/public_inputs --format snforge --output-path .
