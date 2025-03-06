import { transactions, type Transaction, type InsertTransaction } from "@shared/schema";
import NodeCache from "node-cache";

export interface IStorage {
  getTransactions(walletAddress: string, tokenContract: string): Promise<Transaction[]>;
  addTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getCachedPrice(tokenContract: string, chain: string): Promise<number | undefined>;
  setCachedPrice(tokenContract: string, chain: string, price: number): void;
}

export class MemStorage implements IStorage {
  private transactions: Map<number, Transaction>;
  private currentId: number;
  private priceCache: NodeCache;

  constructor() {
    this.transactions = new Map();
    this.currentId = 1;
    this.priceCache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
  }

  async getTransactions(walletAddress: string, tokenContract: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => 
        tx.walletAddress.toLowerCase() === walletAddress.toLowerCase() && 
        tx.tokenContract.toLowerCase() === tokenContract.toLowerCase()
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by newest first
  }

  async addTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId++;
    const transaction: Transaction = { ...insertTransaction, id };
    this.transactions.set(id, transaction);
    return transaction;
  }

  getCachedPrice(tokenContract: string, chain: string): Promise<number | undefined> {
    const key = `${chain}:${tokenContract.toLowerCase()}`;
    const value = this.priceCache.get<number>(key);
    return Promise.resolve(value);
  }

  setCachedPrice(tokenContract: string, chain: string, price: number): void {
    const key = `${chain}:${tokenContract.toLowerCase()}`;
    this.priceCache.set(key, price);
  }
}

export const storage = new MemStorage();