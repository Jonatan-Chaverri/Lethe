export const TRANSFER_EVENT_SELECTOR = "0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9";
export const COMMITMENT_INSERTED_EVENT_SELECTOR = "0x25f90f27ecf51762f9c9b9a2a88b0d8e04ac33f94ba819ed2eba457a4dac774";

export interface TransferEvent {
	from: string,
	to: string,
	amount: string,
	token: string,
}

export interface CommitmentInsertedEvent {
	commitment: string,
	leaf_index: number,
	new_root: string,
}

export interface DepositEvent {
	commitment_inserted: CommitmentInsertedEvent[],
	transfer: TransferEvent[],
	block_number: string,
	tx_hash: string,
}
