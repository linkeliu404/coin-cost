"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components/ui";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { usePortfolio } from "@/hooks/usePortfolio";
import PortfolioAreaChart from "./PortfolioAreaChart";

// 注册Chart.js组件
ChartJS.register(ArcElement, Tooltip, Legend);

// 全局缓存对象
const CHART_CACHE = {
  pieData: null,
  portfolioId: null,
};

// 生成固定的颜色集合
const generateChartColors = (count) => {
  let colors = [
    "rgba(255, 99, 132, 0.8)", // 玫红
    "rgba(54, 162, 235, 0.8)", // 蓝色
    "rgba(255, 206, 86, 0.8)", // 黄色
    "rgba(75, 192, 192, 0.8)", // 绿松色
    "rgba(153, 102, 255, 0.8)", // 紫色
    "rgba(255, 159, 64, 0.8)", // 橙色
    "rgba(199, 199, 199, 0.8)", // 灰色
    "rgba(83, 102, 255, 0.8)", // 靛蓝
    "rgba(78, 205, 196, 0.8)", // 薄荷绿
    "rgba(255, 99, 71, 0.8)", // 番茄红
  ];

  // 确保颜色足够
  while (colors.length < count) {
    colors = [...colors, ...colors];
  }

  return colors.slice(0, count);
};

/**
 * Portfolio Charts Component
 * @returns {JSX.Element} Component
 */
const PortfolioCharts = () => {
  const { portfolio, isLoading, error } = usePortfolio();
  const [pieChartData, setPieChartData] = useState({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
      },
    ],
  });
  const [colorMap, setColorMap] = useState({});

  // 计算投资组合散列值以进行缓存比较
  const portfolioHash = useMemo(() => {
    if (!portfolio?.coins) return "";
    return JSON.stringify(
      portfolio.coins.map((coin) => ({
        id: coin.id,
        value: coin.value,
      }))
    );
  }, [portfolio?.coins]);

  // 计算币种百分比
  const coinPercentages = useMemo(() => {
    if (!portfolio?.coins?.length) return [];

    const totalValue =
      portfolio.totalValue ||
      portfolio.coins.reduce((sum, coin) => sum + coin.value, 0);

    // 如果缓存的portfolioId与当前相同，直接使用缓存的饼图数据
    if (CHART_CACHE.portfolioId === portfolioHash && CHART_CACHE.pieData) {
      return CHART_CACHE.pieData;
    }

    // 排序币种（按价值降序）
    const sortedCoins = [...portfolio.coins]
      .filter((coin) => coin.value > 0)
      .sort((a, b) => b.value - a.value);

    // 生成固定的颜色
    const colors = generateChartColors(sortedCoins.length);
    const newColorMap = {};

    // 计算百分比，保留两位小数
    const percentages = sortedCoins.map((coin, index) => {
      const percentage = totalValue > 0 ? (coin.value / totalValue) * 100 : 0;
      const formattedPercentage = parseFloat(percentage.toFixed(2));

      // 存储颜色映射
      newColorMap[coin.id] = colors[index];

      return {
        id: coin.id,
        symbol: coin.symbol?.toUpperCase() || "未知",
        name: coin.name || "未知币种",
        value: coin.value,
        percentage: formattedPercentage,
        color: colors[index],
      };
    });

    // 更新颜色映射
    setColorMap(newColorMap);

    // 缓存计算结果
    CHART_CACHE.portfolioId = portfolioHash;
    CHART_CACHE.pieData = percentages;

    return percentages;
  }, [portfolioHash, portfolio?.coins, portfolio?.totalValue]);

  // 更新饼图数据
  useEffect(() => {
    if (coinPercentages.length > 0) {
      setPieChartData({
        labels: coinPercentages.map((coin) => coin.symbol),
        datasets: [
          {
            data: coinPercentages.map((coin) => coin.value),
            backgroundColor: coinPercentages.map((coin) => coin.color),
            borderColor: coinPercentages.map((coin) =>
              coin.color.replace("0.8", "1")
            ),
            borderWidth: 1,
          },
        ],
      });
    }
  }, [coinPercentages]);

  // 饼图配置选项
  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateScale: true,
        animateRotate: true,
      },
      plugins: {
        legend: {
          display: false, // 不在图表中显示图例，我们将在旁边自定义显示
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const coin = coinPercentages[context.dataIndex];
              const value = coin?.value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              return `${coin?.symbol}: $${value} (${coin?.percentage}%)`;
            },
          },
        },
      },
    }),
    [coinPercentages]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* 投资组合分布图 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>投资组合分布</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          {isLoading && (
            <div className="absolute inset-0 flex justify-center items-center z-10 bg-background/10">
              <Spinner size="lg" />
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center">
              <p className="text-destructive mb-2">{error}</p>
            </div>
          )}

          {!isLoading && !error && coinPercentages.length === 0 && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              暂无投资组合数据
            </div>
          )}

          {!isLoading && !error && coinPercentages.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              <div className="col-span-2 relative">
                <Pie data={pieChartData} options={pieOptions} />
              </div>
              <div className="flex flex-col justify-center">
                <ul className="space-y-2 text-sm">
                  {coinPercentages.map((coin) => (
                    <li key={coin.id} className="flex items-center">
                      <span
                        className="w-3 h-3 mr-2 rounded-full"
                        style={{ backgroundColor: coin.color }}
                      ></span>
                      <span className="font-medium mr-1">{coin.symbol}</span>
                      <span className="text-muted-foreground">
                        {coin.percentage}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 资产走势图 */}
      <PortfolioAreaChart portfolio={portfolio} />
    </div>
  );
};

export default PortfolioCharts;
