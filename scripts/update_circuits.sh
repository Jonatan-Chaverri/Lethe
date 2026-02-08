#!/bin/bash

# Compile the circuits
echo "Compiling circuits..."
cd circuits
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
bb write_vk -s ultra_honk --oracle_hash keccak -b target/deposit.json -o target/vk_deposit
npm run garaga:verifier:deposit
bb write_vk -s ultra_honk --oracle_hash keccak -b target/withdraw.json -o target/vk_withdraw
npm run garaga:verifier:withdraw
deactivate

echo "Done"
