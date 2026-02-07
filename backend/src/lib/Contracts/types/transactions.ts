import { ArgsOrCalldata } from "starknet";

export interface TransactionDetails {
	contract_address: string;
	entrypoint: string;
	calldata: ArgsOrCalldata;
}

export enum TransactionType {
	READ = "read",
	WRITE = "write",
}
