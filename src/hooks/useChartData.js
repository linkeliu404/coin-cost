import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { getHistoricalPriceData } from "@/lib/api";

/**
 * 图表数据处理的自定义钩子
 * @param {Object} portfolio - 投资组合数据
 * @param {string} timeRange - 时间范围
 * @returns {Object} 图表数据和状态
 */
export const useChartData = (portfolio, timeRange = "7d") => {
  const [portfolioChartData, setPortfolioChartData] = useState(null);
  const [profitChartData, setProfitChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * 生成随机颜色
   * @param {number} count - 颜色数量
   * @returns {Array<string>} 颜色数组
   */
  const generateColors = (count) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(`hsl(${(i * 360) / count}, 70%, 50%)`);
    }
    return colors;
  };

  // 获取日期格式
  const getDateFormatByTimeRange = (timeRange) => {
    switch (timeRange) {
      case "1d":
        return "HH:mm";
      case "7d":
        return "MM-DD HH:mm";
      case "30d":
        return "MM-DD";
      case "90d":
        return "MM-DD";
      case "365d":
        return "YYYY-MM-DD";
      default:
        return "MM-DD";
    }
  };

  // 获取历史数据
  const fetchHistoricalData = async () => {
    if (!portfolio || !portfolio.coins || portfolio.coins.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 获取每个币种的历史数据
      const historicalDataPromises = portfolio.coins.map(async (coin) => {
        const data = await getHistoricalPriceData(coin.id, timeRange);
        return {
          id: coin.id,
          symbol: coin.symbol,
          data: data,
        };
      });

      const historicalData = await Promise.all(historicalDataPromises);

      // 处理投资组合分布数据
      const colors = generateColors(portfolio.coins.length);

      setPortfolioChartData({
        labels: portfolio.coins.map((coin) => coin.symbol.toUpperCase()),
        datasets: [
          {
            data: portfolio.coins.map((coin) => coin.currentValue),
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1,
          },
        ],
      });

      // 处理收益走势数据
      const dateFormat = getDateFormatByTimeRange(timeRange);
      const timestamps = historicalData[0]?.data.map((d) => d[0]) || [];

      setProfitChartData({
        labels: timestamps.map((timestamp) => {
          const date = new Date(timestamp);
          return date.toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }),
        datasets: [
          {
            label: "收益走势",
            data: historicalData[0]?.data.map((d) => d[1]) || [],
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
          },
        ],
      });
    } catch (err) {
      console.error("Error fetching historical data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalData();
  }, [portfolio, timeRange]);

  return {
    portfolioChartData,
    profitChartData,
    isLoading,
    error,
    retryFetchHistoricalData: fetchHistoricalData,
  };
};
