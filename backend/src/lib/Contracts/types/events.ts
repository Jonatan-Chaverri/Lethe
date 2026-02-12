export const TRANSFER_EVENT_SELECTOR = "0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9";
export const COMMITMENT_INSERTED_EVENT_SELECTOR = "0x25f90f27ecf51762f9c9b9a2a88b0d8e04ac33f94ba819ed2eba457a4dac774";
export const NULLIFIER_MARKED_AS_SPENT_EVENT_SELECTOR = "0x161f05c1adf1f36585d1b7814ba5b227c7e64ad345eb5d42c8ffbcf5ac8bdd0";


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
	block_number?: string,
	tx_hash?: string,
}

export interface DepositEvent {
	commitment_inserted: CommitmentInsertedEvent[],
	transfer: TransferEvent[],
	block_number: string,
	tx_hash: string,
}

export interface NullifierMarkedAsSpentEvent {
	nullifier_hash: string,
}	

export interface WithdrawEvent {
	nullifier_marked_as_spent: NullifierMarkedAsSpentEvent[],
	transfer: TransferEvent[],
	commitment_inserted: CommitmentInsertedEvent[],
	block_number: string,
	tx_hash: string,
}

export interface MerkleTreeEvents {
	commitment_inserted: CommitmentInsertedEvent[],
}