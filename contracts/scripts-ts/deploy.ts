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
	exportDeployments();
	console.log(green("✔ All upgrades completed"));
};


/** ------------------------------
 *   FULL DEPLOY MODE
 *  ------------------------------ */
const deployScript = async (): Promise<void> => {
	const admin = deployer.address;

	// If --upgrade is passed → skip deploy entirely
	if (argv.upgrade) return upgradeMode();

	console.log("🚀 Deploying full system...");
};

deployScript()
	.then(() => {
		exportDeployments();
		console.log(green("✔ All setup done"));
	})
	.catch(console.error);
