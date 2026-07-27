import { promisify } from "node:util";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { parse } from "cookie";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

const scryptAsync = promisify(scrypt);
export const LOCAL_SESSION_COOKIE = "world_guarana_session";

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

export async function setLocalSession(res: Response, req: Request, userId: number) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  res.cookie(LOCAL_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function getLocalSessionUserId(req: Request) {
  const cookies = parse(req.headers.cookie ?? "");
  const token = cookies[LOCAL_SESSION_COOKIE];
  if (!token || !ENV.cookieSecret) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}
