/// <reference types="jest" />

import { analyzeHolderMetrics, type HolderCategory } from '../analyze-holders';
import { Chain } from '@shared/schema';

describe('Holder Analysis Tests', () => {
  const TEST_TOKEN = '0xd6203889C22D9fe5e938a9200f50FDFFE9dD8e02';
  const TEST_CHAIN: Chain = 'ethereum';

  describe('Volume Metrics', () => {
    test('should calculate 24h volume metrics correctly', async () => {
      const whaleAddress = '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503';
      const category: HolderCategory = 'whale';
      const holders = [
        whaleAddress,
        '0x28c6c06298d514db089934071355e5743bf21d60'
      ];

      const analysis = await analyzeHolderMetrics(
        whaleAddress,
        TEST_TOKEN,
        TEST_CHAIN,
        category,
        holders
      );

      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.metrics.volumeMetrics).toBeDefined();
        expect(analysis.metrics.volumeMetrics?.buyVolume24h).toBeGreaterThan(0);
        expect(analysis.metrics.volumeMetrics?.sellVolume24h).toBeGreaterThan(0);
        expect(analysis.metrics.volumeMetrics?.totalVolume).toBeGreaterThan(0);
        expect(analysis.metrics.volumeMetrics?.marketImpact).toBeDefined();
        expect(analysis.metrics.volumeMetrics?.marketImpact).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Category Metrics', () => {
    test('should calculate category percentages and rankings', async () => {
      const holders = [
        '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503',
        '0x28c6c06298d514db089934071355e5743bf21d60'
      ];

      const results = await Promise.all(
        holders.map(address => 
          analyzeHolderMetrics(address, TEST_TOKEN, TEST_CHAIN, 'whale', holders)
        )
      );

      // Filter out null results
      const validResults = results.filter(r => r !== null);
      expect(validResults.length).toBeGreaterThan(0);

      for (const analysis of validResults) {
        expect(analysis.metrics.categoryMetrics).toBeDefined();
        expect(analysis.metrics.categoryMetrics?.percentageOfCategory).toBeGreaterThan(0);
        expect(analysis.metrics.categoryMetrics?.percentageOfCategory).toBeLessThanOrEqual(100);
        expect(analysis.metrics.categoryMetrics?.rankInCategory).toBeGreaterThan(0);
        expect(analysis.metrics.categoryMetrics?.rankInCategory).toBeLessThanOrEqual(holders.length);
      }

      // Verify total percentage adds up to ~100%
      const totalPercentage = validResults.reduce(
        (sum, r) => sum + (r.metrics.categoryMetrics?.percentageOfCategory || 0),
        0
      );
      expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero balance wallets', async () => {
      const zeroBalanceAddress = '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE';
      const holders = [zeroBalanceAddress];

      const analysis = await analyzeHolderMetrics(
        zeroBalanceAddress,
        TEST_TOKEN,
        TEST_CHAIN,
        'active_trader',
        holders
      );

      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.metrics.totalValue).toBe(0);
        expect(analysis.metrics.unrealizedPnL).toBe(0);
        expect(analysis.metrics.categoryMetrics?.percentageOfCategory).toBe(100);
      }
    });

    test('should handle new wallets with no trades', async () => {
      const newWalletAddress = '0x0000000000000000000000000000000000000000';
      const holders = [newWalletAddress];

      const analysis = await analyzeHolderMetrics(
        newWalletAddress,
        TEST_TOKEN,
        TEST_CHAIN,
        'retail',
        holders
      );

      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.metrics.numberOfTrades).toBe(0);
        expect(analysis.metrics.holdingPeriod).toBe(0);
        expect(analysis.metrics.realizedPnL).toBe(0);
        expect(analysis.metrics.unrealizedPnL).toBe(0);
      }
    });
  });

  describe('Holding Period', () => {
    test('should calculate holding periods based on trade count', async () => {
      const testCases = [
        {
          address: '0x28c6c06298d514db089934071355e5743bf21d60', // 1 trade
          expectedPeriod: 15
        },
        {
          address: '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503', // 4 trades
          expectedPeriod: 60
        }
      ];

      for (const { address, expectedPeriod } of testCases) {
        const analysis = await analyzeHolderMetrics(
          address,
          TEST_TOKEN,
          TEST_CHAIN,
          'whale',
          [address]
        );

        expect(analysis).not.toBeNull();
        if (analysis) {
          expect(analysis.metrics.holdingPeriod).toBe(expectedPeriod);
        }
      }
    });

    test('should cap holding period at 90 days', async () => {
      // Using a whale address that generates many trades
      const address = '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503';
      const analysis = await analyzeHolderMetrics(
        address,
        TEST_TOKEN,
        TEST_CHAIN,
        'whale',
        [address]
      );

      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.metrics.holdingPeriod).toBeLessThanOrEqual(90);
      }
    });
  });
});