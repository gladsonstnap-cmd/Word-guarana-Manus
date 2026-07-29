import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { AppUser, Empresa } from "../../drizzle/schema";
import { getLocalSessionUserId } from "../localAuth";
import { getAppUserById, getEmpresaById } from "../db";

export type AuthUser = Omit<AppUser, "passwordHash">;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthUser | null;
  empresa: Empresa | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AuthUser | null = null;
  let empresa: Empresa | null = null;

  const localUserId = await getLocalSessionUserId(opts.req);
  if (localUserId) {
    const localUser = await getAppUserById(localUserId);
    if (localUser?.active) {
      const { passwordHash: _, ...safeUser } = localUser;
      user = safeUser;
      empresa = await getEmpresaById(localUser.empresaId) ?? null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    empresa,
  };
}
