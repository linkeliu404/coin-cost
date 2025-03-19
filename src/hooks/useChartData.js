import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { getHistoricalPriceData } from "@/lib/api";

/**
 * 图表数据处理的自定义钩子
 * @param {Object} portfolio - 投资组合数据
 * @returns {Object} 图表数据和状态
 */
export const useChartData = (portfolio) => {
  const [portfolioChartData, setPortfolioChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "投资组合分布",
        data: [],
        backgroundColor: [],
        borderColor: "rgba(255, 255, 255, 0.5)",
        borderWidth: 1,
      },
    ],
  });

  const [timeRangeChartData, setTimeRangeChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "收益走势",
        data: [],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  });

  const [currentTimeRange, setCurrentTimeRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 生成随机颜色
   * @param {number} count - 颜色数量
   * @returns {Array<string>} 颜色数组
   */
  const generateRandomColors = (count) => {
    const colors = [];
    const predefinedColors = [
      "rgba(255, 99, 132, 0.7)",
      "rgba(54, 162, 235, 0.7)",
      "rgba(255, 206, 86, 0.7)",
      "rgba(75, 192, 192, 0.7)",
      "rgba(153, 102, 255, 0.7)",
      "rgba(255, 159, 64, 0.7)",
      "rgba(199, 199, 199, 0.7)",
      "rgba(83, 102, 255, 0.7)",
      "rgba(40, 159, 64, 0.7)",
      "rgba(210, 199, 199, 0.7)",
    ];

    for (let i = 0; i < count; i++) {
      colors.push(predefinedColors[i % predefinedColors.length]);
    }

    return colors;
  };

  // 更新投资组合分布图表数据
  useEffect(() => {
    if (!portfolio || portfolio.coins.length === 0) {
      setPortfolioChartData({
        labels: [],
        datasets: [
          {
            label: "投资组合分布",
            data: [],
            backgroundColor: [],
            borderColor: "rgba(255, 255, 255, 0.5)",
            borderWidth: 1,
          },
        ],
      });
      return;
    }

    const labels = portfolio.coins.map((coin) => coin.symbol.toUpperCase());
    const data = portfolio.coins.map((coin) => coin.currentValue);
    const colors = generateRandomColors(portfolio.coins.length);

    setPortfolioChartData({
      labels,
      datasets: [
        {
          label: "投资组合分布",
          data,
          backgroundColor: colors,
          borderColor: "rgba(255, 255, 255, 0.5)",
          borderWidth: 1,
        },
      ],
    });
  }, [portfolio]);

  // 根据时间范围确定天数
  const getDaysFromTimeRange = (timeRange) => {
    switch (timeRange) {
      case "24h":
        return 1;
      case "7d":
        return 7;
      case "1m":
        return 30;
      case "3m":
        return 90;
      case "1y":
        return 365;
      default:
        return 7;
    }
  };

  // 获取并更新收益图表数据
  const fetchHistoricalData = useCallback(
    async (timeRange = "7d") => {
      if (!portfolio || portfolio.coins.length === 0) {
        setTimeRangeChartData({
          labels: [],
          datasets: [
            {
              label: getChartLabel(timeRange),
              data: [],
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        });
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setCurrentTimeRange(timeRange);

        const days = getDaysFromTimeRange(timeRange);

        // 获取所有币种的历史价格数据
        const coinIds = portfolio.coins.map((coin) => coin.id);
        const historicalDataPromises = coinIds.map((id) =>
          getHistoricalPriceData(id, days)
        );
        const historicalDataResults = await Promise.all(historicalDataPromises);

        // 合并所有历史数据
        const combinedHistoricalData = {};
        historicalDataResults.forEach((data) => {
          Object.assign(combinedHistoricalData, data);
        });

        // 计算每天的投资组合总价值
        const dailyValues = {};

        // 获取所有时间戳
        const allTimestamps = new Set();
        Object.values(combinedHistoricalData).forEach((data) => {
          if (data.prices && data.prices.length > 0) {
            data.prices.forEach(([timestamp]) => {
              allTimestamps.add(timestamp);
            });
          }
        });

        // 按时间排序
        const sortedTimestamps = Array.from(allTimestamps).sort(
          (a, b) => a - b
        );

        // 对于每个时间点，计算投资组合价值
        sortedTimestamps.forEach((timestamp) => {
          let totalValue = 0;

          portfolio.coins.forEach((coin) => {
            const historicalData = combinedHistoricalData[coin.id];
            if (
              !historicalData ||
              !historicalData.prices ||
              historicalData.prices.length === 0
            )
              return;

            // 找到最接近的价格点
            const closestPricePoint = historicalData.prices.reduce(
              (closest, current) => {
                return Math.abs(current[0] - timestamp) <
                  Math.abs(closest[0] - timestamp)
                  ? current
                  : closest;
              }
            );

            const price = closestPricePoint[1];
            totalValue += coin.holdings * price;
          });

          dailyValues[timestamp] = totalValue;
        });

        // 转换为图表数据格式
        const timestamps = Object.keys(dailyValues).map(Number);
        const values = Object.values(dailyValues);

        // 格式化日期标签
        const formatString = days <= 1 ? "HH:mm" : "MM/dd";
        const labels = timestamps.map((ts) =>
          format(new Date(ts), formatString)
        );

        setTimeRangeChartData({
          labels,
          datasets: [
            {
              label: getChartLabel(timeRange),
              data: values,
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        });
      } catch (err) {
        console.error("Failed to fetch historical data:", err);
        setError("加载图表数据失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    },
    [portfolio]
  );

  // 根据时间范围获取图表标签
  const getChartLabel = (timeRange) => {
    switch (timeRange) {
      case "24h":
        return "24小时收益";
      case "7d":
        return "7天收益";
      case "1m":
        return "1个月收益";
      case "3m":
        return "3个月收益";
      case "1y":
        return "1年收益";
      default:
        return "收益走势";
    }
  };

  // 初始加载和portfolio变化时获取历史数据
  useEffect(() => {
    fetchHistoricalData(currentTimeRange);
  }, [fetchHistoricalData, currentTimeRange]);

  return {
    portfolioChartData,
    timeRangeChartData,
    isLoading,
    error,
    fetchHistoricalData,
    currentTimeRange,
  };
};
