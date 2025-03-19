import React from "react";
import { Pie } from "react-chartjs-2";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 饼图组件，用于显示投资组合分布
 */
const PieChart = ({ data, loading, portfolio }) => {
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
            无法加载投资组合分布数据
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
        display: false, // 隐藏图例，我们在旁边手动显示
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.chart.getDatasetMeta(0).total;
            const percentage = Math.round((value / total) * 100);

            // 格式化为美元金额
            const formattedValue = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            }).format(value);

            return `${label}: ${formattedValue} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-h-[200px]">
      <Pie data={data} options={options} />
    </div>
  );
};

export default PieChart;
