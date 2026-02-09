import { ContractFactory, UNIT_ATOMS, BTC_ATOMS, ChainClient } from "@/lib/Contracts";
import { ChainEventsClient } from "@/lib/Contracts/ChainEventsClient";
import { DepositEvent } from "@/lib/Contracts/types/events";
import { logger } from "@/lib/logger";

const contractFactory = new ContractFactory();
const chainEventsClient = new ChainEventsClient();
const vaultService = contractFactory.getVaultService();
const wbtcService = contractFactory.getWBTCService();

export async function getSharePrice(): Promise<bigint> {
    const sharePrice = await vaultService.getSharePrice().call() as bigint;
    return sharePrice;
}

export async function getPurchasableUnits(amountBTC: bigint): Promise<string> {
    const purchasableKUnits = await vaultService.getPurchasableKUnits(amountBTC).call() as bigint;
    return purchasableKUnits.toString();
}

export async function getKUnitsPrice(kUnits: bigint): Promise<bigint> {
    const kUnitsPrice = await vaultService.getKUnitsPrice(kUnits).call() as bigint;
    return kUnitsPrice;
}

export async function deposit(proofCalldata: string[]): Promise<ChainClient> {
    return vaultService.deposit(proofCalldata);
}

export async function withdraw(proofCalldata: string[], recipient: string): Promise<ChainClient> {
    return vaultService.withdraw(proofCalldata, recipient);
}

export async function getDepositEvents(transactionHash: string): Promise<DepositEvent> {
    const events = await chainEventsClient.getTransactionEvents(transactionHash);
    return events.getDepositEvents();
}
