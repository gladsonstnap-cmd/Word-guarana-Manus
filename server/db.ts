import { eq, and, desc, gte, lt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, empresas, InsertEmpresa, appUsers, InsertAppUser, pedidos, itensPedido, Pedido, InsertPedido, ItemPedido, InsertItemPedido, fechamentoCaixa, FechamentoCaixa, InsertFechamentoCaixa } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAppUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1))[0];
}

export async function getAppUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(appUsers).where(eq(appUsers.username, username.toLowerCase())).limit(1))[0];
}

export async function ensureDefaultEmpresa() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existente = (await db.select().from(empresas).where(eq(empresas.id, 1)).limit(1))[0];
  if (existente) return existente;
  await db.insert(empresas).values({
    id: 1,
    nome: "World Guaraná",
    slug: "world-guarana",
    plano: "profissional",
    assinaturaStatus: "ativa",
  });
  return (await db.select().from(empresas).where(eq(empresas.id, 1)).limit(1))[0];
}

export async function ensurePlatformAdmin(username: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(appUsers)
    .set({ platformAdmin: 1 })
    .where(eq(appUsers.username, username.toLowerCase()));
}

export async function getEmpresaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(empresas).where(eq(empresas.id, id)).limit(1))[0];
}

export async function listEmpresas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(empresas).orderBy(empresas.nome);
}

export async function createEmpresa(
  empresa: InsertEmpresa,
  admin: Pick<InsertAppUser, "username" | "name" | "passwordHash">
) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(empresas).values(empresa);
  const empresaId = (result as any)[0].insertId as number;
  await db.insert(appUsers).values({
    ...admin,
    username: admin.username.toLowerCase(),
    empresaId,
    role: "admin",
    platformAdmin: 0,
    active: 1,
  });
  return getEmpresaById(empresaId);
}

export async function updateEmpresa(
  id: number,
  data: Partial<Pick<InsertEmpresa, "nome" | "plano" | "assinaturaStatus" | "valorMensalidade" | "testeAte" | "assinaturaAte">>
) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(empresas).set(data).where(eq(empresas.id, id));
  return getEmpresaById(id);
}

export async function listAppUsers(empresaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: appUsers.id, username: appUsers.username, name: appUsers.name,
    role: appUsers.role, active: appUsers.active, createdAt: appUsers.createdAt,
  }).from(appUsers).where(eq(appUsers.empresaId, empresaId)).orderBy(appUsers.name);
}

export async function createAppUser(data: InsertAppUser) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(appUsers).values({ ...data, username: data.username.toLowerCase() });
  return getAppUserByUsername(data.username);
}

export async function updateAppUser(id: number, empresaId: number, data: Partial<Pick<InsertAppUser, "name" | "passwordHash" | "role" | "active">>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(appUsers).set(data).where(and(eq(appUsers.id, id), eq(appUsers.empresaId, empresaId)));
  const user = await getAppUserById(id);
  return user?.empresaId === empresaId ? user : undefined;
}

export async function deleteCommonAppUser(id: number, empresaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const user = await getAppUserById(id);
  if (!user || user.empresaId !== empresaId) return false;
  if (user.role === "admin") throw new Error("Administradores não podem ser excluídos");
  await db.delete(appUsers).where(eq(appUsers.id, id));
  return true;
}

export async function countAppUsers() {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(appUsers);
  return Number(result?.count ?? 0);
}

// ============ PEDIDOS QUERIES ============

export async function criarPedido(data: InsertPedido & { itens: string[] }): Promise<Pedido | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create pedido: database not available");
    return null;
  }

  try {
    const { itens, ...pedidoData } = data;
    
    // Inserir pedido
    const result = await db.insert(pedidos).values(pedidoData);
    const pedidoId = (result as any)[0].insertId;

    // Inserir itens (complementos)
    if (itens && itens.length > 0) {
      const itensData: InsertItemPedido[] = itens.map(complemento => ({
        pedidoId,
        complemento,
      }));
      await db.insert(itensPedido).values(itensData);
    }

    // Retornar pedido criado
    const createdPedido = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
    return createdPedido[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create pedido:", error);
    throw error;
  }
}

export async function listarPedidos(empresaId: number): Promise<(Pedido & { itens: string[] })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list pedidos: database not available");
    return [];
  }

  try {
    const allPedidos = await db.select().from(pedidos).where(eq(pedidos.empresaId, empresaId)).orderBy(desc(pedidos.createdAt));
    
    // Buscar itens para cada pedido
    const pedidosComItens = await Promise.all(
      allPedidos.map(async (p) => {
        const items = await db.select().from(itensPedido).where(eq(itensPedido.pedidoId, p.id));
        return {
          ...p,
          itens: items.map(item => item.complemento),
        };
      })
    );

    return pedidosComItens;
  } catch (error) {
    console.error("[Database] Failed to list pedidos:", error);
    throw error;
  }
}

export async function obterPedido(id: number, empresaId: number): Promise<(Pedido & { itens: string[] }) | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get pedido: database not available");
    return null;
  }

  try {
    const result = await db.select().from(pedidos).where(and(eq(pedidos.id, id), eq(pedidos.empresaId, empresaId))).limit(1);
    if (!result[0]) return null;

    const items = await db.select().from(itensPedido).where(eq(itensPedido.pedidoId, id));
    return {
      ...result[0],
      itens: items.map(item => item.complemento),
    };
  } catch (error) {
    console.error("[Database] Failed to get pedido:", error);
    throw error;
  }
}

export async function atualizarStatusPedido(id: number, empresaId: number, novoStatus: string): Promise<Pedido | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update pedido: database not available");
    return null;
  }

  try {
    const isEntregue = novoStatus === "entregue";
    await db.update(pedidos).set({
      status: novoStatus as any,
      encerrado: isEntregue ? 1 : 0,
      updatedAt: new Date(),
    }).where(and(eq(pedidos.id, id), eq(pedidos.empresaId, empresaId)));

    const result = await db.select().from(pedidos).where(and(eq(pedidos.id, id), eq(pedidos.empresaId, empresaId))).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to update pedido:", error);
    throw error;
  }
}

export async function deletarPedido(id: number, empresaId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete pedido: database not available");
    return false;
  }

  try {
    const pedido = await obterPedido(id, empresaId);
    if (!pedido) return false;
    // Deletar itens primeiro
    await db.delete(itensPedido).where(eq(itensPedido.pedidoId, id));
    // Depois deletar pedido
    await db.delete(pedidos).where(eq(pedidos.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete pedido:", error);
    throw error;
  }
}

export async function atualizarImagemPedido(id: number, empresaId: number, imagemUrl: string): Promise<Pedido | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update imagem: database not available");
    return null;
  }

  try {
    await db.update(pedidos).set({
      imagemUrl,
      updatedAt: new Date(),
    }).where(and(eq(pedidos.id, id), eq(pedidos.empresaId, empresaId)));

    const result = await db.select().from(pedidos).where(and(eq(pedidos.id, id), eq(pedidos.empresaId, empresaId))).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to update imagem:", error);
    throw error;
  }
}

// ============ FECHAMENTO CAIXA QUERIES ============

export async function obterPedidosFechadosPorData(data: string, empresaId: number): Promise<(Pedido & { itens: string[] })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get closed pedidos by date: database not available");
    return [];
  }

  try {
    // Buscar pedidos que foram fechados nesta data
    const allPedidos = await db.select().from(pedidos)
      .where(and(eq(pedidos.dataFechamento, data), eq(pedidos.empresaId, empresaId)))
      .orderBy(desc(pedidos.createdAt));
    
    const pedidosComItens = await Promise.all(
      allPedidos.map(async (p) => {
        const items = await db.select().from(itensPedido).where(eq(itensPedido.pedidoId, p.id));
        return {
          ...p,
          itens: items.map(item => item.complemento),
        };
      })
    );

    return pedidosComItens;
  } catch (error) {
    console.error("[Database] Failed to get closed pedidos by date:", error);
    throw error;
  }
}

export async function obterPedidosPorData(data: string, empresaId: number): Promise<(Pedido & { itens: string[] })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get pedidos by date: database not available");
    return [];
  }

  try {
    // Usar intervalo semiaberto evita perder registros com milissegundos
    // no fim do dia e impede incluir pedidos do dia seguinte.
    const startOfDay = new Date(`${data}T00:00:00`);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);

    const allPedidos = await db.select().from(pedidos)
      .where(and(
        gte(pedidos.createdAt, startOfDay),
        lt(pedidos.createdAt, startOfNextDay),
        isNull(pedidos.dataFechamento),
        eq(pedidos.empresaId, empresaId)
      ))
      .orderBy(desc(pedidos.createdAt));
    
    const pedidosComItens = await Promise.all(
      allPedidos.map(async (p) => {
        const items = await db.select().from(itensPedido).where(eq(itensPedido.pedidoId, p.id));
        return {
          ...p,
          itens: items.map(item => item.complemento),
        };
      })
    );

    return pedidosComItens;
  } catch (error) {
    console.error("[Database] Failed to get pedidos by date:", error);
    throw error;
  }
}

export async function criarFechamentoCaixa(data: InsertFechamentoCaixa, empresaId: number): Promise<FechamentoCaixa | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create fechamento: database not available");
    return null;
  }

  try {
    // Repetir exatamente o filtro usado no cálculo do fechamento.
    const dataStr = data.data;
    const startOfDay = new Date(`${dataStr}T00:00:00`);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);

    await db.update(pedidos)
      .set({ dataFechamento: dataStr })
      .where(and(
        gte(pedidos.createdAt, startOfDay),
        lt(pedidos.createdAt, startOfNextDay),
        isNull(pedidos.dataFechamento),
        eq(pedidos.empresaId, empresaId)
      ));

    const result = await db.insert(fechamentoCaixa).values({ ...data, empresaId });
    const fechamentoId = (result as any)[0].insertId;

    const createdFechamento = await db.select().from(fechamentoCaixa).where(eq(fechamentoCaixa.id, fechamentoId)).limit(1);
    return createdFechamento[0] || null;
  } catch (error) {
    console.error("[Database] Failed to create fechamento:", error);
    throw error;
  }
}

export async function obterFechamentoPorData(data: string, empresaId: number): Promise<FechamentoCaixa | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get fechamento: database not available");
    return null;
  }

  try {
    const result = await db.select().from(fechamentoCaixa).where(and(eq(fechamentoCaixa.data, data), eq(fechamentoCaixa.empresaId, empresaId))).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get fechamento:", error);
    throw error;
  }
}

export async function listarFechamentos(empresaId: number): Promise<FechamentoCaixa[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list fechamentos: database not available");
    return [];
  }

  try {
    return await db.select().from(fechamentoCaixa).where(eq(fechamentoCaixa.empresaId, empresaId)).orderBy(desc(fechamentoCaixa.data));
  } catch (error) {
    console.error("[Database] Failed to list fechamentos:", error);
    throw error;
  }
}
