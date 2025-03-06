import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  tokenContract: text("token_contract").notNull(),
  amount: numeric("amount").notNull(),
  priceUsd: numeric("price_usd").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  chain: text("chain").notNull(),
  type: text("type").notNull(), // "buy" or "sell"
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true 
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const supportedChains = ['ethereum', 'base', 'avalanche', 'solana'] as const;
export type Chain = typeof supportedChains[number];