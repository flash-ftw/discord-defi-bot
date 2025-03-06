import { transactions, type Transaction, type InsertTransaction } from "@shared/schema";
import NodeCache from "node-cache";

export interface IStorage {
  getTransactions(walletAddress: string, tokenContract: string): Promise<Transaction[]>;
  addTransaction(transaction: InsertTransaction): Promise<Transaction>;
}

export class MemStorage implements IStorage {
  private transactions: Map<number, Transaction>;
  private currentId: number;

  constructor() {
    this.transactions = new Map();
    this.currentId = 1;
  }

  async getTransactions(walletAddress: string, tokenContract: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => 
        tx.walletAddress.toLowerCase() === walletAddress.toLowerCase() && 
        tx.tokenContract.toLowerCase() === tokenContract.toLowerCase()
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async addTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId++;
    const transaction: Transaction = { ...insertTransaction, id };
    this.transactions.set(id, transaction);
    return transaction;
  }
}

export const storage = new MemStorage();