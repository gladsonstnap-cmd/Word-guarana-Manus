import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const appUsers = mysqlTable("appUsers", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = typeof appUsers.$inferInsert;

// Tabela de Pedidos
export const pedidos = mysqlTable("pedidos", {
  id: int("id").autoincrement().primaryKey(),
  cliente: varchar("cliente", { length: 100 }).notNull(),
  tamanho: varchar("tamanho", { length: 10 }).notNull(),
  sabor: varchar("sabor", { length: 100 }).notNull(),
  quantidade: int("quantidade").default(1).notNull(),
  copos: json("copos").$type<Array<{
    tamanho: string;
    sabor: string;
    quantidade: number;
    valor: number;
  }>>(),
  formaPagamento: mysqlEnum("formaPagamento", ["dinheiro", "pix", "cartao"]).default("dinheiro").notNull(),
  valor: int("valor").notNull(),
  status: mysqlEnum("status", ["pendente", "em-preparo", "pronto", "entregue"]).default("pendente").notNull(),
  encerrado: int("encerrado").default(0).notNull(),
  imagemUrl: varchar("imagemUrl", { length: 500 }),
  dataFechamento: varchar("dataFechamento", { length: 10 }), // Data do fechamento de caixa
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pedido = typeof pedidos.$inferSelect;
export type InsertPedido = typeof pedidos.$inferInsert;

// Tabela de Itens do Pedido (Complementos)
export const itensPedido = mysqlTable("itensPedido", {
  id: int("id").autoincrement().primaryKey(),
  pedidoId: int("pedidoId").notNull(),
  complemento: varchar("complemento", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ItemPedido = typeof itensPedido.$inferSelect;
export type InsertItemPedido = typeof itensPedido.$inferInsert;

// Tabela de Fechamento de Caixa
export const fechamentoCaixa = mysqlTable("fechamentoCaixa", {
  id: int("id").autoincrement().primaryKey(),
  data: varchar("data", { length: 10 }).notNull(), // YYYY-MM-DD
  totalPedidos: int("totalPedidos").notNull(),
  faturamentoTotal: int("faturamentoTotal").notNull(), // em reais
  pedidosEntregues: int("pedidosEntregues").notNull(),
  tempoMedioPreparo: int("tempoMedioPreparo"), // em minutos
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FechamentoCaixa = typeof fechamentoCaixa.$inferSelect;
export type InsertFechamentoCaixa = typeof fechamentoCaixa.$inferInsert;
