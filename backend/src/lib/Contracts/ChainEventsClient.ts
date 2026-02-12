import { Event, logger, RpcProvider, uint256, EmittedEvent } from "starknet";

import { HttpError } from "@/lib/httpError";
import { 
    CommitmentInsertedEvent, 
    COMMITMENT_INSERTED_EVENT_SELECTOR, 
    DepositEvent, 
    TRANSFER_EVENT_SELECTOR, 
    TransferEvent,
    NullifierMarkedAsSpentEvent,
    NULLIFIER_MARKED_AS_SPENT_EVENT_SELECTOR,
    WithdrawEvent,
    MerkleTreeEvents,
} from "./types/events";
import { ContractFactory } from "./ContractFactory";
import { isSameAddress } from "./utils/formatting";

const contractsFactory = new ContractFactory();

class EventsParser {
    private events: EmittedEvent[]
    private isError: boolean
    private block_number: bigint
    private tx_hash: string

    constructor(events: EmittedEvent[], isError: boolean = false, block_number: bigint = BigInt(0), tx_hash: string = '') {
        this.events = events;
        this.isError = isError;
        this.block_number = block_number;
        this.tx_hash = tx_hash;
    }

    public getEvents(): EmittedEvent[] {
        return this.events;
    }

    public getIsError(): boolean {
        return this.isError;
    }

    public getWithdrawEvents(): WithdrawEvent {
        const nullifierMarkedAsSpentEvents: NullifierMarkedAsSpentEvent[] = [];
        const transferEvents: TransferEvent[] = [];
        const commitmentInsertedEvents: CommitmentInsertedEvent[] = [];

        const nullifierRegistry = contractsFactory.getNullifierRegistryAddress();
        const wbtc = contractsFactory.getWBTCService();
        for (const event of this.events) {
            if (event.keys[0] === NULLIFIER_MARKED_AS_SPENT_EVENT_SELECTOR &&
                isSameAddress(nullifierRegistry, event.from_address)
            ) {
                const nullifierMarkedAsSpentEvent = {
                    nullifier_hash: String(event.data[0]),
                }
                nullifierMarkedAsSpentEvents.push(nullifierMarkedAsSpentEvent);
            }

            if (event.keys[0] === TRANSFER_EVENT_SELECTOR && event.keys.length === 3) {
                const transferEvent = {
                    from: String(event.keys[1]),
                    to: String(event.keys[2]),
                    amount: String(uint256.uint256ToBN({low: event.data[0], high: event.data[1]})),
                    token: isSameAddress(wbtc.contractAddress, event.from_address) ? 'WBTC': event.from_address,
                }
                transferEvents.push(transferEvent);
            }

            if (event.keys[0] === COMMITMENT_INSERTED_EVENT_SELECTOR) {
                const newRoot =
                    event.data.length >= 5
                        ? String(uint256.uint256ToBN({ low: event.data[3], high: event.data[4] }))
                        : String(event.data[3]);
                const commitmentInsertedEvent = {
                    commitment: String(uint256.uint256ToBN({low: event.data[0], high: event.data[1]})),
                    leaf_index: Number(event.data[2]),
                    new_root: newRoot,
                }
                commitmentInsertedEvents.push(commitmentInsertedEvent);
            }
        }

        return {
            nullifier_marked_as_spent: nullifierMarkedAsSpentEvents,
            transfer: transferEvents,
            commitment_inserted: commitmentInsertedEvents,
            block_number: this.block_number.toString(),
            tx_hash: this.tx_hash,
        }
    }

    public getMerkleTreeEvents(): MerkleTreeEvents {
        const commitmentInsertedEvents: CommitmentInsertedEvent[] = [];
        for (const event of this.events) {
            if (event.keys[0] === COMMITMENT_INSERTED_EVENT_SELECTOR) {
                const newRoot =
                    event.data.length >= 5
                        ? String(uint256.uint256ToBN({ low: event.data[3], high: event.data[4] }))
                        : String(event.data[3]);
                const commitmentInsertedEvent = {
                    commitment: String(uint256.uint256ToBN({low: event.data[0], high: event.data[1]})),
                    leaf_index: Number(event.data[2]),
                    new_root: newRoot,
                    block_number: event.block_number.toString(),
                    tx_hash: event.transaction_hash,
                }
                
                commitmentInsertedEvents.push(commitmentInsertedEvent);
            }
        }
        return {
            commitment_inserted: commitmentInsertedEvents,
        }
    }

    public getDepositEvents(): DepositEvent {
        const wbtc = contractsFactory.getWBTCService();

        const transferEvents: TransferEvent[] = [];
        const commitmentInsertedEvents: CommitmentInsertedEvent[] = [];

        for (const event of this.events) {
            if (event.keys[0] === TRANSFER_EVENT_SELECTOR && event.keys.length === 3) {
                const transferEvent = {
                    from: String(event.keys[1]),
                    to: String(event.keys[2]),
                    amount: String(uint256.uint256ToBN({low: event.data[0], high: event.data[1]})),
                    token: isSameAddress(wbtc.contractAddress, event.from_address) ? 'WBTC': event.from_address,
                }
                transferEvents.push(transferEvent);
            }
            else if (event.keys[0] === COMMITMENT_INSERTED_EVENT_SELECTOR) {
                const newRoot =
                    event.data.length >= 5
                        ? String(uint256.uint256ToBN({ low: event.data[3], high: event.data[4] }))
                        : String(event.data[3]);
                const commitmentInsertedEvent = {
                    commitment: String(uint256.uint256ToBN({low: event.data[0], high: event.data[1]})),
                    leaf_index: Number(event.data[2]),
                    new_root: newRoot,
                }
                commitmentInsertedEvents.push(commitmentInsertedEvent);
            }
        }

        return {
            commitment_inserted: commitmentInsertedEvents,
            transfer: transferEvents,
            block_number: this.block_number.toString(),
            tx_hash: this.tx_hash,
        }
    }
}

export class ChainEventsClient {
    private provider: RpcProvider

    constructor() {
        this.provider = new RpcProvider({
            nodeUrl: process.env.RPC_URL
        });
    }

    public async getTransactionEvents(tx_hash: string): Promise<EventsParser> {
        try {
            const receipt = await this.provider.getTransactionReceipt(tx_hash)
            logger.info(`Receipt for transaction ${tx_hash}: ${JSON.stringify(receipt, null, 2)}`);
            if (receipt.isError()) {
                throw new HttpError(400, 'Transaction invalid', 'TRANSACTION_INVALID');
            }
            if (receipt.value.execution_status === "REVERTED") {
                throw new HttpError(400, 'Transaction reverted: ' + receipt.value.revert_reason, 'TRANSACTION_REVERTED');
            }
            const events = receipt.value.events;
            const block_number = BigInt(receipt.value.block_number);
            const emittedEvents: EmittedEvent[] = events.map((event: Event) => ({
                ...event,
                block_hash: receipt.value.block_hash,
                block_number: receipt.value.block_number,
                transaction_hash: tx_hash,
            }));
            return new EventsParser(emittedEvents, receipt.isError(), block_number, tx_hash);
        } catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(400, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
        }
    }

    public async getLatestBlockNumber(): Promise<bigint> {
        const latest = await this.provider.getBlockNumber();
        return BigInt(latest);
    }

    public async getContractEvents(
        contractAddress: string, 
        fromBlock: number,
        eventsFound: EmittedEvent[] = [],
        continuation_token?: string): Promise<EventsParser> {
        try {
            const latest = await this.provider.getBlockNumber();
            logger.info(`latest block: ${latest}`);
            const block = await this.provider.getEvents({
                address: contractAddress,
                from_block: { block_number: fromBlock + 1 },
                to_block: { block_number: latest },
                chunk_size: 1000,
                continuation_token: continuation_token,
            })
            const events = block.events;
            if (block.continuation_token) {
                eventsFound.push(...events);
                return this.getContractEvents(contractAddress, fromBlock + 1000, eventsFound, block.continuation_token);
            }
            return new EventsParser(events, false, BigInt(latest), '');
        } catch (error) {
            logger.error(`Error getting contract events: ${error}`);
            throw new HttpError(400, 'Block not found', 'BLOCK_NOT_FOUND');
        }
    }
}
