import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, AppUser } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getLocalSessionUserId } from "../localAuth";
import { getAppUserById } from "../db";

export type AuthUser = User | Omit<AppUser, "passwordHash">;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AuthUser | null = null;

  const localUserId = await getLocalSessionUserId(opts.req);
  if (localUserId) {
    const localUser = await getAppUserById(localUserId);
    if (localUser?.active) {
      const { passwordHash: _, ...safeUser } = localUser;
      user = safeUser;
    }
  }

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
