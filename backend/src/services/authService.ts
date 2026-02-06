import { HttpError } from "../lib/httpError";
import type { SessionContext, SessionTokens, UserDto } from "../types/auth";
import { usersDbService, type DbUser } from "./db/usersDbService";
import { jwtService } from "./jwtService";
import { starknetAuthService } from "./starknetAuthService";
import type { RefreshSessionPayload, RegisterWalletPayload } from "../validators/authSchemas";
import { sessionsDbService } from "./db/sessionsDbService";

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

function createSession(user: UserDto): SessionTokens {
  return {
    access_token: jwtService.signAccessToken(user),
    refresh_token: jwtService.signRefreshToken(user),
  };
}

async function persistLoginSession(
  user: UserDto,
  tokens: SessionTokens,
  context?: SessionContext
): Promise<void> {
  const session = await sessionsDbService.createSession({
    userId: user.id,
    userAgent: context?.userAgent,
    deviceInfo: context?.deviceInfo,
    ipAddress: context?.ipAddress,
  });

  await sessionsDbService.createRefreshToken({
    userId: user.id,
    sessionId: session.id,
    token: tokens.refresh_token,
    expiresAt: jwtService.getRefreshTokenExpiry(tokens.refresh_token),
  });
}

export const authService = {
  async registerWallet(payload: RegisterWalletPayload, context?: SessionContext) {
    const isValid = await starknetAuthService.verifyWalletSignature({
      wallet: payload.wallet,
      nonce: payload.nonce,
      signature: payload.signature,
    });

    if (!isValid) {
      throw new HttpError(401, "Invalid Starknet signature");
    }

    let user = await usersDbService.findByWallet(payload.wallet);

    if (!user) {
      user = await usersDbService.createUser({
        wallet: payload.wallet,
        walletProvider: payload.wallet_provider
      });
    } else if (user.wallet_provider !== payload.wallet_provider) {
      user = await usersDbService.updateWalletProvider(user.id, payload.wallet_provider);
    }

    const userDto = toUserDto(user);
    const tokens = createSession(userDto);
    await persistLoginSession(userDto, tokens, context);

    return {
      ...tokens,
      user: userDto,
    };
  },

  async refreshSession(payload: RefreshSessionPayload, context?: SessionContext) {
    const refreshPayload = jwtService.verifyRefreshToken(payload.refresh_token);
    const dbRefreshToken = await sessionsDbService.findRefreshToken(payload.refresh_token);

    if (!dbRefreshToken) {
      throw new HttpError(401, "Refresh token not found in active sessions");
    }

    if (!dbRefreshToken.session.is_active) {
      throw new HttpError(401, "Session is inactive");
    }

    if (dbRefreshToken.expires_at.getTime() <= Date.now()) {
      await sessionsDbService.deleteRefreshToken(payload.refresh_token);
      throw new HttpError(401, "Refresh token expired");
    }

    if (dbRefreshToken.user_id !== refreshPayload.sub) {
      throw new HttpError(401, "Refresh token subject mismatch");
    }

    const user = await this.getUserById(dbRefreshToken.user_id);
    const newTokens = createSession(user);

    await sessionsDbService.deleteRefreshToken(payload.refresh_token);
    await sessionsDbService.createRefreshToken({
      userId: user.id,
      sessionId: dbRefreshToken.session_id,
      token: newTokens.refresh_token,
      expiresAt: jwtService.getRefreshTokenExpiry(newTokens.refresh_token),
    });
    await sessionsDbService.touchSession(dbRefreshToken.session_id);

    if (context?.ipAddress || context?.userAgent) {
      // Session activity metadata can evolve later; we at least keep activity updated.
    }

    return newTokens;
  },

  async getUserById(id: string): Promise<UserDto> {
    const user = await usersDbService.findById(id);

    if (!user) {
      throw new HttpError(401, "User not found");
    }

    return toUserDto(user);
  },
};
