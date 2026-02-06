import { CallData, Provider, ec } from "starknet";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/httpError.js";

const provider = new Provider({ nodeUrl: env.starknetRpcUrl });

function normalizeHex(value) {
  if (typeof value !== "string") return value;
  return value.startsWith("0x") ? value.toLowerCase() : `0x${value.toLowerCase()}`;
}

async function getPublicKeyFromAccount(walletAddress) {
  const response = await provider.callContract({
    contractAddress: walletAddress,
    entrypoint: "get_public_key",
    calldata: CallData.compile({}),
  });

  if (!response || !Array.isArray(response) || response.length === 0) {
    throw new HttpError(401, "Could not fetch wallet public key");
  }

  return normalizeHex(response[0]);
}

export const starknetAuthService = {
  async verifyWalletSignature({ wallet, messageHash, signature }) {
    try {
      const publicKey = await getPublicKeyFromAccount(wallet);
      const sig = [normalizeHex(signature[0]), normalizeHex(signature[1])];
      const msgHash = normalizeHex(messageHash);
      return ec.starkCurve.verify(sig, msgHash, publicKey);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(401, "Invalid Starknet signature", error);
    }
  },
};
