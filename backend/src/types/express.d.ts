import type { UserDto } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: UserDto;
    }
  }
}

export {};
