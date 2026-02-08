import { ContractFactory, UNIT_ATOMS, BTC_ATOMS, ChainClient } from "@/lib/Contracts";

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


export async function getPurchasableUnits(amountBTC: bigint): Promise<string> {
    const totalShares = await vaultService.getTotalShares().call() as bigint;
    const totalAssets = await wbtcService.getBalances(vaultService.contractAddress).call() as bigint;
    if (totalAssets === 0n) {
        return (amountBTC * UNIT_ATOMS / BTC_ATOMS).toString();
    }
    const result = amountBTC * totalShares / totalAssets;
    return result.toString();
}

export async function deposit(proofCalldata: string[]): Promise<ChainClient> {
    return vaultService.deposit(proofCalldata);
}
