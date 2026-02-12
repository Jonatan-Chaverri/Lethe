import { CairoCustomEnum } from 'starknet';
import { LetheContracts, TransactionType } from "../types";
import { arrayToFeltHex, getContractAddress } from "../utils";
import { ChainClient } from "../ChainClient";
import { format_number } from "../utils/formatting";

export class Vault {
    private contract: LetheContracts
	private network: string

    public contractAddress: string

    constructor(network: string) {
        this.contract = LetheContracts.VAULT
        this.network = network
        this.contractAddress = getContractAddress(network, this.contract)
    }

    public getTotalShares(): ChainClient {
        return new ChainClient(this.network, {
            contract_address: this.contractAddress,
            entrypoint: "get_total_shares",
            calldata: []
        }, TransactionType.READ);
    }

    public getSharePrice(): ChainClient {
        return new ChainClient(this.network, {
            contract_address: this.contractAddress,
            entrypoint: "get_share_price",
            calldata: []
        }, TransactionType.READ);
    }

    public getKUnitsPrice(kUnits: bigint): ChainClient {
        return new ChainClient(this.network, {
            contract_address: this.contractAddress,
            entrypoint: "get_k_units_price",
            calldata: [kUnits]
        }, TransactionType.READ);
    }

    public getPurchasableKUnits(amountBTC: bigint): ChainClient {
        return new ChainClient(this.network, {
            contract_address: this.contractAddress,
            entrypoint: "get_purchasable_k_units",
            calldata: [amountBTC]
        }, TransactionType.READ);
    }

    public deposit(proofCalldata: string[]): ChainClient {
        const feltHexCalldata = arrayToFeltHex(proofCalldata);
        return new ChainClient(this.network, {
            contract_address: this.contractAddress,
            entrypoint: "deposit",
            calldata: feltHexCalldata
        }, TransactionType.WRITE);
    }

    public withdraw(proofCalldata: string[], recipient: string): ChainClient {
        const feltHexCalldata = arrayToFeltHex(proofCalldata);
        feltHexCalldata.push(recipient);
        return new ChainClient(this.network, {
            contract_address: this.contractAddress,
            entrypoint: "withdraw",
            calldata: feltHexCalldata
        }, TransactionType.WRITE);
    }
}
