import { useState, useEffect, useMemo } from 'react';
import { 
  fetchAllMetrics, 
  calculateDerivedMetrics,
  generateDCARankings, 
  getTopPerformers, 
  getPerformanceStats,
  type DCARankingResult,
  type DCARankingConfig 
} from '../datamanager';

export interface DCARankingsState {
  rankings: DCARankingResult[];
  topPerformers: DCARankingResult[];
  stats: ReturnType<typeof getPerformanceStats>;
  loading: boolean;
  error: string | null;
}

export function useDCARankings(config: DCARankingConfig): DCARankingsState {
  const [rankings, setRankings] = useState<DCARankingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized calculations
  const topPerformers = useMemo(() => getTopPerformers(rankings, 10), [rankings]);
  const stats = useMemo(() => getPerformanceStats(rankings), [rankings]);

  useEffect(() => {
    async function calculateRankings() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all metrics data
        const data = await fetchAllMetrics();
        
        // Calculate derived metrics
        const derivedMetrics = calculateDerivedMetrics(data.metrics);
        
        // Combine base and derived metrics
        const allMetrics = { ...data.metrics, ...derivedMetrics };
        
        // Get price data for calculations
        const priceData = allMetrics['close'] || [];
        if (priceData.length === 0) {
          throw new Error('No price data available');
        }

        // Generate rankings
        const results = generateDCARankings(allMetrics, priceData, config);
        setRankings(results);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to calculate rankings');
        setRankings([]);
      } finally {
        setLoading(false);
      }
    }

    calculateRankings();
  }, [config.budgetPerDay, config.windowSize, config.zoneSize, config.dailyBudgetCap]); // Added dailyBudgetCap

  return {
    rankings,
    topPerformers,
    stats,
    loading,
    error,
  };
} 