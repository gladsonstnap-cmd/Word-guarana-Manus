import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const subscriptionBlocked = (ctx: TrpcContext) => {
  const agora = new Date();
  return !!ctx.user && !ctx.user.platformAdmin && (
    !ctx.empresa ||
    ctx.empresa.assinaturaStatus === "atrasada" ||
    ctx.empresa.assinaturaStatus === "suspensa" ||
    (ctx.empresa.assinaturaStatus === "teste" && !!ctx.empresa.testeAte && ctx.empresa.testeAte < agora) ||
    (ctx.empresa.assinaturaStatus === "ativa" && !!ctx.empresa.assinaturaAte && ctx.empresa.assinaturaAte < agora)
  );
};

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (subscriptionBlocked(ctx)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Assinatura vencida ou suspensa" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const platformAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || !ctx.user.platformAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo do administrador da plataforma" });
    }
    if (subscriptionBlocked(ctx)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Assinatura vencida ou suspensa" });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
