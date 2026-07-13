import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SafeUser } from "@workspace/db";
import { getJwtSecret } from "./env.js";

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = "1h";
const REFRESH_EXPIRES_IN = "30d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user: SafeUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, phone: user.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
}

export function verifyRefreshToken(token: string): jwt.JwtPayload {
  const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return payload;
}

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};
