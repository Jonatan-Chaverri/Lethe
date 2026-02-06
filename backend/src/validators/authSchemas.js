import { z } from "zod";

const feltHex = z
  .string()
  .regex(/^0x[a-fA-F0-9]+$/, "Must be a hex felt value prefixed with 0x");

export const registerWalletSchema = z.object({
  wallet: feltHex,
  wallet_provider: z.string().min(1),
  message_hash: feltHex,
  signature: z.tuple([feltHex, feltHex]),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export const registerWalletRequestSchema = z.object({
  body: registerWalletSchema,
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});
