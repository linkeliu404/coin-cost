import React from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
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
  const { portfolioChartData, weeklyProfitChartData, isLoading, error } =
    useChartData(portfolio);

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
          <CardHeader>
            <CardTitle>7天收益图</CardTitle>
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
          <CardHeader>
            <CardTitle>7天收益图</CardTitle>
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
            <div className="text-center py-8 text-destructive">
              加载图表数据失败
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>7天收益图</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-destructive">
              加载图表数据失败
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
        },
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>投资组合分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {portfolioChartData.datasets[0].data.length > 0 ? (
              <Pie data={portfolioChartData} options={pieOptions} />
            ) : (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                暂无数据可显示
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7天收益图</CardTitle>
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
