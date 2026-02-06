import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../lib/httpError";

const REFRESH_TOKEN_SELECT = {
  id: true,
  token: true,
  user_id: true,
  session_id: true,
  expires_at: true,
  created_at: true,
  session: {
    select: {
      id: true,
      user_id: true,
      is_active: true,
      last_activity: true,
      created_at: true,
    },
  },
} satisfies Prisma.RefreshTokenSelect;

export type DbRefreshToken = Prisma.RefreshTokenGetPayload<{
  select: typeof REFRESH_TOKEN_SELECT;
}>;

interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  deviceInfo?: string | null;
  ipAddress?: string | null;
}

interface CreateRefreshTokenInput {
  userId: string;
  sessionId: string;
  token: string;
  expiresAt: Date;
}

export const sessionsDbService = {
  async createSession(input: CreateSessionInput) {
    try {
      return await prisma.session.create({
        data: {
          user_id: input.userId,
          user_agent: input.userAgent ?? null,
          device_info: input.deviceInfo ?? null,
          ip_address: input.ipAddress ?? null,
          is_active: true,
        },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to create session", error);
    }
  },

  async createRefreshToken(input: CreateRefreshTokenInput) {
    try {
      return await prisma.refreshToken.create({
        data: {
          token: input.token,
          user_id: input.userId,
          session_id: input.sessionId,
          expires_at: input.expiresAt,
        },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to persist refresh token", error);
    }
  },

  async findRefreshToken(token: string): Promise<DbRefreshToken | null> {
    try {
      return await prisma.refreshToken.findUnique({
        where: { token },
        select: REFRESH_TOKEN_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query refresh token", error);
    }
  },

  async deleteRefreshToken(token: string): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: { token },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to delete refresh token", error);
    }
  },

  async touchSession(sessionId: string): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          last_activity: new Date(),
        },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to update session activity", error);
    }
  },
};

