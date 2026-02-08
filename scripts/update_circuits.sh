#!/bin/bash

set -euo pipefail

pick_bb() {
  if [[ -n "${BB_BIN:-}" ]]; then
    echo "${BB_BIN}"
    return
  fi
  if [[ -x "./node_modules/.bin/bb" ]]; then
    echo "./node_modules/.bin/bb"
    return
  fi
  if [[ -x "../webapp/node_modules/.bin/bb" ]]; then
    echo "../webapp/node_modules/.bin/bb"
    return
  fi
  if command -v bb >/dev/null 2>&1; then
    command -v bb
    return
  fi
  if [[ -x "$HOME/.bb/bb" ]]; then
    echo "$HOME/.bb/bb"
    return
  fi
  return 1
}

# Compile the circuits
echo "Compiling circuits..."
cd circuits
BB_BIN="$(pick_bb)"
export BB_BIN
echo "Using bb: ${BB_BIN}"
"${BB_BIN}" --version || true
nargo compile

# Copy the compiled circuits to the webapp public directory
echo "Copying compiled circuits to webapp public directory..."
rm -rf ../webapp/public/noir
mkdir -p ../webapp/public/noir
cp target/deposit.json ../webapp/public/noir/deposit.json
cp target/withdraw.json ../webapp/public/noir/withdraw.json

# Update garaga verifiers
echo "Updating garaga verifiers..."
rm -rf ../contracts/garaga-verifiers
source .venv/bin/activate
npm run garaga:verifier:deposit
npm run garaga:verifier:withdraw
deactivate

echo "Copying VKs to backend lib..."
cp target/garaga/deposit/vk_data/vk ../backend/src/lib/Garaga/deposit/vk
cp target/garaga/deposit/vk_data/vk_hash ../backend/src/lib/Garaga/deposit/vk_hash
cp target/garaga/withdraw/vk_data/vk ../backend/src/lib/Garaga/withdraw/vk
cp target/garaga/withdraw/vk_data/vk_hash ../backend/src/lib/Garaga/withdraw/vk_hash

echo "Done"
