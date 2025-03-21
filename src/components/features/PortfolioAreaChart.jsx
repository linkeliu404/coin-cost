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

/**
 * Portfolio Area Chart Component
 * @param {Object} props - Component props
 * @param {Object} props.portfolio - Portfolio data
 * @returns {JSX.Element} Component
 */
const PortfolioAreaChart = ({ portfolio }) => {
  const [chartData, setChartData] = useState({ labels: [], values: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [earliestTransactionDate, setEarliestTransactionDate] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!portfolio?.coins?.length) {
        setIsLoading(false);
        console.log("No coins in portfolio");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log("开始获取图表数据，投资组合：", portfolio);

        // 找出所有交易中最早的日期
        const allTransactions = portfolio.coins
          .flatMap((coin) => coin.transactions || [])
          .map((t) => new Date(t.date));

        if (allTransactions.length === 0) {
          console.log("没有任何交易记录");
          setIsLoading(false);
          return;
        }

        const earliestDate = new Date(
          Math.min(...allTransactions.map((d) => d.getTime()))
        );
        console.log("最早的交易日期:", earliestDate);
        setEarliestTransactionDate(earliestDate);

        // 检查是否有缓存的图表数据
        const cacheKey = portfolio.coins
          .map((coin) => `${coin.id}-${coin.transactions.length}`)
          .join("|");

        const cachedData = sessionStorage.getItem(`chart_data_${cacheKey}`);

        if (cachedData) {
          try {
            const { timestamp, data } = JSON.parse(cachedData);
            // 只使用15分钟内的缓存
            if (Date.now() - timestamp < 15 * 60 * 1000) {
              console.log("使用缓存的图表数据");
              setChartData(data);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error("解析缓存数据失败", e);
          }
        }

        // 获取每个币种的历史价格数据
        const coinIds = portfolio.coins.map((coin) => coin.id);
        console.log("获取这些币种的历史数据:", coinIds);

        // 直接使用单一API调用获取所有币种的数据
        const historicalData = await getHistoricalPriceData(coinIds, 7);
        console.log("获取到的历史价格数据:", historicalData);

        // 处理最近7天的数据
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), i);
          return {
            date,
            formattedDate: format(date, "MM/dd"),
            value: 0,
            // 用于确定这个日期是否在最早交易日期之后
            isAfterEarliestTransaction:
              isAfter(date, earliestDate) ||
              date.toDateString() === earliestDate.toDateString(),
          };
        }).reverse();

        console.log("生成7天数据:", last7Days);

        // 计算每天的总资产价值
        for (const day of last7Days) {
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
            } else {
              console.log(
                `No price data found for ${coin.id}, using current price: ${price}`
              );
            }

            const value = price * holdingsAtDate;

            console.log(
              `币种 ${coin.symbol} 在 ${day.formattedDate} 的持有量: ${holdingsAtDate}, 价格: ${price}, 价值: ${value}`
            );

            dailyTotal += value;
          }

          day.value = dailyTotal;
          console.log(`${day.formattedDate} 总资产价值: ${dailyTotal}`);
        }

        // 只处理最早交易日期之后的数据
        const filteredDays = last7Days.filter(
          (day) => day.isAfterEarliestTransaction
        );
        console.log("过滤后的天数:", filteredDays);

        // 创建图表数据对象
        const chartDataResult = {
          labels: filteredDays.map((day) => day.formattedDate),
          values: filteredDays.map((day) => day.value),
        };

        // 设置图表数据
        setChartData(chartDataResult);
        console.log("最终图表数据:", chartDataResult);

        // 缓存图表数据
        try {
          sessionStorage.setItem(
            `chart_data_${cacheKey}`,
            JSON.stringify({
              timestamp: Date.now(),
              data: chartDataResult,
            })
          );
        } catch (e) {
          console.error("缓存图表数据失败", e);
        }
      } catch (err) {
        console.error("图表数据获取错误:", err);
        setError(err.message || "获取数据失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [portfolio]);

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
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: primaryColor,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `$${context.raw.toFixed(2)}`;
              },
            },
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            titleColor: "#000",
            bodyColor: "#000",
            borderColor: "rgba(0, 0, 0, 0.1)",
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: {
              display: true,
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          y: {
            grid: {
              display: true,
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              display: false,
              callback: function (value) {
                return "$" + value.toFixed(0);
              },
            },
            beginAtZero: true,
          },
        },
        interaction: {
          mode: "index",
          intersect: false,
        },
        elements: {
          line: {
            tension: 0.4,
          },
        },
      },
    };
  }, [chartData, growth]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>资产走势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-[300px]">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>资产走势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.values.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>资产走势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            暂无数据可显示
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>资产走势</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
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
