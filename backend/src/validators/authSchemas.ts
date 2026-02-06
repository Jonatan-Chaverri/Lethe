import { z } from "zod";

const feltHex = z
  .string()
  .regex(/^0x[a-fA-F0-9]+$/, "Must be a hex felt value prefixed with 0x");

export const registerWalletRequestSchema = z.object({
  body: z.object({
    wallet: z
      .string()
      .min(1, 'Wallet address is required')
      .regex(/^0x[a-fA-F0-9]+$/, 'Invalid wallet address format'),
    signature: z
      .tuple([
        z.string().regex(/^0x[a-fA-F0-9]+$/),
        z.string().regex(/^0x[a-fA-F0-9]+$/),
      ]),
    nonce: z
      .string()
      .regex(/^0x[a-fA-F0-9]+$/, "Invalid nonce format"),
    wallet_provider: z.enum(['wallet', 'cavos']).default('wallet'),
  }),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export const refreshSessionRequestSchema = z.object({
  body: z.object({
    refresh_token: z
      .string()
      .min(1, "refresh_token is required"),
  }),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
});

export type RegisterWalletPayload = z.infer<typeof registerWalletRequestSchema>['body'];
export type RegisterWalletRequestPayload = z.infer<typeof registerWalletRequestSchema>['body'];
export type RefreshSessionPayload = z.infer<typeof refreshSessionRequestSchema>["body"];
