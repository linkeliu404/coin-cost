import React from "react";
import { Line } from "react-chartjs-2";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 折线图组件，用于显示收益走势
 */
const LineChart = ({ data, loading, timeRange }) => {
  // 加载状态或无数据显示
  if (
    loading ||
    !data ||
    !data.datasets ||
    data.datasets[0].data.length === 0
  ) {
    return (
      <div className="flex justify-center items-center h-full">
        {loading ? (
          <div className="space-y-2 w-full">
            <Skeleton className="h-[200px] w-full rounded-md" />
          </div>
        ) : (
          <p className="text-muted-foreground text-center">
            无法加载收益走势数据
          </p>
        )}
      </div>
    );
  }

  // 图表配置选项
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // 隐藏图例
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.raw || 0;
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            }).format(value);
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          callback: function (value) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            }).format(value);
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-h-[200px]">
      <Line data={data} options={options} />
    </div>
  );
};

export default LineChart;
