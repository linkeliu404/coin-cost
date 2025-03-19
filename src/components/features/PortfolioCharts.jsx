import React, { useState, useMemo } from "react";
import { Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
} from "chart.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useChartData } from "@/hooks/useChartData";

// 注册Chart.js组件
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

/**
 * @typedef {Object} PortfolioChartsProps
 * @property {Object} portfolio - 投资组合数据
 */

/**
 * 投资组合图表组件
 * @param {PortfolioChartsProps} props
 * @returns {JSX.Element}
 */
const PortfolioCharts = ({ portfolio }) => {
  const [timeRange, setTimeRange] = useState("24h");

  const {
    portfolioChartData,
    weeklyProfitChartData,
    isLoading,
    error,
    retryFetchHistoricalData,
  } = useChartData(portfolio);

  // 计算每个币种的百分比
  const coinPercentages = useMemo(() => {
    if (
      !portfolio ||
      !portfolio.coins ||
      !portfolio.totalValue ||
      portfolio.totalValue === 0
    ) {
      return [];
    }

    return portfolio.coins
      .map((coin) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        value: coin.currentValue,
        percentage: (coin.currentValue / portfolio.totalValue) * 100,
        color:
          portfolioChartData.datasets[0]?.backgroundColor?.[
            portfolioChartData.labels.findIndex(
              (label) => label === coin.symbol.toUpperCase()
            )
          ] || "rgba(209, 213, 219, 0.7)",
        isProfitable: coin.profitLoss > 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [portfolio, portfolioChartData]);

  if (!portfolio || portfolio.coins.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>投资组合分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              暂无投资数据
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>收益走势</CardTitle>
            <Tabs value="24h" className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="24h" className="text-xs px-2 h-7">
                  24h
                </TabsTrigger>
                <TabsTrigger value="7d" className="text-xs px-2 h-7">
                  7d
                </TabsTrigger>
                <TabsTrigger value="1m" className="text-xs px-2 h-7">
                  1m
                </TabsTrigger>
                <TabsTrigger value="3m" className="text-xs px-2 h-7">
                  3m
                </TabsTrigger>
                <TabsTrigger value="1y" className="text-xs px-2 h-7">
                  1y
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              暂无投资数据
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>投资组合分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>收益走势</CardTitle>
            <Tabs value="24h" className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="24h" className="text-xs px-2 h-7">
                  24h
                </TabsTrigger>
                <TabsTrigger value="7d" className="text-xs px-2 h-7">
                  7d
                </TabsTrigger>
                <TabsTrigger value="1m" className="text-xs px-2 h-7">
                  1m
                </TabsTrigger>
                <TabsTrigger value="3m" className="text-xs px-2 h-7">
                  3m
                </TabsTrigger>
                <TabsTrigger value="1y" className="text-xs px-2 h-7">
                  1y
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>投资组合分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-destructive mb-4">{error}</div>
              <Button
                variant="outline"
                onClick={retryFetchHistoricalData}
                disabled={isLoading}
              >
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>收益走势</CardTitle>
            <Tabs value="24h" className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="24h" className="text-xs px-2 h-7">
                  24h
                </TabsTrigger>
                <TabsTrigger value="7d" className="text-xs px-2 h-7">
                  7d
                </TabsTrigger>
                <TabsTrigger value="1m" className="text-xs px-2 h-7">
                  1m
                </TabsTrigger>
                <TabsTrigger value="3m" className="text-xs px-2 h-7">
                  3m
                </TabsTrigger>
                <TabsTrigger value="1y" className="text-xs px-2 h-7">
                  1y
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-destructive mb-4">{error}</div>
              <Button
                variant="outline"
                onClick={retryFetchHistoricalData}
                disabled={isLoading}
              >
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.chart.getDatasetMeta(0).total;
            const percentage = Math.round((value / total) * 100);
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw || 0;
            return `$${value.toLocaleString()}`;
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
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`,
        },
      },
    },
  };

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    // 这里可以添加逻辑来获取不同时间范围的数据
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>投资组合分布</CardTitle>
        </CardHeader>
        <CardContent>
          {portfolioChartData.datasets[0].data.length > 0 ? (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/2 h-56 md:h-80">
                <Pie data={portfolioChartData} options={pieOptions} />
              </div>
              <div className="w-full md:w-1/2 h-56 md:h-80 overflow-y-auto">
                <div className="space-y-3 pr-2">
                  {coinPercentages.map((coin, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: coin.color }}
                        ></div>
                        <span className="text-sm font-medium">
                          {coin.symbol}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold">
                          {coin.percentage.toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ${coin.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-80 text-muted-foreground">
              暂无数据可显示
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>收益走势</CardTitle>
          <Tabs
            value={timeRange}
            onValueChange={handleTimeRangeChange}
            className="w-auto"
          >
            <TabsList className="h-8">
              <TabsTrigger value="24h" className="text-xs px-2 h-7">
                24h
              </TabsTrigger>
              <TabsTrigger value="7d" className="text-xs px-2 h-7">
                7d
              </TabsTrigger>
              <TabsTrigger value="1m" className="text-xs px-2 h-7">
                1m
              </TabsTrigger>
              <TabsTrigger value="3m" className="text-xs px-2 h-7">
                3m
              </TabsTrigger>
              <TabsTrigger value="1y" className="text-xs px-2 h-7">
                1y
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {weeklyProfitChartData.datasets[0].data.length > 0 ? (
              <Line data={weeklyProfitChartData} options={lineOptions} />
            ) : (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                暂无数据可显示
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioCharts;
