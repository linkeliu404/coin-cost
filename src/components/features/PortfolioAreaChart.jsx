"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { format, subDays, isAfter, parseISO } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Button,
} from "@/components/ui";
import { getHistoricalPriceData } from "@/lib/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

// 全局缓存对象
const GLOBAL_CHART_CACHE = {
  data: {},
  lastUpdated: 0,
};

/**
 * Portfolio Area Chart Component
 * @param {Object} props - Component props
 * @param {Object} props.portfolio - Portfolio data
 * @returns {JSX.Element} Component
 */
const PortfolioAreaChart = ({ portfolio }) => {
  const [chartData, setChartData] = useState(() => {
    // 初始化时尝试从全局缓存获取数据
    if (GLOBAL_CHART_CACHE.data.labels && GLOBAL_CHART_CACHE.data.values) {
      return GLOBAL_CHART_CACHE.data;
    }
    return { labels: [], values: [] };
  });
  const [isLoading, setIsLoading] = useState(!GLOBAL_CHART_CACHE.data.labels);
  const [error, setError] = useState(null);
  const [earliestTransactionDate, setEarliestTransactionDate] = useState(null);
  const chartRef = useRef(null);
  const dataFetchedRef = useRef(false);

  // 立即显示空的图表框架，等待数据加载
  useEffect(() => {
    // 如果全局缓存有数据并且不超过30分钟，直接使用
    if (
      GLOBAL_CHART_CACHE.data.labels &&
      GLOBAL_CHART_CACHE.data.values &&
      Date.now() - GLOBAL_CHART_CACHE.lastUpdated < 30 * 60 * 1000
    ) {
      setChartData(GLOBAL_CHART_CACHE.data);
      setIsLoading(false);
      dataFetchedRef.current = true; // 标记数据已加载
      return;
    }

    // 否则开始加载数据
    if (!dataFetchedRef.current) {
      dataFetchedRef.current = true;
      fetchChartData();
    }
  }, []);

  // 当投资组合发生变化时更新数据
  useEffect(() => {
    // 当投资组合变化时，重置数据获取标志
    dataFetchedRef.current = false;
    fetchChartData();
  }, [portfolio]);

  const fetchChartData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 如果没有投资组合数据，显示空图表
      if (!portfolio?.coins?.length) {
        const emptyChartData = {
          labels: Array.from({ length: 7 }, (_, i) =>
            format(subDays(new Date(), 6 - i), "MM/dd")
          ),
          values: Array(7).fill(0),
        };
        setChartData(emptyChartData);
        setIsLoading(false);
        return;
      }

      // 找出所有交易中最早的日期
      const allTransactions = portfolio.coins
        .flatMap((coin) => coin.transactions || [])
        .filter((t) => t && t.date); // 确保交易有日期

      if (allTransactions.length === 0) {
        // 如果没有交易记录，但有币种，使用当前价格创建图表
        const today = new Date();
        const labels = Array.from({ length: 7 }, (_, i) =>
          format(subDays(today, 6 - i), "MM/dd")
        );

        // 使用当前价值填充最后一天，其他天为0
        const values = Array(7).fill(0);
        values[6] =
          portfolio.totalValue ||
          portfolio.coins.reduce(
            (sum, coin) => sum + (coin.currentValue || 0),
            0
          );

        const chartData = { labels, values };
        setChartData(chartData);

        // 更新全局缓存
        GLOBAL_CHART_CACHE.data = chartData;
        GLOBAL_CHART_CACHE.lastUpdated = Date.now();

        setIsLoading(false);
        return;
      }

      // 继续原有的数据处理逻辑...
      const earliestDate = new Date(
        Math.min(...allTransactions.map((d) => new Date(d.date).getTime()))
      );
      setEarliestTransactionDate(earliestDate);

      // 检查是否有缓存的图表数据
      const cacheKey = portfolio.coins
        .map((coin) => `${coin.id}-${coin.transactions.length}`)
        .join("|");

      const cachedData = sessionStorage.getItem(`chart_data_${cacheKey}`);

      if (cachedData) {
        try {
          const { timestamp, data } = JSON.parse(cachedData);
          // 只使用60分钟内的缓存 (增加缓存时间)
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            setChartData(data);
            GLOBAL_CHART_CACHE.data = data;
            GLOBAL_CHART_CACHE.lastUpdated = timestamp;
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("解析缓存数据失败", e);
        }
      }

      // 获取币种的ID
      const coinIds = portfolio.coins.map((coin) => coin.id);

      // 添加重试逻辑
      const fetchWithRetry = async (retries = 3) => {
        try {
          return await getHistoricalPriceData(coinIds, 14); // 增加天数从7天到14天以获取更多数据点
        } catch (err) {
          if (retries > 0) {
            console.log(`重试获取价格数据，剩余尝试次数: ${retries - 1}`);
            await new Promise((r) => setTimeout(r, 1000)); // 等待1秒后重试
            return fetchWithRetry(retries - 1);
          }
          throw err;
        }
      };

      // 并行处理价格数据和图表渲染
      const historicalDataPromise = fetchWithRetry();

      // 先创建一个基础图表结构
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return {
          date,
          formattedDate: format(date, "MM/dd"),
          value: 0,
          isAfterEarliestTransaction:
            isAfter(date, earliestDate) ||
            date.toDateString() === earliestDate.toDateString(),
        };
      }).reverse();

      // 过滤出最早交易日期之后的数据
      const filteredDays = last7Days.filter(
        (day) => day.isAfterEarliestTransaction
      );

      // 使用当前存储的价格初始值来创建基础图表
      const initialChartData = {
        labels: filteredDays.map((day) => day.formattedDate),
        values: filteredDays.map(() => 0), // 初始值设为0
      };

      // 设置初始图表（空数据）
      setChartData(initialChartData);

      // 等待历史数据获取完成
      const historicalData = await historicalDataPromise;

      // 计算每天的总资产价值
      for (const day of filteredDays) {
        let dailyTotal = 0;

        for (const coin of portfolio.coins) {
          // 计算该日期的持有量
          const holdingsAtDate = coin.transactions
            .filter((t) => new Date(t.date) <= day.date)
            .reduce(
              (sum, t) => sum + (t.type === "buy" ? t.amount : -t.amount),
              0
            );

          if (holdingsAtDate <= 0) continue;

          // 找到该日期的价格
          const coinPrices = historicalData[coin.id] || [];
          let price = coin.currentPrice || 0;

          // 确保我们有价格数据
          if (coinPrices.prices && Array.isArray(coinPrices.prices)) {
            // 查找与当前日期最匹配的价格点
            const pricePoint = coinPrices.prices.find(
              (p) => format(new Date(p[0]), "MM/dd") === day.formattedDate
            );

            if (pricePoint && pricePoint.length >= 2) {
              price = pricePoint[1];
            }
          }

          const value = price * holdingsAtDate;
          dailyTotal += value;
        }

        day.value = dailyTotal;
      }

      // 创建最终图表数据
      const finalChartData = {
        labels: filteredDays.map((day) => day.formattedDate),
        values: filteredDays.map((day) => day.value),
      };

      // 设置图表数据
      setChartData(finalChartData);

      // 更新全局缓存
      GLOBAL_CHART_CACHE.data = finalChartData;
      GLOBAL_CHART_CACHE.lastUpdated = Date.now();

      // 缓存到session storage
      try {
        sessionStorage.setItem(
          `chart_data_${cacheKey}`,
          JSON.stringify({
            timestamp: Date.now(),
            data: finalChartData,
          })
        );
      } catch (e) {
        console.error("缓存图表数据失败", e);
      }
    } catch (err) {
      console.error("图表数据获取错误:", err);
      setError(err.message || "获取数据失败");

      // 出错时也显示一个基本图表
      const emptyChartData = {
        labels: Array.from({ length: 7 }, (_, i) =>
          format(subDays(new Date(), 6 - i), "MM/dd")
        ),
        values: Array(7).fill(0),
      };
      setChartData(emptyChartData);
    } finally {
      setIsLoading(false);
    }
  };

  const { growth, growthText } = useMemo(() => {
    if (!chartData.values.length) return { growth: 0, growthText: "0%" };

    const firstValue = chartData.values[0] || 0.0001; // 防止除以零
    const lastValue = chartData.values[chartData.values.length - 1] || 0;
    const growthValue = ((lastValue - firstValue) / firstValue) * 100;

    return {
      growth: growthValue,
      growthText: `${growthValue >= 0 ? "+" : ""}${growthValue.toFixed(2)}%`,
    };
  }, [chartData]);

  // Chart.js配置
  const chartConfig = useMemo(() => {
    const isPositiveGrowth = growth >= 0;
    const primaryColor = isPositiveGrowth
      ? "rgb(34, 197, 94)"
      : "rgb(239, 68, 68)";
    const backgroundColor = isPositiveGrowth
      ? "rgba(34, 197, 94, 0.2)"
      : "rgba(239, 68, 68, 0.2)";

    return {
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "资产价值",
            data: chartData.values,
            fill: true,
            backgroundColor: backgroundColor,
            borderColor: primaryColor,
            tension: 0.4,
            pointBackgroundColor: primaryColor,
            pointBorderColor: "#fff",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `$${value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            display: false, // 隐藏Y轴
            beginAtZero: false,
            ticks: {
              display: false, // 隐藏Y轴刻度
            },
            grid: {
              display: false, // 隐藏Y轴网格
            },
          },
        },
      },
    };
  }, [chartData, growth]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>资产走势</CardTitle>
      </CardHeader>
      <CardContent className="h-96">
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center z-10 bg-background/10">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                dataFetchedRef.current = false;
                fetchChartData();
              }}
            >
              重试加载
            </Button>
          </div>
        )}

        <div
          className={`h-full relative ${
            isLoading || error ? "opacity-20" : ""
          }`}
        >
          <Line
            ref={chartRef}
            data={chartConfig.data}
            options={chartConfig.options}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioAreaChart;
