import configExternalContracts from "../abi/deployedContracts";
import { LetheContracts } from "../types";

export function getContractAddress(network: string, contract: LetheContracts) {
    const env = (network) as keyof typeof configExternalContracts;
    return configExternalContracts[env][contract].address;
}
