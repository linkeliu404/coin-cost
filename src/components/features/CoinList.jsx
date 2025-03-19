import React from "react";
import { FiPlusCircle } from "react-icons/fi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";

/**
 * @typedef {Object} CoinListProps
 * @property {Array} coins - 加密货币列表
 * @property {(coinId: string) => void} onSelectCoin - 选择加密货币的回调函数
 * @property {(coinId: string) => void} onAddTransaction - 添加交易记录的回调函数
 * @property {boolean} [isLoading] - 加载状态
 */

/**
 * 加密货币列表组件
 * @param {CoinListProps} props
 * @returns {JSX.Element}
 */
const CoinList = ({
  coins,
  onSelectCoin,
  onAddTransaction,
  isLoading = false,
}) => {
  if (!coins || coins.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>我的加密货币</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            暂无加密货币，请点击&quot;添加加密货币&quot;按钮添加
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>我的加密货币</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  加密货币
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  持有数量
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  平均买入价格
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  当前价格
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  当前价值
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  利润/损失
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody
              className={`bg-card divide-y divide-border ${
                isLoading ? "opacity-70" : ""
              }`}
            >
              {coins.map((coin) => {
                const hasTransactions =
                  coin.transactions && coin.transactions.length > 0;
                const isProfitable = hasTransactions && coin.profitLoss > 0;

                return (
                  <tr
                    key={coin.id}
                    className="hover:bg-muted/50"
                    onClick={() => onSelectCoin(coin.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="h-8 w-8 rounded-full mr-3"
                          onError={(e) => {
                            // 使用内联SVG替代外部图片服务
                            const symbol = coin.symbol.charAt(0).toUpperCase();
                            const colors = [
                              "#FF6B6B",
                              "#4ECDC4",
                              "#1A535C",
                              "#FFE66D",
                              "#6B48FF",
                            ];
                            const colorIndex =
                              symbol.charCodeAt(0) % colors.length;
                            const bgColor = colors[colorIndex];

                            // 创建SVG数据URL
                            const svgContent = `
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                                <circle cx="16" cy="16" r="16" fill="${bgColor}" />
                                <text x="16" y="22" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">${symbol}</text>
                              </svg>
                            `;
                            const svgBlob = new Blob([svgContent], {
                              type: "image/svg+xml",
                            });
                            e.target.src = URL.createObjectURL(svgBlob);
                            e.target.onerror = null; // 防止循环触发
                          }}
                        />
                        <div>
                          <div className="font-medium">{coin.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {coin.symbol.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {hasTransactions
                        ? `${coin.holdings.toLocaleString()} ${coin.symbol.toUpperCase()}`
                        : "--"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {hasTransactions
                        ? `$${coin.averageBuyPrice.toLocaleString()}`
                        : "--"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      ${coin.currentPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {hasTransactions
                        ? `$${coin.currentValue.toLocaleString()}`
                        : "--"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasTransactions ? (
                        <>
                          <div
                            className={
                              isProfitable ? "text-green-600" : "text-red-600"
                            }
                          >
                            {isProfitable ? "+" : ""}$
                            {coin.profitLoss.toLocaleString()}
                          </div>
                          <div
                            className={`text-xs ${
                              isProfitable ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isProfitable ? "+" : ""}
                            {coin.profitLossPercentage.toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddTransaction && onAddTransaction(coin.id);
                              }}
                              disabled={isLoading}
                            >
                              <FiPlusCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>添加交易记录</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CoinList;
