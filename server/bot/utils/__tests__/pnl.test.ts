import { analyzePnL } from '../blockchain';
import { Chain } from '@shared/schema';

describe('P&L Analysis Tests', () => {
  // Test wallet addresses
  const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
  const TEST_TOKEN = '0xd6203889C22D9fe5e938a9200f50FDFFE9dD8e02';

  describe('Basic P&L Calculations', () => {
    test('should correctly calculate realized P&L for completed trades', async () => {
      const analysis = await analyzePnL(TEST_ADDRESS, TEST_TOKEN, 'ethereum' as Chain);
      expect(analysis).not.toBeNull();
      if (analysis) {
        const realizedPnL = analysis.realizedPnL;
        const calculatedPnL = analysis.totalSold * analysis.averageSellPrice - 
                             analysis.totalSold * analysis.averageBuyPrice;
        expect(Math.abs(realizedPnL - calculatedPnL)).toBeLessThan(0.01);
      }
    });

    test('should correctly calculate unrealized P&L for current holdings', async () => {
      const analysis = await analyzePnL(TEST_ADDRESS, TEST_TOKEN, 'ethereum' as Chain);
      expect(analysis).not.toBeNull();
      if (analysis) {
        const unrealizedPnL = analysis.unrealizedPnL;
        const calculatedUnrealized = analysis.currentHoldings * 
                                   (analysis.currentPrice - analysis.averageBuyPrice);
        expect(Math.abs(unrealizedPnL - calculatedUnrealized)).toBeLessThan(0.01);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero balance wallets', async () => {
      const zeroBalanceAddress = '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE';
      const analysis = await analyzePnL(zeroBalanceAddress, TEST_TOKEN, 'ethereum' as Chain);
      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.currentHoldings).toBe(0);
        expect(analysis.unrealizedPnL).toBe(0);
        expect(analysis.totalBought).toBeGreaterThan(0);
        expect(analysis.totalSold).toBe(analysis.totalBought);
      }
    });

    test('should handle new wallets with no trades', async () => {
      const newWalletAddress = '0x0000000000000000000000000000000000000000';
      const analysis = await analyzePnL(newWalletAddress, TEST_TOKEN, 'ethereum' as Chain);
      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.buyCount).toBe(0);
        expect(analysis.sellCount).toBe(0);
        expect(analysis.realizedPnL).toBe(0);
        expect(analysis.unrealizedPnL).toBe(0);
      }
    });
  });

  describe('Transaction Counts', () => {
    test('should correctly count buy and sell transactions', async () => {
      const analysis = await analyzePnL(TEST_ADDRESS, TEST_TOKEN, 'ethereum' as Chain);
      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.buyCount).toBeGreaterThanOrEqual(0);
        expect(analysis.sellCount).toBeGreaterThanOrEqual(0);
        expect(analysis.buyCount + analysis.sellCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Price and Liquidity Validation', () => {
    test('should validate price ranges', async () => {
      const analysis = await analyzePnL(TEST_ADDRESS, TEST_TOKEN, 'ethereum' as Chain);
      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.currentPrice).toBeGreaterThan(0);
        expect(analysis.averageBuyPrice).toBeGreaterThan(0);
        if (analysis.totalSold > 0) {
          expect(analysis.averageSellPrice).toBeGreaterThan(0);
        }
      }
    });
  });
});
