#!/bin/bash

set -euo pipefail

if [[ -z "${BB_BIN:-}" ]]; then
  if [[ -x "./node_modules/.bin/bb" ]]; then
    BB_BIN="./node_modules/.bin/bb"
  elif command -v bb >/dev/null 2>&1; then
    BB_BIN="$(command -v bb)"
  elif [[ -x "$HOME/.bb/bb" ]]; then
    BB_BIN="$HOME/.bb/bb"
  else
    echo "Error: could not find bb binary." >&2
    echo "Set BB_BIN explicitly, e.g. BB_BIN=./node_modules/.bin/bb" >&2
    exit 1
  fi
fi

if [[ ! -x "${BB_BIN}" ]]; then
  echo "Error: BB_BIN not found or not executable: ${BB_BIN}" >&2
  exit 1
fi

echo "Using bb: ${BB_BIN}"
"${BB_BIN}" --version

nargo execute witness --package withdraw
"${BB_BIN}" write_vk -s ultra_honk --oracle_hash keccak -b target/withdraw.json -o target/garaga/withdraw/vk_data
"${BB_BIN}" prove -s ultra_honk --oracle_hash keccak -b target/withdraw.json -w target/witness.gz -o target/withdraw_proof -vk target/garaga/withdraw/vk_data/vk
"${BB_BIN}" verify -s ultra_honk --oracle_hash keccak -k target/garaga/withdraw/vk_data/vk -p target/withdraw_proof/proof -i target/withdraw_proof/public_inputs
garaga calldata --system ultra_keccak_zk_honk --vk ./target/garaga/withdraw/vk_data/vk --proof ./target/withdraw_proof/proof --public-inputs ./target/withdraw_proof/public_inputs --format snforge --output-path .
