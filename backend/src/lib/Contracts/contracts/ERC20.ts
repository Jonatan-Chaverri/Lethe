import { TransactionType, LetheContracts, ERC20Contracts } from "../types";
import { getContractAddress, format_number } from "../utils";
import { ChainClient } from '../ChainClient';

export class ERC20Service {
    private contract: LetheContracts
    private network: string

	public contractAddress: string

    constructor(network: string, token: ERC20Contracts) {
        this.contract = LetheContracts[token]
        this.network = network
        this.contractAddress = getContractAddress(network, this.contract)
    }

    public getBalances(walletAddress: string): ChainClient {
		return new ChainClient(this.network, {
			contract_address: this.contractAddress,
			entrypoint: "balance_of",
			calldata: [walletAddress]
		}, TransactionType.READ);
    }

	public increaseAllowance(allowance: bigint, spender: string): ChainClient {
		const formattedAllowance = format_number(allowance);
		return new ChainClient(this.network, {
			contract_address: this.contractAddress,
			entrypoint: "approve",
			calldata: [spender, formattedAllowance.low, formattedAllowance.high]
		}, TransactionType.WRITE);
	}

	public transfer(amount: bigint, recipient: string): ChainClient {
		const formattedAmount = format_number(amount);
		return new ChainClient(this.network, {
			contract_address: this.contractAddress,
			entrypoint: "transfer",
			calldata: [recipient, formattedAmount.low, formattedAmount.high]
		}, TransactionType.WRITE);
	}

	public mintToken(amount: bigint, recipient: string): ChainClient {
		return new ChainClient(this.network, {
			contract_address: this.contractAddress,
			entrypoint: "mint",
			calldata: [recipient, amount]
		}, TransactionType.WRITE);
	}
}
