import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

/**
 * @typedef {Object} CryptoSummaryProps
 * @property {Object} crypto - 加密货币数据
 * @property {Object} [portfolioCoin] - 投资组合中的加密货币数据，可能为空
 */

/**
 * 加密货币摘要组件
 * @param {CryptoSummaryProps} props
 * @returns {JSX.Element}
 */
const CryptoSummary = ({ crypto, portfolioCoin }) => {
  if (!crypto) {
    return null;
  }

  // 如果没有portfolioCoin或者没有交易记录，使用默认值
  const hasTransactions =
    portfolioCoin &&
    portfolioCoin.transactions &&
    portfolioCoin.transactions.length > 0;

  const holdings = hasTransactions ? portfolioCoin.holdings : 0;
  const averageBuyPrice = hasTransactions ? portfolioCoin.averageBuyPrice : 0;
  const totalInvestment = hasTransactions ? portfolioCoin.totalInvestment : 0;
  const currentPrice = crypto.current_price || 0;
  const currentValue = hasTransactions ? portfolioCoin.currentValue : 0;
  const profitLoss = hasTransactions ? portfolioCoin.profitLoss : 0;
  const profitLossPercentage = hasTransactions
    ? portfolioCoin.profitLossPercentage
    : 0;
  const firstBuyDate = hasTransactions ? portfolioCoin.firstBuyDate : null;
  const lastTransactionDate = hasTransactions
    ? portfolioCoin.lastTransactionDate
    : null;

  const isProfitable = profitLoss > 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{`${
          crypto.name
        } (${crypto.symbol.toUpperCase()}) 摘要`}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              当前持有
            </h4>
            <p className="text-xl font-bold">
              {hasTransactions
                ? `${holdings.toLocaleString()} ${crypto.symbol.toUpperCase()}`
                : "--"}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              平均买入价格
            </h4>
            <p className="text-xl font-bold">
              {hasTransactions ? `$${averageBuyPrice.toLocaleString()}` : "--"}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              当前价格
            </h4>
            <p className="text-xl font-bold">
              ${currentPrice.toLocaleString()}
            </p>
            <p
              className={`text-sm font-medium ${
                crypto.price_change_percentage_24h > 0
                  ? "text-green-600"
                  : crypto.price_change_percentage_24h < 0
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {crypto.price_change_percentage_24h > 0 ? "+" : ""}
              {crypto.price_change_percentage_24h.toFixed(2)}% (24h)
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              总投资
            </h4>
            <p className="text-xl font-bold">
              {hasTransactions ? `$${totalInvestment.toLocaleString()}` : "--"}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              当前价值
            </h4>
            <p className="text-xl font-bold">
              {hasTransactions ? `$${currentValue.toLocaleString()}` : "--"}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              利润/损失
            </h4>
            {hasTransactions ? (
              <>
                <p
                  className={`text-xl font-bold ${
                    isProfitable ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isProfitable ? "+" : ""}${profitLoss.toLocaleString()}
                </p>
                <p
                  className={`text-sm font-medium ${
                    isProfitable ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isProfitable ? "+" : ""}
                  {profitLossPercentage.toFixed(2)}%
                </p>
              </>
            ) : (
              <p className="text-xl font-bold">--</p>
            )}
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              首次买入日期
            </h4>
            <p className="text-xl font-bold">
              {firstBuyDate
                ? format(new Date(firstBuyDate), "yyyy-MM-dd")
                : "--"}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              最近交易日期
            </h4>
            <p className="text-xl font-bold">
              {lastTransactionDate
                ? format(new Date(lastTransactionDate), "yyyy-MM-dd")
                : "--"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CryptoSummary;
