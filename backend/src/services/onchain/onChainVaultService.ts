import { ContractFactory, UNIT_ATOMS, BTC_ATOMS, ChainClient } from "@/lib/Contracts";
import { ChainEventsClient } from "@/lib/Contracts/ChainEventsClient";
import { DepositEvent, MerkleTreeEvents, WithdrawEvent } from "@/lib/Contracts/types/events";
import { Event } from "starknet";
import { logger } from "@/lib/logger";
import { merkleLeavesDbService } from "../db/merkleLeavesDbService";
import { merkleRootsDbService } from "../db/merkleRootsDbService";

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

export async function getKUnitsPrice(kUnits: bigint): Promise<Number> {
    const kUnitsPrice = await vaultService.getKUnitsPrice(kUnits).call();
    return Number(kUnitsPrice);
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

export async function getEvents(transactionHash: string) {
    return chainEventsClient.getTransactionEvents(transactionHash);
}

export async function getWithdrawEvents(transactionHash: string): Promise<WithdrawEvent> {
    const events = await chainEventsClient.getTransactionEvents(transactionHash);
    return events.getWithdrawEvents();
}

export async function pollMerkleTreeEvents(): Promise<MerkleTreeEvents> {
    const merkleTreeAddress = contractFactory.getMerkleTreeAddress();
    const defaultBlockNumber = await chainEventsClient.getLatestBlockNumber();
    const latestBlockNumber = await merkleLeavesDbService.getLatestBlockNumber(defaultBlockNumber);
    const events = await chainEventsClient.getContractEvents(merkleTreeAddress, Number(latestBlockNumber));
    const parsedEvents = events.getMerkleTreeEvents();

    logger.info(`Found ${parsedEvents.commitment_inserted.length} commitment inserted events.. processing...`);
    for (const event of parsedEvents.commitment_inserted) {
        await merkleLeavesDbService.create({
            commitment: event.commitment,
            leafIndex: BigInt(event.leaf_index),
            insertedRoot: event.new_root,
            txHash: event.tx_hash ?? '',
            blockNumber: BigInt(event.block_number ?? '0'),
        });
    
        await merkleRootsDbService.create({
            root: event.new_root,
            txHash: event.tx_hash ?? '',
            blockNumber: BigInt(event.block_number ?? '0'),
        });
    }
    return parsedEvents;
}