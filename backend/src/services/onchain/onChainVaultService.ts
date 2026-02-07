import { ContractFactory } from "@/lib/Contracts";

const contractFactory = new ContractFactory();
const vaultService = contractFactory.getVaultService();
const wbtcService = contractFactory.getWBTCService();

export async function getSharePrice(): Promise<bigint> {
    const totalShares = await vaultService.getTotalShares().call() as bigint;
    const totalAssets = await wbtcService.getBalances(vaultService.contractAddress).call() as bigint;
    if (totalShares === 0n) {
        return 0n;
    }
    const result = totalAssets / totalShares;
    return result;
}
