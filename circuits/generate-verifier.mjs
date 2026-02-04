import { UltraHonkBackend } from '@aztec/bb.js';
import { readFileSync, writeFileSync } from 'fs';

async function generateVerifier(circuitName, circuitPath, outputPath) {
  console.log(`\n=== Generating ${circuitName} Verifier ===`);
  console.log('Loading circuit...');
  const circuit = JSON.parse(readFileSync(circuitPath, 'utf8'));

  console.log('Creating backend...');
  const backend = new UltraHonkBackend(circuit.bytecode);

  console.log('Generating Solidity verifier contract...');
  let contract = await backend.getSolidityVerifier();

  // Rename contract to match circuit name
  console.log(`Renaming contract to ${circuitName}Verifier...`);
  contract = contract.replace(
    /contract HonkVerifier/g,
    `contract ${circuitName}Verifier`
  );

  console.log('Writing verifier contract...');
  writeFileSync(outputPath, contract);

  console.log(`✅ ${circuitName} verifier generated at: ${outputPath}`);
  console.log(`Contract size: ${contract.length} bytes`);
}

async function generateAllVerifiers() {
  const circuits = [
    {
      name: 'Deposit',
      path: './target/deposit.json',
      output: './contracts/DepositVerifier.sol'
    },
    {
      name: 'Withdraw',
      path: './target/withdraw.json',
      output: './contracts/WithdrawVerifier.sol'
    },
  ];

  for (const circuit of circuits) {
    await generateVerifier(circuit.name, circuit.path, circuit.output);
  }

  console.log('\n✅ All verifier contracts generated successfully!');
}

generateAllVerifiers().catch(console.error);
