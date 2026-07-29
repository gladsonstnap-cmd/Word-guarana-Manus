import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { criarPedido, listarPedidos, obterPedido, atualizarStatusPedido, deletarPedido, atualizarImagemPedido, obterPedidosPorData, criarFechamentoCaixa, obterFechamentoPorData, listarFechamentos, obterPedidosFechadosPorData, countAppUsers, createAppUser, getAppUserByUsername, listAppUsers, updateAppUser, deleteCommonAppUser } from "./db";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";
import { createLocalSession, hashPassword, verifyPassword } from "./localAuth";
import { TRPCError } from "@trpc/server";

async function ensureInitialAdmin() {
  if (await countAppUsers()) return;
  if (!ENV.adminUsername || !ENV.adminPassword) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Administrador inicial não configurado" });
  }
  await createAppUser({
    username: ENV.adminUsername,
    name: "Administrador",
    passwordHash: await hashPassword(ENV.adminPassword),
    role: "admin",
    active: 1,
  });
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure.input(z.object({
      username: z.string().min(1).max(50),
      password: z.string().min(1).max(200),
    })).mutation(async ({ input, ctx }) => {
      await ensureInitialAdmin();
      const user = await getAppUserByUsername(input.username);
      if (!user?.active || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
      }
      const { passwordHash: _, ...safeUser } = user;
      return { user: safeUser, token: await createLocalSession(user.id) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  usuarios: router({
    listar: adminProcedure.query(() => listAppUsers()),
    criar: adminProcedure.input(z.object({
      username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, "Usuário inválido"),
      name: z.string().min(2).max(100),
      password: z.string().min(6).max(200),
      role: z.enum(["user", "admin"]).default("user"),
    })).mutation(async ({ input }) => {
      if (await getAppUserByUsername(input.username)) {
        throw new TRPCError({ code: "CONFLICT", message: "Nome de usuário já existe" });
      }
      const user = await createAppUser({
        username: input.username,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        active: 1,
      });
      if (!user) return null;
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    }),
    deletar: adminProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => deleteCommonAppUser(input.id)),
    atualizar: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(2).max(100).optional(),
      password: z.string().min(6).max(200).optional(),
      role: z.enum(["user", "admin"]).optional(),
      active: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, password, active, ...rest } = input;
      const user = await updateAppUser(id, {
        ...rest,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
        ...(active === undefined ? {} : { active: active ? 1 : 0 }),
      });
      if (!user) return null;
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    }),
  }),

  pedidos: router({
    painelPublico: publicProcedure.query(async () => {
      const hoje = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Fortaleza",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const pedidosDoDia = await obterPedidosPorData(hoje);

      return pedidosDoDia
        .filter(pedido => !pedido.encerrado)
        .map(pedido => ({
          id: pedido.id,
          cliente: pedido.cliente.trim().split(/\s+/)[0],
          tamanho: pedido.tamanho,
          sabor: pedido.sabor,
          quantidade: pedido.quantidade,
          status: pedido.status,
          createdAt: pedido.createdAt,
          itens: pedido.itens,
          copos: (pedido.copos ?? []).map(copo => ({
            tamanho: copo.tamanho,
            sabor: copo.sabor,
            quantidade: copo.quantidade,
            complementos: copo.complementos ?? [],
            coberturas: copo.coberturas ?? [],
          })),
        }));
    }),

    criar: protectedProcedure
      .input(z.object({
        cliente: z.string().min(1, "Nome do cliente é obrigatório"),
        tamanho: z.string(),
        sabor: z.string(),
        quantidade: z.number().int().min(1).default(1),
        copos: z.array(z.object({
          tamanho: z.string(),
          sabor: z.string(),
          quantidade: z.number().int().min(1),
          valor: z.number().positive(),
          valorPromocional: z.number().positive().nullable().optional(),
          complementos: z.array(z.string()).default([]),
          coberturas: z.array(z.string()).default([]),
        })).min(1),
        formaPagamento: z.enum(["dinheiro", "pix", "cartao"]).default("dinheiro"),
        valor: z.number().positive(),
        itens: z.array(z.string()).default([]),
      }))
      .mutation(async ({ input }) => {
        const pedido = await criarPedido({
          cliente: input.cliente,
          tamanho: input.tamanho,
          sabor: input.sabor,
          quantidade: input.quantidade,
          copos: input.copos,
          formaPagamento: input.formaPagamento,
          valor: input.valor,
          status: "pendente",
          encerrado: 0,
          itens: input.itens,
        });
        return pedido;
      }),

    listar: protectedProcedure.query(async () => {
      return await listarPedidos();
    }),

    obter: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await obterPedido(input.id);
      }),

    atualizarStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendente", "em-preparo", "pronto", "entregue"]),
      }))
      .mutation(async ({ input }) => {
        return await atualizarStatusPedido(input.id, input.status);
      }),

    deletar: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deletarPedido(input.id);
      }),

    uploadImagem: protectedProcedure
      .input(z.object({
        id: z.number(),
        imagem: z.string(), // base64 string
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        try {
          // Converter base64 para buffer
          const buffer = Buffer.from(input.imagem.split(",")[1] || input.imagem, "base64");
          
          // Fazer upload para storage
          const { url } = await storagePut(
            `pedidos/${input.id}/imagem`,
            buffer,
            input.mimeType
          );

          // Atualizar pedido com URL da imagem
          const pedido = await atualizarImagemPedido(input.id, url);
          return pedido;
        } catch (error) {
          console.error("[Upload] Failed to upload image:", error);
          throw error;
        }
      }),

    obterPorData: adminProcedure
      .input(z.object({ data: z.string() }))
      .query(async ({ input }) => {
        return await obterPedidosPorData(input.data);
      }),

    gerarRelatorioJSON: adminProcedure
      .input(z.object({ data: z.string() }))
      .query(async ({ input }) => {
        const pedidos = await obterPedidosPorData(input.data);
        const totalPedidos = pedidos.length;
        const pedidosEntregues = pedidos.filter(p => p.status === "entregue").length;
        const faturamentoTotal = pedidos.reduce((acc, p) => acc + p.valor, 0);
        
        return {
          data: input.data,
          totalPedidos,
          pedidosEntregues,
          faturamentoTotal,
          pedidos,
        };
      }),
  }),

  caixa: router({
    fechar: adminProcedure
      .input(z.object({
        data: z.string(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const pedidos = await obterPedidosPorData(input.data);
        const totalPedidos = pedidos.length;
        const pedidosEntregues = pedidos.filter(p => p.status === "entregue").length;
        const faturamentoTotal = pedidos.reduce((acc, p) => acc + p.valor, 0);

        // Calcular tempo médio de preparo (em minutos)
        let tempoMedioPreparo = 0;
        if (pedidosEntregues > 0) {
          const temposTotais = pedidos
            .filter(p => p.status === "entregue" && p.createdAt && p.updatedAt)
            .reduce((acc, p) => {
              const diff = (p.updatedAt!.getTime() - p.createdAt!.getTime()) / 1000 / 60;
              return acc + diff;
            }, 0);
          tempoMedioPreparo = Math.round(temposTotais / pedidosEntregues);
        }

        const fechamento = await criarFechamentoCaixa({
          data: input.data,
          totalPedidos,
          faturamentoTotal,
          pedidosEntregues,
          tempoMedioPreparo,
          observacoes: input.observacoes,
        });

        return fechamento;
      }),

    obterPorData: adminProcedure
      .input(z.object({ data: z.string() }))
      .query(async ({ input }) => {
        return await obterFechamentoPorData(input.data);
      }),

    listar: adminProcedure.query(async () => {
      return await listarFechamentos();
    }),

    gerarPDF: adminProcedure
      .input(z.object({ data: z.string() }))
      .query(async ({ input }) => {
        const pedidos = await obterPedidosPorData(input.data);
        const totalPedidos = pedidos.length;
        const pedidosEntregues = pedidos.filter(p => p.status === "entregue").length;
        const faturamentoTotal = pedidos.reduce((acc, p) => acc + p.valor, 0);

        // Retornar dados para gerar PDF no frontend
        return {
          data: input.data,
          totalPedidos,
          pedidosEntregues,
          faturamentoTotal,
          pedidos: pedidos.map(p => ({
            id: p.id,
            cliente: p.cliente,
            sabor: p.sabor,
            tamanho: p.tamanho,
            quantidade: p.quantidade,
            copos: p.copos || [],
            formaPagamento: p.formaPagamento,
            valor: p.valor,
            status: p.status,
            itens: p.itens?.join(", ") || "",
          })),
        };
      }),

    obterEstatisticas: adminProcedure.query(async () => {
      const fechamentos = await listarFechamentos();
      
      const totalFaturamento = fechamentos.reduce((acc, f) => acc + f.faturamentoTotal, 0);
      const totalPedidos = fechamentos.reduce((acc, f) => acc + f.totalPedidos, 0);
      const totalEntregues = fechamentos.reduce((acc, f) => acc + f.pedidosEntregues, 0);
      const mediaPorDia = fechamentos.length > 0 ? totalFaturamento / fechamentos.length : 0;
      const tempoMedioGeral = fechamentos.length > 0 
        ? Math.round(fechamentos.reduce((acc, f) => acc + (f.tempoMedioPreparo || 0), 0) / fechamentos.length)
        : 0;

      const faturamentoPorDia = fechamentos.map(f => ({
        data: f.data,
        faturamento: f.faturamentoTotal,
        pedidos: f.totalPedidos,
        entregues: f.pedidosEntregues,
      }));

      return {
        totalFaturamento,
        totalPedidos,
        totalEntregues,
        mediaPorDia,
        tempoMedioGeral,
        diasRegistrados: fechamentos.length,
        faturamentoPorDia,
        fechamentos: fechamentos.map(f => ({
          id: f.id,
          data: f.data,
          totalPedidos: f.totalPedidos,
          faturamentoTotal: f.faturamentoTotal,
          pedidosEntregues: f.pedidosEntregues,
          tempoMedioPreparo: f.tempoMedioPreparo,
          observacoes: f.observacoes,
        })),
      };
    }),

    obterDetalhesFechamento: adminProcedure
      .input(z.object({ data: z.string() }))
      .query(async ({ input }) => {
        const pedidos = await obterPedidosFechadosPorData(input.data);
        const fechamento = await obterFechamentoPorData(input.data);

        const totalPedidos = pedidos.length;
        const pedidosEntregues = pedidos.filter(p => p.status === "entregue").length;
        const faturamentoTotal = pedidos.reduce((acc, p) => acc + p.valor, 0);

        let tempoMedioPreparo = 0;
        if (pedidosEntregues > 0) {
          const temposTotais = pedidos
            .filter(p => p.status === "entregue" && p.createdAt && p.updatedAt)
            .reduce((acc, p) => {
              const diff = (p.updatedAt!.getTime() - p.createdAt!.getTime()) / 1000 / 60;
              return acc + diff;
            }, 0);
          tempoMedioPreparo = Math.round(temposTotais / pedidosEntregues);
        }

        const pedidosPorStatus = {
          pendente: pedidos.filter(p => p.status === "pendente"),
          emPreparo: pedidos.filter(p => p.status === "em-preparo"),
          pronto: pedidos.filter(p => p.status === "pronto"),
          entregue: pedidos.filter(p => p.status === "entregue"),
        };

        const pedidosPorSabor = pedidos.reduce((acc, p) => {
          if (!acc[p.sabor]) {
            acc[p.sabor] = [];
          }
          acc[p.sabor].push(p);
          return acc;
        }, {} as Record<string, typeof pedidos>);

        return {
          data: input.data,
          fechamento,
          resumo: {
            totalPedidos,
            pedidosEntregues,
            faturamentoTotal,
            tempoMedioPreparo,
          },
          pedidosPorStatus,
          pedidosPorSabor,
          pedidos: pedidos.map(p => ({
            id: p.id,
            cliente: p.cliente,
            sabor: p.sabor,
            tamanho: p.tamanho,
            quantidade: p.quantidade,
            copos: p.copos || [],
            formaPagamento: p.formaPagamento,
            valor: p.valor,
            status: p.status,
            itens: p.itens || [],
            imagemUrl: p.imagemUrl,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
