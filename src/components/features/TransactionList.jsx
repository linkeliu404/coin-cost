import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import {
  FiTrash2,
  FiEdit2,
  FiMoreVertical,
  FiDownload,
  FiFileText,
} from "react-icons/fi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * @typedef {Object} TransactionListProps
 * @property {Object} crypto - 加密货币数据
 * @property {Array} transactions - 交易记录列表
 * @property {(transactionId: string) => void} onDelete - 删除交易的回调函数
 * @property {(transaction: Object) => void} onEdit - 编辑交易的回调函数
 * @property {Object} portfolio - 投资组合数据
 * @property {boolean} [isLoading] - 加载状态
 */

/**
 * 导出交易记录为CSV文件
 * @param {Array} transactions - 交易记录数组
 */
const exportTransactionsToCSV = (transactions) => {
  if (!transactions || transactions.length === 0) {
    alert("没有可导出的交易记录");
    return;
  }

  // 定义CSV标题行
  const headers = [
    "币种",
    "类型",
    "数量",
    "价格(USD)",
    "总价值(USD)",
    "日期",
    "备注",
  ];

  // 处理交易数据行
  const rows = transactions.map((tx) => {
    const totalValue = tx.amount * tx.price;
    const dateObj = new Date(tx.date);
    const formattedDate = format(dateObj, "yyyy-MM-dd HH:mm:ss");
    const type = tx.type === "buy" ? "买入" : "卖出";

    return [
      tx.coinSymbol?.toUpperCase() || "",
      type,
      tx.amount,
      tx.price,
      totalValue,
      formattedDate,
      tx.reason || "",
    ];
  });

  // 组合成CSV内容
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // 创建下载链接
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `交易记录_${format(new Date(), "yyyyMMdd")}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 导出交易记录为JSON文件（完整数据，包含图标URL等信息）
 * @param {Array} transactions - 交易记录数组
 * @param {Object} portfolio - 投资组合数据
 */
const exportTransactionsToJSON = (transactions, portfolio) => {
  if (!transactions || transactions.length === 0 || !portfolio) {
    alert("没有可导出的交易记录");
    return;
  }

  // 创建导出数据，包含完整信息
  const exportData = {
    exportDate: new Date().toISOString(),
    exportType: "transactions",
    coins: {},
  };

  // 根据交易记录构建完整的币种数据
  transactions.forEach((tx) => {
    const { coinId, coinName, coinSymbol, coinImage } = tx;

    if (!exportData.coins[coinId]) {
      // 查找完整的币种数据
      const coinData = portfolio.coins.find((c) => c.id === coinId) || {
        id: coinId,
        name: coinName,
        symbol: coinSymbol,
        image: coinImage,
      };

      exportData.coins[coinId] = {
        id: coinId,
        name: coinName,
        symbol: coinSymbol,
        image: coinImage,
        logoUrl: coinImage, // 冗余字段，确保导入时可以使用
        transactions: [],
      };
    }

    exportData.coins[coinId].transactions.push({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      price: tx.price,
      date: tx.date,
      reason: tx.reason || "",
    });
  });

  // 转换为数组格式
  exportData.coins = Object.values(exportData.coins);

  // 创建下载链接
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `交易记录_${format(new Date(), "yyyyMMdd")}.json`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

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
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [allTransactions, setAllTransactions] = useState([]);

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

  // 组件挂载或portfolio变化时获取所有交易记录
  useEffect(() => {
    if (!portfolio || !portfolio.coins) return;

    const transactions = [];
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
        transactions.push(...coinTransactions);
      }
    });

    // 按日期降序排序
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    setAllTransactions(transactions);
  }, [portfolio]);

  // 根据选中的标签页筛选交易记录
  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") {
      return allTransactions;
    } else {
      // 从所有交易中筛选特定币种的交易记录
      return allTransactions.filter((tx) => tx.coinId === activeTab);
    }
  }, [activeTab, allTransactions]);

  if (
    (!transactions || transactions.length === 0) &&
    (!allTransactions || allTransactions.length === 0)
  ) {
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

  // 导出当前筛选后的交易记录
  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions);
  };

  // 导出JSON格式的完整数据
  const handleExportJSON = () => {
    exportTransactionsToJSON(filteredTransactions, portfolio);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>交易记录</CardTitle>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || filteredTransactions.length === 0}
                className="flex items-center"
              >
                <FiDownload className="mr-2 h-4 w-4" />
                导出
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FiFileText className="mr-2 h-4 w-4" />
                <span>导出为CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>
                <FiFileText className="mr-2 h-4 w-4" />
                <span>导出为JSON (推荐)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
                  {coin.symbol.toUpperCase()}
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
            <tbody
              className={`bg-card divide-y divide-border ${
                isLoading ? "opacity-70" : ""
              }`}
            >
              {filteredTransactions.map((transaction) => {
                const totalValue = transaction.amount * transaction.price;
                const dateObj = new Date(transaction.date);
                const symbol = transaction.coinSymbol || crypto?.symbol || "";

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
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isLoading}
                          >
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
                            disabled={isLoading}
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
                            disabled={isLoading}
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
