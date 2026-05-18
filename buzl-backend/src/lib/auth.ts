import { NextRequest } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";

const FALLBACK_JWT_SECRET = "development-only-buzl-secret";

export type AuthUser = JwtPayload & {
  id: string;
  username: string;
  role: "admin" | "worker" | string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  return secret || FALLBACK_JWT_SECRET;
}

export function signToken(payload: object) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === "string" || !decoded.id || !decoded.username || !decoded.role) {
      return null;
    }
    return decoded as AuthUser;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}
