import { HttpError } from "../lib/httpError.js";
import { jwtService } from "../services/jwtService.js";
import { authService } from "../services/authService.js";

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function authMiddleware(req, _res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new HttpError(401, "Missing bearer token");
    }

    const payload = jwtService.verifyAuthToken(token);
    const user = await authService.getUserById(payload.sub);

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
