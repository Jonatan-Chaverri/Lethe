import { ContractFactory } from "@/lib/Contracts";
import { wbtcToWei } from "@/lib/Contracts/utils/formatting";
import { logger } from "@/lib/logger";
import { ChainClient } from "@/lib/Contracts/ChainClient";

const contractFactory = new ContractFactory();
const wbtcService = contractFactory.getWBTCService();

export async function getBalanceOf(walletAddress: string): Promise<string> {
    const balance = await wbtcService.getBalances(walletAddress).call();
    return balance.toString();
}

export async function mintTestnetWBTC(amountBTC: number, recipient_wallet: string) {
    if (contractFactory.getNetwork() !== "sepolia") {
        throw new Error("This function is only available on the Sepolia network");
    }
    logger.info(`Minting ${amountBTC} WBTC to ${recipient_wallet}`);
    return await wbtcService.mintToken(
        wbtcToWei(amountBTC),
        recipient_wallet
    ).call();
}

export function increaseAllowance(amount: bigint): ChainClient {
    const vaultService = contractFactory.getVaultService();
    return wbtcService.increaseAllowance(amount, vaultService.contractAddress);
}