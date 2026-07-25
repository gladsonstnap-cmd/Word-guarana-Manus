import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { criarPedido, listarPedidos, obterPedido, atualizarStatusPedido, deletarPedido, atualizarImagemPedido, obterPedidosPorData, criarFechamentoCaixa, obterFechamentoPorData, listarFechamentos, obterPedidosFechadosPorData } from "./db";
import { storagePut } from "./storage";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  pedidos: router({
    criar: publicProcedure
      .input(z.object({
        cliente: z.string().min(1, "Nome do cliente é obrigatório"),
        tamanho: z.string(),
        sabor: z.string(),
        valor: z.number().positive(),
        itens: z.array(z.string()).default([]),
      }))
      .mutation(async ({ input }) => {
        const pedido = await criarPedido({
          cliente: input.cliente,
          tamanho: input.tamanho,
          sabor: input.sabor,
          valor: input.valor,
          status: "pendente",
          encerrado: 0,
          itens: input.itens,
        });
        return pedido;
      }),

    listar: publicProcedure.query(async () => {
      return await listarPedidos();
    }),

    obter: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await obterPedido(input.id);
      }),

    atualizarStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendente", "em-preparo", "pronto", "entregue"]),
      }))
      .mutation(async ({ input }) => {
        return await atualizarStatusPedido(input.id, input.status);
      }),

    deletar: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deletarPedido(input.id);
      }),

    uploadImagem: publicProcedure
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

    obterPorData: publicProcedure
      .input(z.object({ data: z.string() }))
      .query(async ({ input }) => {
        return await obterPedidosPorData(input.data);
      }),

    gerarRelatorioJSON: publicProcedure
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
    fechar: publicProcedure
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

    obterPorData: publicProcedure
      .input(z.object({ data: z.string() }))
      .query(async ({ input }) => {
        return await obterFechamentoPorData(input.data);
      }),

    listar: publicProcedure.query(async () => {
      return await listarFechamentos();
    }),

    gerarPDF: publicProcedure
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
            valor: p.valor,
            status: p.status,
            itens: p.itens?.join(", ") || "",
          })),
        };
      }),

    obterEstatisticas: publicProcedure.query(async () => {
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
        faturamento: f.faturamentoTotal / 100,
        pedidos: f.totalPedidos,
        entregues: f.pedidosEntregues,
      }));

      return {
        totalFaturamento: totalFaturamento / 100,
        totalPedidos,
        totalEntregues,
        mediaPorDia: mediaPorDia / 100,
        tempoMedioGeral,
        diasRegistrados: fechamentos.length,
        faturamentoPorDia,
        fechamentos: fechamentos.map(f => ({
          id: f.id,
          data: f.data,
          totalPedidos: f.totalPedidos,
          faturamentoTotal: f.faturamentoTotal / 100,
          pedidosEntregues: f.pedidosEntregues,
          tempoMedioPreparo: f.tempoMedioPreparo,
          observacoes: f.observacoes,
        })),
      };
    }),

    obterDetalhesFechamento: publicProcedure
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
            faturamentoTotal: faturamentoTotal / 100,
            tempoMedioPreparo,
          },
          pedidosPorStatus,
          pedidosPorSabor,
          pedidos: pedidos.map(p => ({
            id: p.id,
            cliente: p.cliente,
            sabor: p.sabor,
            tamanho: p.tamanho,
            valor: p.valor / 100,
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
