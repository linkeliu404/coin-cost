import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * @typedef {Object} PortfolioSummaryProps
 * @property {Object} portfolio - 投资组合数据
 */

/**
 * 投资组合摘要组件
 * @param {PortfolioSummaryProps} props
 * @returns {JSX.Element}
 */
const PortfolioSummary = ({ portfolio }) => {
  if (!portfolio || portfolio.coins.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>投资组合摘要</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            暂无投资数据
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    totalInvestment,
    totalValue,
    totalProfitLoss,
    totalProfitLossPercentage,
  } = portfolio;
  const isProfitable = totalProfitLoss > 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>投资组合摘要</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              总投资
            </h4>
            <p className="text-2xl font-bold">
              ${totalInvestment.toLocaleString()}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              当前总价值
            </h4>
            <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              总利润/损失
            </h4>
            <p
              className={`text-2xl font-bold ${
                isProfitable ? "text-green-600" : "text-red-600"
              }`}
            >
              {isProfitable ? "+" : ""}${totalProfitLoss.toLocaleString()}
            </p>
            <p
              className={`text-sm font-medium ${
                isProfitable ? "text-green-600" : "text-red-600"
              }`}
            >
              {isProfitable ? "+" : ""}
              {totalProfitLossPercentage.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            投资组合构成
          </h4>
          <div className="space-y-3">
            {portfolio.coins.map((coin) => {
              const percentage = (coin.currentValue / totalValue) * 100;
              const isProfitableCoin = coin.profitLoss > 0;

              return (
                <div key={coin.id} className="flex items-center">
                  <img
                    src={coin.image}
                    alt={coin.name}
                    className="h-6 w-6 rounded-full mr-2"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {coin.name} ({coin.symbol.toUpperCase()})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${coin.currentValue.toLocaleString()} (
                        {percentage.toFixed(2)}%)
                      </p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: isProfitableCoin
                            ? "#10b981"
                            : "#ef4444",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioSummary;
