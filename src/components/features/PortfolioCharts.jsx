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
  TabsContent,
} from "@/components/ui";
import { useChartData } from "@/hooks/useChartData";
import PieChart from "./PieChart";
import LineChart from "./LineChart";

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
  const [timeRange, setTimeRange] = useState("7d");
  const {
    portfolioChartData,
    profitChartData,
    isLoading,
    error,
    retryFetchHistoricalData,
  } = useChartData(portfolio, timeRange);

  // 计算每个币种的百分比
  const coinPercentages = useMemo(() => {
    if (!portfolio || portfolio.coins.length === 0) return [];

    const totalValue = portfolio.totalValue || 0;

    return portfolio.coins
      .map((coin) => ({
        id: coin.id,
        symbol: coin.symbol,
        percentage: (coin.currentValue / totalValue) * 100,
        color: getColorForCoin(coin.id, portfolioChartData),
      }))
      .sort((a, b) => b.percentage - a.percentage); // 按百分比降序排序
  }, [portfolio, portfolioChartData]);

  // 获取币种的图表颜色
  const getColorForCoin = (coinId, chartData) => {
    if (!chartData || !chartData.datasets || !chartData.datasets[0]) {
      return "#cccccc";
    }

    const index = chartData.labels.findIndex(
      (label) =>
        label.toLowerCase() ===
        portfolio.coins.find((c) => c.id === coinId)?.symbol.toUpperCase()
    );

    return index >= 0
      ? chartData.datasets[0].backgroundColor[index]
      : "#cccccc";
  };

  // 处理时间范围变化
  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
  };

  // 如果没有投资组合数据，显示空状态
  if (!portfolio || portfolio.coins.length === 0) {
    return (
      <div className="p-4 bg-card rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">投资组合分析</h3>
        <div className="text-center p-6 bg-muted/30 rounded-md">
          <p className="text-muted-foreground">
            添加加密货币后，这里会显示分析图表
          </p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error && !isLoading) {
    return (
      <div className="p-4 bg-card rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">投资组合分析</h3>
        <div className="text-center p-6 bg-destructive/10 rounded-md">
          <p className="text-destructive mb-2">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={retryFetchHistoricalData}
          >
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>投资组合分布</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart
            data={portfolioChartData}
            loading={isLoading}
            portfolio={portfolio}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>收益走势</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="7d" onValueChange={handleTimeRangeChange}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="1d">24h</TabsTrigger>
              <TabsTrigger value="7d">7天</TabsTrigger>
              <TabsTrigger value="30d">30天</TabsTrigger>
              <TabsTrigger value="90d">90天</TabsTrigger>
              <TabsTrigger value="365d">1年</TabsTrigger>
            </TabsList>
            <TabsContent value={timeRange}>
              <LineChart
                data={profitChartData}
                loading={isLoading}
                timeRange={timeRange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioCharts;
