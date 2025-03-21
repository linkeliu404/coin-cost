import React from "react";
import { Card, CardContent } from "@/components/ui";

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
      <div className="mb-6 text-center py-8 text-muted-foreground">
        暂无投资数据
      </div>
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            总投资
          </h4>
          <p className="text-2xl font-bold">
            ${totalInvestment.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            当前总价值
          </h4>
          <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            总利润/损失
          </h4>
          <p
            className={`text-2xl font-bold ${
              isProfitable ? "text-green-600" : "text-red-600"
            }`}
          >
            {isProfitable ? "+" : ""}${totalProfitLoss.toLocaleString()}
            <span className="text-sm font-medium">
              ({isProfitable ? "+" : ""}
              {totalProfitLossPercentage.toFixed(2)}%)
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSummary;
