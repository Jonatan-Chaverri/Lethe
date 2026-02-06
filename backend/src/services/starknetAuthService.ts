import { CallData, Provider, typedData } from "starknet";
import { env } from "../lib/env";
import { HttpError } from "../lib/httpError";

const provider = new Provider({ nodeUrl: env.starknetRpcUrl });

function normalizeHex(value: string): string {
  return value.startsWith("0x") ? value.toLowerCase() : `0x${value.toLowerCase()}`;
}

interface VerifySignatureInput {
  wallet: string;
  nonce: string;
  signature: [string, string];
}

function buildLoginTypedData(nonce: string) {
  return {
    domain: {
      name: "Lethe",
      version: "1",
      chainId: env.starknetChainId,
    },
    types: {
      StarkNetDomain: [
        { name: "name", type: "felt" },
        { name: "version", type: "felt" },
        { name: "chainId", type: "felt" },
      ],
      Message: [{ name: "nonce", type: "felt" }],
    },
    primaryType: "Message",
    message: { nonce },
  };
}

async function verifyWithAccountContract(
  wallet: string,
  messageHash: string,
  signature: [string, string]
): Promise<boolean> {
  try {
    await provider.callContract({
      contractAddress: wallet,
      entrypoint: "is_valid_signature",
      calldata: CallData.compile([messageHash, signature.length, ...signature]),
    });
    return true;
  } catch {
    return false;
  }
}

export const starknetAuthService = {
  async verifyWalletSignature({ wallet, nonce, signature }: VerifySignatureInput): Promise<boolean> {
    // TODO: Implement Starknet signature verification
    return true;
  }
};
