import { Account, CallResult, Contract, RpcProvider, Abi } from "starknet";

import { LetheContracts, TransactionDetails, TransactionType } from "./types"
import configExternalContracts from "./abi/deployedContracts";

export class ChainClient {
    private network: string
    private account: Account
    private provider: RpcProvider
    private externalContract: Contract | null = null

    private transactionDetails: TransactionDetails | null = null
    private transactionType: TransactionType | null = null

    constructor(
        network: string, 
        transactionDetails: TransactionDetails | null, 
        transactionType: TransactionType | null
    ) {
        this.network = network
        this.transactionDetails = transactionDetails
        this.transactionType = transactionType
        this.provider = new RpcProvider({
            nodeUrl: process.env.RPC_URL
        });
        this.account = this.getLocalAccount()
    }

    private getLocalAccount() {
        const account = new Account(
            {
                provider: this.provider,
                address: process.env.MAINNET_ACCOUNT_ADDR ?? "",
                signer: process.env.MAINNET_ACCOUNT_PRIVATE_KEY ?? "",
            }
        );
        return account;
    };

    private getContract(contract: LetheContracts) {
        const env = (this.network) as keyof typeof configExternalContracts;
        const contractConfig = configExternalContracts[env][contract];
        if (!contractConfig) {
            throw new Error("Contract not found");
        }

        return new Contract({
            abi: contractConfig.abi,
            address: contractConfig.address,
            providerOrAccount: this.account,
        });
    };

    private getLetheContract(contract_address: string) {
        const env = this.network as keyof typeof configExternalContracts;
        const contract = Object.values(LetheContracts).find(c => configExternalContracts[env][c].address === contract_address);
        if (!contract) {
            throw new Error("Contract not found");
        }
        return contract;
    }

    private async readCall(transaction: TransactionDetails) {
        if (this.externalContract) {
            return await this.externalContract.call(
                transaction.entrypoint, 
                transaction.calldata, 
                { blockIdentifier: "latest" }
            );
        }
        const letheContract = this.getLetheContract(transaction.contract_address);
        const contractInstance = this.getContract(letheContract);
        // Use "latest" instead of "pending" as Cartridge RPC doesn't support "pending"
        const result = await contractInstance.call(transaction.entrypoint, transaction.calldata, { blockIdentifier: "latest" });
        return result;
    };

    private async writeCall(transaction: TransactionDetails) {
        const letheContract = this.getLetheContract(transaction.contract_address);
        const contractInstance = this.getContract(letheContract);
        const result = await contractInstance.invoke(transaction.entrypoint, transaction.calldata);
        return result;
    }

    public async readStorageAt(contract_address: string, selector: string) {
        const account = this.account;
        return await account.getStorageAt(
            contract_address,
            selector,
            "latest",
        )
    };

    public async call(): Promise<{ transaction_hash?: string } | CallResult> {
        if (!this.transactionDetails) {
            throw new Error("Transaction details are not set")
        }
        if (!this.transactionType) {
            throw new Error("Transaction type is not set")
        }
        if (this.transactionType === TransactionType.READ) {
            return await this.readCall(this.transactionDetails!)
        } else {
            return await this.writeCall(this.transactionDetails!)
        }
    }

    public setTransactionToExternalContract(abi: Abi, address: string): void {
        const contract = new Contract({
            abi: abi,
            address: address,
            providerOrAccount: this.account,
        });
        if (this.transactionType !== TransactionType.READ) {
            throw new Error("Only READ transactions are allowed for external contracts")
        }
        this.externalContract = contract;
    }

    public getTransactionDetails() {
        if (!this.transactionDetails) {
            return {
                contract_address: "",
                entrypoint: "",
                calldata: [],
            }
        }
        return this.transactionDetails
    }

    public getTransactionType() {
        if (!this.transactionType) {
            return TransactionType.READ
        }
        return this.transactionType
    }

    public getNetwork() {
        return this.network
    }
}