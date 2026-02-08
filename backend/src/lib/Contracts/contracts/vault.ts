import { CairoCustomEnum } from 'starknet';
import { LetheContracts, TransactionType } from "../types";
import { getContractAddress } from "../utils";
import { ChainClient } from "../ChainClient";
import { ethers } from 'ethers';
import { logger } from '../../logger';

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

    public getShareUnitPrice(): ChainClient {
        return new ChainClient(this.network, {
            contract_address: this.contractAddress,
            entrypoint: "get_share_unit_price",
            calldata: []
        }, TransactionType.READ);
    }

    public deposit(proof: Uint8Array): ChainClient {
        const proofBytes = ethers.hexlify(proof);
        logger.info(`Depositing proof: ${proofBytes}`);
        return new ChainClient(this.network, {
            contract_address: this.contractAddress,
            entrypoint: "deposit",
            calldata: [proofBytes]
        }, TransactionType.WRITE);
    }
}