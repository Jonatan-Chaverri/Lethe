import { CallData, Provider, ec } from "starknet";
import { env } from "../lib/env";
import { HttpError } from "../lib/httpError";

const provider = new Provider({ nodeUrl: env.starknetRpcUrl });

function normalizeHex(value: string): string {
  return value.startsWith("0x") ? value.toLowerCase() : `0x${value.toLowerCase()}`;
}

async function getPublicKeyFromAccount(walletAddress: string): Promise<string> {
  const response = await provider.callContract({
    contractAddress: walletAddress,
    entrypoint: "get_public_key",
    calldata: CallData.compile({}),
  });

  if (!response || !Array.isArray(response) || response.length === 0) {
    throw new HttpError(401, "Could not fetch wallet public key");
  }

  return normalizeHex(String(response[0]));
}

interface VerifySignatureInput {
  wallet: string;
  messageHash: string;
  signature: [string, string];
}

export const starknetAuthService = {
  async verifyWalletSignature({ wallet, messageHash, signature }: VerifySignatureInput): Promise<boolean> {
    try {
      const publicKey = await getPublicKeyFromAccount(wallet);
      const sig = {
        r: BigInt(normalizeHex(signature[0])),
        s: BigInt(normalizeHex(signature[1])),
      };
      const msgHash = normalizeHex(messageHash);
      return ec.starkCurve.verify(
        sig as Parameters<typeof ec.starkCurve.verify>[0],
        msgHash,
        publicKey
      );
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(401, "Invalid Starknet signature", error);
    }
  },
};
