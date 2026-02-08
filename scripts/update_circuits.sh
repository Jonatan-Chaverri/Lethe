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
npm run garaga:verifier:deposit
npm run garaga:verifier:withdraw
deactivate

echo "Done"
