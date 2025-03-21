import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { getHistoricalPriceData } from "@/lib/api";

// 全局状态缓存
const CACHE = {
  portfolioChartData: null,
  timeRangeChartData: null,
  timestamp: 0,
  // 增加缓存时间至60分钟
  expiryTime: 60 * 60 * 1000,
  // 按投资组合ID和时间范围存储的详细缓存
  detailedCache: {},
};

/**
 * 图表数据处理的自定义钩子
 * @param {Object} portfolio - 投资组合数据
 * @returns {Object} 图表数据和状态
 */
export const useChartData = (portfolio) => {
  // 跟踪上一次处理的投资组合ID，减少不必要的处理
  const lastPortfolioIdRef = useRef("");

  // 初始化时使用缓存数据或默认值
  const initChartData = (type) => {
    // 如果缓存未过期，使用缓存数据
    if (CACHE.timestamp && Date.now() - CACHE.timestamp < CACHE.expiryTime) {
      if (type === "portfolio" && CACHE.portfolioChartData) {
        return CACHE.portfolioChartData;
      } else if (type === "timeRange" && CACHE.timeRangeChartData) {
        return CACHE.timeRangeChartData;
      }
    }

    return type === "portfolio"
      ? {
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
        }
      : {
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
        };
  };

  const [portfolioChartData, setPortfolioChartData] = useState(() =>
    initChartData("portfolio")
  );

  const [timeRangeChartData, setTimeRangeChartData] = useState(() =>
    initChartData("timeRange")
  );

  const [currentTimeRange, setCurrentTimeRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(!CACHE.timestamp);
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

  // 计算投资组合唯一ID，用于缓存判断
  const getPortfolioId = useCallback(() => {
    if (!portfolio?.coins) return "";
    return portfolio.coins.map((c) => `${c.id}-${c.holdings}`).join("|");
  }, [portfolio]);

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

    // 计算投资组合唯一ID
    const portfolioId = getPortfolioId();

    // 如果投资组合没有变化，不更新图表数据
    if (
      portfolioId === lastPortfolioIdRef.current &&
      CACHE.portfolioChartData
    ) {
      return;
    }

    // 更新引用值以便下次比较
    lastPortfolioIdRef.current = portfolioId;

    // 立即显示基本图表结构，即使数据还在加载
    const labels = portfolio.coins.map((coin) => coin.symbol.toUpperCase());
    const data = portfolio.coins.map((coin) => coin.currentValue);
    const colors = generateRandomColors(portfolio.coins.length);

    const chartData = {
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
    };

    setPortfolioChartData(chartData);

    // 缓存数据
    CACHE.portfolioChartData = chartData;
    CACHE.timestamp = Date.now();

    // 缓存到详细缓存
    CACHE.detailedCache[portfolioId] = {
      portfolioChartData: chartData,
      timestamp: Date.now(),
    };
  }, [portfolio, getPortfolioId]);

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
        const portfolioId = getPortfolioId();

        // 检查详细缓存中是否已有数据
        const cacheKey = `${timeRange}_${portfolioId}`;
        if (
          CACHE.detailedCache[cacheKey] &&
          Date.now() - CACHE.detailedCache[cacheKey].timestamp <
            CACHE.expiryTime
        ) {
          setTimeRangeChartData(CACHE.detailedCache[cacheKey].data);
          setIsLoading(false);
          return;
        }

        // 检查sessionStorage中是否已有数据
        const storageCacheKey = `time_chart_${cacheKey}`;
        const cachedData = sessionStorage.getItem(storageCacheKey);

        if (cachedData) {
          try {
            const { timestamp, data } = JSON.parse(cachedData);
            // 使用更长的缓存有效期
            if (Date.now() - timestamp < CACHE.expiryTime) {
              setTimeRangeChartData(data);
              CACHE.timeRangeChartData = data;
              CACHE.timestamp = timestamp;

              // 更新详细缓存
              CACHE.detailedCache[cacheKey] = {
                data,
                timestamp,
              };

              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error("解析缓存数据失败", e);
          }
        }

        // 获取所有币种的历史价格数据
        const coinIds = portfolio.coins.map((coin) => coin.id);

        // 批量获取历史价格数据
        const historicalDataResults = await getHistoricalPriceData(
          coinIds,
          days
        );

        // 合并所有历史数据
        const combinedHistoricalData = historicalDataResults || {};

        // 如果没有获取到历史数据，返回空图表
        if (Object.keys(combinedHistoricalData).length === 0) {
          const emptyChartData = {
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
          };
          setTimeRangeChartData(emptyChartData);
          setIsLoading(false);
          return;
        }

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

        const chartData = {
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
        };

        setTimeRangeChartData(chartData);

        // 更新全局缓存
        CACHE.timeRangeChartData = chartData;
        CACHE.timestamp = Date.now();

        // 更新详细缓存
        CACHE.detailedCache[cacheKey] = {
          data: chartData,
          timestamp: Date.now(),
        };

        // 缓存到 sessionStorage
        try {
          sessionStorage.setItem(
            storageCacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              data: chartData,
            })
          );
        } catch (e) {
          console.error("缓存图表数据失败", e);
        }
      } catch (err) {
        console.error("Failed to fetch historical data:", err);
        setError("加载图表数据失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    },
    [portfolio, getPortfolioId]
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

  // 在组件挂载时自动获取历史数据
  useEffect(() => {
    if (portfolio && portfolio.coins.length > 0) {
      // 获取投资组合ID和缓存键
      const portfolioId = getPortfolioId();
      const cacheKey = `${currentTimeRange}_${portfolioId}`;

      // 检查是否需要获取历史数据
      const needFetch =
        !CACHE.detailedCache[cacheKey] ||
        Date.now() - CACHE.detailedCache[cacheKey].timestamp >=
          CACHE.expiryTime;

      if (needFetch) {
        fetchHistoricalData(currentTimeRange);
      }
    }
  }, [portfolio, currentTimeRange, fetchHistoricalData, getPortfolioId]);

  return {
    portfolioChartData,
    timeRangeChartData,
    isLoading,
    error,
    fetchHistoricalData,
    currentTimeRange,
  };
};
