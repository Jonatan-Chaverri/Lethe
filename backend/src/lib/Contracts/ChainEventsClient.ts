import { Event, logger, RpcProvider, uint256 } from "starknet";

import { HttpError } from "@/lib/httpError";
import { 
    CommitmentInsertedEvent, 
    COMMITMENT_INSERTED_EVENT_SELECTOR, 
    DepositEvent, 
    TRANSFER_EVENT_SELECTOR, 
    TransferEvent 
} from "./types/events";
import { ContractFactory } from "./ContractFactory";
import { isSameAddress } from "./utils/formatting";

const contractsFactory = new ContractFactory();

class EventsParser {
    private events: Event[]
    private isError: boolean
    private block_number: bigint
    private tx_hash: string

    constructor(events: Event[], isError: boolean = false, block_number: bigint = BigInt(0), tx_hash: string = '') {
        this.events = events;
        this.isError = isError;
        this.block_number = block_number;
        this.tx_hash = tx_hash;
    }

    public getEvents(): Event[] {
        return this.events;
    }

    public getIsError(): boolean {
        return this.isError;
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
            if (receipt.isError()) {
                return new EventsParser([], true);
            }
            const events = receipt.value.events;
            const block_number = BigInt(receipt.value.block_number);
            return new EventsParser(events, receipt.isError(), block_number, tx_hash);
        } catch (error) {
            throw new HttpError(400, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
        }
    }
}
