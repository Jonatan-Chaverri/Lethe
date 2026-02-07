import { addAddressPadding, byteArray } from "starknet";
import {
	declareOnly,
	deployContract,
	deployer,
	executeDeployCalls,
	exportDeployments,
	loadExistingDeployments,
	registerDeployment,
	provider,
} from "./deploy-contract";
import { green, yellow, red } from "./helpers/colorize-log";
import yargs from "yargs";

/** ------------------------------
 *  ARGUMENT PARSING
 *  ------------------------------ */
const argv = yargs(process.argv.slice(2))
	.option("network", {
		type: "string",
		required: true,
	})
	.option("upgrade", {
		type: "boolean",
		description: "Upgrade Distribution + Marketplace using latest deployments",
	})
	.parseSync();

/** ------------------------------
 *   Helper: string → Cairo ByteArray
 *  ------------------------------ */
const string_to_byte_array = (str: string): string[] => {
	const ba = byteArray.byteArrayFromString(str);
	const result = [`0x${ba.data.length.toString(16)}`];

	for (const v of ba.data) result.push(v.toString());
	if (ba.pending_word) result.push(ba.pending_word.toString());

	result.push(`0x${ba.pending_word_len.toString(16)}`);
	return result;
};

/** ------------------------------
 *   Upgrade helper (1 contract)
 *  ------------------------------ */
const upgradeOne = async (contractName: string, address: string) => {
	console.log(yellow(`🔄 Upgrading ${contractName} at ${address}...`));

	// Step 1 — just declare
	const classHash = await declareOnly(contractName);

	if (!classHash) throw new Error(red("❌ Could not declare new class"));

	console.log(green(`✔ Declared new classHash: ${classHash}`));

	// Step 2 — execute upgrade(class_hash)
	const tx = await deployer.execute([
		{
			contractAddress: address,
			entrypoint: "upgrade",
			calldata: [classHash],
		},
	]);

	console.log(green(`🔄 Upgrade TX for ${contractName}: ${tx.transaction_hash}`));
	await provider.waitForTransaction(tx.transaction_hash);

	console.log(green(`✨ Successfully upgraded ${contractName}`));
	registerDeployment(contractName, {
		contract: contractName,
		address,
		classHash
	  });
	  
};

/** ------------------------------
 *   UPGRADE MODE
 *  ------------------------------ */
const upgradeMode = async () => {
	console.log(yellow("🔄 Upgrade mode activated — no redeploys"));

	const deployments = loadExistingDeployments();

	const vault = deployments["Vault"];
	if (!vault) {
		console.error(
			red(
				"❌ Cannot upgrade — missing Vault in deployments/<network>_latest.json"
			)
		);
		process.exit(1);
	}
	exportDeployments();
	await upgradeOne("Vault", vault.address);
	console.log(green("✔ All upgrades completed"));
};

const deployGaragaVerifier = async (verifierType: "deposit" | "withdraw"): Promise<string> => {
	const { address: verifierAddress } = await deployContract({
		contract: `lethe_${verifierType}_verifier_UltraKeccakZKHonkVerifier`,
		targetDirPath: `../garaga-verifiers/lethe_${verifierType}_verifier/target/dev`,
	});
	console.log(green(`✔ Garaga ${verifierType} verifier deployed at `), verifierAddress);
	return verifierAddress;
};


/** ------------------------------
 *   FULL DEPLOY MODE
 *  ------------------------------ */
const deployScript = async (): Promise<void> => {
	const admin = deployer.address;

	// If --upgrade is passed → skip deploy entirely
	if (argv.upgrade) return upgradeMode();

	console.log("🚀 Deploying full system...");

	const { address: merkleTreeAddress } = await deployContract({
		contract: "MerkleTree",
		constructorArgs: {
			admin: admin,
		},
	});

	const { address: nullifierRegistryAddress } = await deployContract({
		contract: "NullifierRegistry",
		constructorArgs: {
			admin: admin,
		},
	});

	let wbtcAddress = "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac";
	if (argv.network === "sepolia") {
		const { address } = await deployContract({
			contract: "MockWBTC",
			constructorArgs: { default_admin: admin, minter: admin, upgrader: admin },
		});
		wbtcAddress = address;
		console.log(green("✔ MockWBTC deployed at "), wbtcAddress);
	}

	const depositVerifierAddress = await deployGaragaVerifier("deposit");
	const withdrawVerifierAddress = await deployGaragaVerifier("withdraw");

	const { address: vaultAddress } = await deployContract({
		contract: "Vault",
		constructorArgs: {
			admin: admin,
			nullifier_registry: nullifierRegistryAddress,
			merkle_tree: merkleTreeAddress,
			deposit_verifier: depositVerifierAddress,
			withdraw_verifier: withdrawVerifierAddress,
			wbtc: wbtcAddress,
		},
	});

	console.log(green("✔ Deposit Verifier deployed at "), depositVerifierAddress);
	console.log(green("✔ Withdraw Verifier deployed at "), withdrawVerifierAddress);
	console.log(green("✔ Merkle Tree deployed at "), merkleTreeAddress);
	console.log(green("✔ Nullifier Registry deployed at "), nullifierRegistryAddress);
	console.log(green("✔ Vault deployed at "), vaultAddress);

	await executeDeployCalls();

	// Post-deploy setup
	const tx = await deployer.execute([
		{
			contractAddress: merkleTreeAddress,
			entrypoint: "set_vault_address",
			calldata: { vault: vaultAddress },
		},
		{
			contractAddress: nullifierRegistryAddress,
			entrypoint: "set_vault_address",
			calldata: { vault: vaultAddress },
		},
	]);

	console.log("🚀 Config TX", tx.transaction_hash);
};

deployScript()
	.then(() => {
		exportDeployments();
		console.log(green("✔ All setup done"));
	})
	.catch(console.error);
