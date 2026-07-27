import { promisify } from "node:util";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { ENV } from "./_core/env";

const scryptAsync = promisify(scrypt);

function secret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET não configurado");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, encoded] = stored.split(":");
  if (!salt || !encoded) return false;
  const expected = Buffer.from(encoded, "hex");
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createLocalSession(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function getLocalSessionUserId(req: Request) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token || !ENV.cookieSecret) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}
