import { HttpError } from "../lib/httpError";
import type { UserDto } from "../types/auth";
import { usersDbService, type DbUser } from "./db/usersDbService";
import { jwtService } from "./jwtService";
import { starknetAuthService } from "./starknetAuthService";
import type { RegisterWalletPayload } from "../validators/authSchemas";

function toUserDto(user: DbUser): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    wallet: user.wallet,
    wallet_provider: user.wallet_provider,
    created_at: user.created_at,
  };
}

export const authService = {
  async registerWallet(payload: RegisterWalletPayload) {
    const isValid = await starknetAuthService.verifyWalletSignature({
      wallet: payload.wallet,
      messageHash: payload.message_hash,
      signature: payload.signature,
    });

    if (!isValid) {
      throw new HttpError(401, "Invalid Starknet signature");
    }

    let user = await usersDbService.findByWallet(payload.wallet);

    if (!user) {
      user = await usersDbService.createUser({
        wallet: payload.wallet,
        walletProvider: payload.wallet_provider,
        name: payload.name,
        email: payload.email,
      });
    } else if (user.wallet_provider !== payload.wallet_provider) {
      user = await usersDbService.updateWalletProvider(user.id, payload.wallet_provider);
    }

    const userDto = toUserDto(user);

    return {
      token: jwtService.signAuthToken(userDto),
      user: userDto,
    };
  },

  async getUserById(id: string): Promise<UserDto> {
    const user = await usersDbService.findById(id);

    if (!user) {
      throw new HttpError(401, "User not found");
    }

    return toUserDto(user);
  },
};
