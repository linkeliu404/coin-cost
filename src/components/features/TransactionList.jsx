import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { FiTrash2, FiEdit2, FiMoreVertical } from "react-icons/fi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * @typedef {Object} TransactionListProps
 * @property {Object} crypto - 加密货币数据
 * @property {Array} transactions - 交易记录列表
 * @property {(transactionId: string) => void} onDelete - 删除交易的回调函数
 * @property {(transaction: Object) => void} onEdit - 编辑交易的回调函数
 * @property {Object} portfolio - 投资组合数据
 */

/**
 * 交易列表组件
 * @param {TransactionListProps} props
 * @returns {JSX.Element}
 */
const TransactionList = ({
  crypto,
  transactions,
  onDelete,
  onEdit,
  portfolio,
}) => {
  const [activeTab, setActiveTab] = useState("all");

  // 获取所有币种的ID和名称，用于构建标签页
  const coinTabs = useMemo(() => {
    if (!portfolio || !portfolio.coins || portfolio.coins.length <= 1) {
      return [];
    }

    return portfolio.coins.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
    }));
  }, [portfolio]);

  // 根据选中的标签页筛选交易记录
  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") {
      // 如果只有一个币种，直接返回当前交易记录
      if (!coinTabs.length) {
        return transactions;
      }

      // 如果有多个币种，需要从portfolio中获取所有币种的交易记录
      const allTransactions = [];
      portfolio.coins.forEach((coin) => {
        if (coin.transactions && coin.transactions.length > 0) {
          // 为每个交易添加币种信息
          const coinTransactions = coin.transactions.map((tx) => ({
            ...tx,
            coinId: coin.id,
            coinName: coin.name,
            coinSymbol: coin.symbol,
            coinImage: coin.image,
          }));
          allTransactions.push(...coinTransactions);
        }
      });

      // 按日期降序排序
      return allTransactions.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
    } else {
      // 筛选特定币种的交易记录
      const selectedCoin = portfolio.coins.find(
        (coin) => coin.id === activeTab
      );
      if (!selectedCoin || !selectedCoin.transactions) {
        return [];
      }

      // 为每个交易添加币种信息
      return selectedCoin.transactions.map((tx) => ({
        ...tx,
        coinId: selectedCoin.id,
        coinName: selectedCoin.name,
        coinSymbol: selectedCoin.symbol,
        coinImage: selectedCoin.image,
      }));
    }
  }, [activeTab, transactions, portfolio, coinTabs]);

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            暂无交易记录
          </div>
        </CardContent>
      </Card>
    );
  }

  // 处理标签页切换
  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>交易记录</CardTitle>
      </CardHeader>
      <CardContent>
        {coinTabs.length > 0 && (
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              {coinTabs.map((coin) => (
                <TabsTrigger key={coin.id} value={coin.id}>
                  {coin.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                {activeTab === "all" && coinTabs.length > 0 && (
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    币种
                  </th>
                )}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  类型
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  数量
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  价格 (USD)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  总价值 (USD)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  日期
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  备注
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredTransactions.map((transaction) => {
                const totalValue = transaction.amount * transaction.price;
                const dateObj = new Date(transaction.date);
                const symbol = transaction.coinSymbol || crypto.symbol;

                return (
                  <tr key={transaction.id} className="hover:bg-muted/50">
                    {activeTab === "all" && coinTabs.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={transaction.coinImage}
                            alt={transaction.coinName}
                            className="h-6 w-6 rounded-full mr-2"
                          />
                          <span>{transaction.coinSymbol?.toUpperCase()}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === "buy"
                            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                            : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                        }`}
                      >
                        {transaction.type === "buy" ? "买入" : "卖出"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {transaction.amount.toLocaleString()}{" "}
                      {symbol.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      ${transaction.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      ${totalValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {format(dateObj, "yyyy-MM-dd HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-sm max-w-[200px] truncate">
                      {transaction.reason || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <FiMoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              // 如果是全部标签页，需要先切换到对应币种的标签页
                              if (activeTab === "all" && transaction.coinId) {
                                setActiveTab(transaction.coinId);
                                // 需要延迟执行编辑操作，等待标签页切换完成
                                setTimeout(() => {
                                  onEdit && onEdit(transaction);
                                }, 100);
                              } else {
                                onEdit && onEdit(transaction);
                              }
                            }}
                          >
                            <FiEdit2 className="mr-2 h-4 w-4" />
                            <span>编辑</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // 如果是全部标签页，需要传递币种ID
                              if (activeTab === "all" && transaction.coinId) {
                                onDelete(transaction.id, transaction.coinId);
                              } else {
                                onDelete(transaction.id);
                              }
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <FiTrash2 className="mr-2 h-4 w-4" />
                            <span>删除</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

export default TransactionList;
