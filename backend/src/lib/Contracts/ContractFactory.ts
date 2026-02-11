import { ERC20Contracts, LetheContracts } from "./types"
import { ERC20Service, Vault } from "./contracts"
import { getContractAddress } from "./utils/utilities"

export class ContractFactory {
    private network: string

    constructor() {
        this.network = process.env.STARKNET_NETWORK ?? "mainnet"
    }

    public getWBTCService() {
        if (this.network === "sepolia") {
            return new ERC20Service(this.network, ERC20Contracts.MOCK_WBTC)
        }
        return new ERC20Service(this.network, ERC20Contracts.WBTC)
    }

    public getVaultService() {
        return new Vault(this.network);
    }

    public getNetwork() {
        return this.network
    }

    public getNullifierRegistryAddress() {
        return getContractAddress(this.network, LetheContracts.NULLIFIER_REGISTRY);
    }
}