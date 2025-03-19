import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getPortfolioFromStorage,
  savePortfolioToStorage,
} from "@/utils/localStorage";
import { updatePortfolio } from "@/utils/cryptoUtils";
import {
  getMultipleCryptocurrencyDetails,
  getTopCryptocurrencies,
  searchCryptocurrencies,
} from "@/lib/api";

/**
 * 创建一个空的投资组合
 * @returns {Object} 空的投资组合对象
 */
const createEmptyPortfolio = () => ({
  coins: [],
  totalInvestment: 0,
  totalValue: 0,
  totalProfitLoss: 0,
  totalProfitLossPercentage: 0,
});

/**
 * 投资组合管理的自定义钩子
 * @returns {Object} 投资组合管理相关的状态和方法
 */
export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState(createEmptyPortfolio());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 初始化投资组合
  useEffect(() => {
    const initPortfolio = async () => {
      try {
        setIsLoading(true);

        // 从本地存储获取投资组合
        const storedPortfolio = getPortfolioFromStorage();

        if (!storedPortfolio || storedPortfolio.coins.length === 0) {
          setPortfolio(createEmptyPortfolio());
          setIsLoading(false);
          return;
        }

        // 获取所有币种的ID
        const coinIds = storedPortfolio.coins.map((coin) => coin.id);

        // 获取最新的加密货币数据
        const cryptoDataMap = await getMultipleCryptocurrencyDetails(coinIds);

        // 更新投资组合数据
        const updatedPortfolio = updatePortfolio(
          storedPortfolio,
          cryptoDataMap
        );

        setPortfolio(updatedPortfolio);
        savePortfolioToStorage(updatedPortfolio);
      } catch (err) {
        setError("Failed to initialize portfolio");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initPortfolio();
  }, []);

  /**
   * 添加交易记录
   * @param {string} coinId - 加密货币ID
   * @param {Object} transactionData - 交易数据（不包含id和coinId）
   * @returns {boolean} 是否添加成功
   */
  const addTransaction = (coinId, transactionData) => {
    try {
      const transaction = {
        id: uuidv4(),
        coinId,
        ...transactionData,
      };

      setPortfolio((prevPortfolio) => {
        const coinIndex = prevPortfolio.coins.findIndex(
          (coin) => coin.id === coinId
        );

        let updatedCoins;

        if (coinIndex >= 0) {
          // 如果币种已存在，添加交易记录
          updatedCoins = [...prevPortfolio.coins];
          updatedCoins[coinIndex] = {
            ...updatedCoins[coinIndex],
            transactions: [
              ...updatedCoins[coinIndex].transactions,
              transaction,
            ],
          };
        } else {
          // 如果币种不存在，创建新的币种记录
          updatedCoins = [
            ...prevPortfolio.coins,
            {
              id: coinId,
              symbol: "",
              name: "",
              image: "",
              transactions: [transaction],
              holdings: 0,
              averageBuyPrice: 0,
              totalInvestment: 0,
              currentPrice: 0,
              currentValue: 0,
              profitLoss: 0,
              profitLossPercentage: 0,
              firstBuyDate: transaction.date,
              lastTransactionDate: transaction.date,
            },
          ];
        }

        const updatedPortfolio = {
          ...prevPortfolio,
          coins: updatedCoins,
        };

        // 保存到本地存储
        savePortfolioToStorage(updatedPortfolio);

        return updatedPortfolio;
      });

      // 更新投资组合数据
      refreshPortfolio();

      return true;
    } catch (err) {
      setError("Failed to add transaction");
      console.error(err);
      return false;
    }
  };

  /**
   * 删除交易记录
   * @param {string} coinId - 加密货币ID
   * @param {string} transactionId - 交易记录ID
   * @returns {boolean} 是否删除成功
   */
  const deleteTransaction = (coinId, transactionId) => {
    try {
      setPortfolio((prevPortfolio) => {
        const coinIndex = prevPortfolio.coins.findIndex(
          (coin) => coin.id === coinId
        );

        if (coinIndex < 0) return prevPortfolio;

        const updatedCoins = [...prevPortfolio.coins];

        // 过滤掉要删除的交易记录
        updatedCoins[coinIndex] = {
          ...updatedCoins[coinIndex],
          transactions: updatedCoins[coinIndex].transactions.filter(
            (t) => t.id !== transactionId
          ),
        };

        // 如果没有交易记录了，删除这个币种
        const filteredCoins =
          updatedCoins[coinIndex].transactions.length === 0
            ? updatedCoins.filter((coin) => coin.id !== coinId)
            : updatedCoins;

        const updatedPortfolio = {
          ...prevPortfolio,
          coins: filteredCoins,
        };

        // 保存到本地存储
        savePortfolioToStorage(updatedPortfolio);

        return updatedPortfolio;
      });

      // 更新投资组合数据
      refreshPortfolio();

      return true;
    } catch (err) {
      setError("Failed to delete transaction");
      console.error(err);
      return false;
    }
  };

  /**
   * 刷新投资组合数据
   * @returns {Promise<void>}
   */
  const refreshPortfolio = async () => {
    try {
      setIsLoading(true);

      const currentPortfolio =
        getPortfolioFromStorage() || createEmptyPortfolio();

      if (currentPortfolio.coins.length === 0) {
        setPortfolio(createEmptyPortfolio());
        setIsLoading(false);
        return;
      }

      // 获取所有币种的ID
      const coinIds = currentPortfolio.coins.map((coin) => coin.id);

      // 获取最新的加密货币数据
      const cryptoDataMap = await getMultipleCryptocurrencyDetails(coinIds);

      // 更新投资组合数据
      const updatedPortfolio = updatePortfolio(currentPortfolio, cryptoDataMap);

      setPortfolio(updatedPortfolio);
      savePortfolioToStorage(updatedPortfolio);
    } catch (err) {
      setError("Failed to refresh portfolio");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 导入投资组合数据
   * @param {Object|string} data - 投资组合数据对象或JSON字符串
   * @returns {boolean} 是否导入成功
   */
  const importPortfolio = async (data) => {
    try {
      setIsLoading(true);

      // 检查数据类型，如果是字符串则解析，否则直接使用
      const importedPortfolio =
        typeof data === "string" ? JSON.parse(data) : data;

      // 验证数据格式
      if (!importedPortfolio || !Array.isArray(importedPortfolio.coins)) {
        console.error("Invalid portfolio data format");
        setIsLoading(false);
        return false;
      }

      // 预处理投资组合数据，为每个币种计算基本指标
      const coins = importedPortfolio.coins.map((coin) => ({
        ...coin,
        // 确保交易数组存在
        transactions: Array.isArray(coin.transactions) ? coin.transactions : [],
        // 使用logoUrl字段（如果存在）作为image
        image: coin.logoUrl || coin.image || "",
        // 确保ID存在，优先使用coinGeckoId
        id: coin.coinGeckoId || coin.id || `${coin.symbol}-${Date.now()}`,
      }));

      // 临时保存处理后的数据，以便用户可以立即看到导入结果
      const initialProcessed = processPortfolioData(coins);
      setPortfolio(initialProcessed);
      savePortfolioToStorage(initialProcessed);

      // 获取所有币种的符号和ID，用于搜索最新价格
      const coinSymbols = new Set(
        coins.map((coin) => coin.symbol.toLowerCase())
      );

      // 同时维护ID映射，优先使用CoinGecko ID（如果存在）
      const coinIds = new Set(
        coins
          .filter((coin) => coin.coinGeckoId || (coin.id && coin.id.length > 5))
          .map((coin) => coin.coinGeckoId || coin.id)
      );

      // 将币种按符号分组，稍后用于更新币种信息
      const coinsBySymbol = {};
      coins.forEach((coin) => {
        const symbol = coin.symbol.toLowerCase();
        if (!coinsBySymbol[symbol]) {
          coinsBySymbol[symbol] = [];
        }
        coinsBySymbol[symbol].push(coin);
      });

      // 获取最新价格数据
      if (coinSymbols.size > 0 || coinIds.size > 0) {
        try {
          console.log("Fetching latest cryptocurrency data...");

          // 同时获取价格数据的方式
          const [topCryptos, specificCryptos] = await Promise.all([
            // 获取顶级加密货币列表
            getTopCryptocurrencies(100),
            // 如果有确定的ID，直接获取这些加密货币的详细信息
            coinIds.size > 0
              ? getMultipleCryptocurrencyDetails(Array.from(coinIds))
              : Promise.resolve({}),
          ]);

          let updatedCoins = [...coins];
          let updated = false;

          // 1. 首先使用特定ID获取的数据更新币种
          if (specificCryptos && Object.keys(specificCryptos).length > 0) {
            updatedCoins = updatedCoins.map((coin) => {
              const coinId = coin.coinGeckoId || coin.id;
              const cryptoData = specificCryptos[coinId];

              if (cryptoData) {
                updated = true;
                return {
                  ...coin,
                  id: cryptoData.id,
                  name: cryptoData.name,
                  symbol: coin.symbol, // 保留原始符号以避免不匹配
                  image: cryptoData.image || coin.image,
                  currentPrice:
                    cryptoData.current_price || coin.currentPrice || 0,
                };
              }
              return coin;
            });
          }

          // 2. 使用顶级加密货币数据更新币种信息
          for (const crypto of topCryptos) {
            const symbol = crypto.symbol.toLowerCase();
            if (coinsBySymbol[symbol]) {
              // 为所有同一符号的币种更新信息
              coinsBySymbol[symbol].forEach((coin) => {
                const coinIndex = updatedCoins.findIndex(
                  (c) => c.id === coin.id
                );
                if (coinIndex !== -1) {
                  updatedCoins[coinIndex] = {
                    ...updatedCoins[coinIndex],
                    id: crypto.id, // 使用API返回的标准ID
                    name: crypto.name,
                    image: crypto.image || updatedCoins[coinIndex].image,
                    currentPrice:
                      crypto.current_price ||
                      updatedCoins[coinIndex].currentPrice ||
                      0,
                  };
                  updated = true;
                }
              });

              // 从待处理列表中删除已处理的符号
              coinSymbols.delete(symbol);
            }
          }

          // 3. 对于未在顶级列表中找到的币种，尝试直接搜索
          if (coinSymbols.size > 0) {
            console.log(
              `Searching for remaining symbols: ${Array.from(coinSymbols).join(
                ", "
              )}`
            );
            for (const symbol of coinSymbols) {
              try {
                const searchResults = await searchCryptocurrencies(symbol);

                if (searchResults && searchResults.length > 0) {
                  // 找到最匹配的结果（通常是第一个）
                  const matchingCrypto =
                    searchResults.find(
                      (c) => c.symbol.toLowerCase() === symbol
                    ) || searchResults[0];

                  // 更新所有同一符号的币种
                  coinsBySymbol[symbol].forEach((coin) => {
                    const coinIndex = updatedCoins.findIndex(
                      (c) => c.id === coin.id
                    );
                    if (coinIndex !== -1) {
                      updatedCoins[coinIndex] = {
                        ...updatedCoins[coinIndex],
                        id: matchingCrypto.id,
                        name: matchingCrypto.name,
                        image:
                          matchingCrypto.image || updatedCoins[coinIndex].image,
                        currentPrice:
                          matchingCrypto.current_price ||
                          updatedCoins[coinIndex].currentPrice ||
                          0,
                      };
                      updated = true;
                    }
                  });
                }
              } catch (error) {
                console.error(`Failed to search for ${symbol}:`, error);
              }
            }
          }

          // 如果有更新，重新处理投资组合数据
          if (updated) {
            console.log("Updating portfolio with latest cryptocurrency data");
            const finalProcessed = processPortfolioData(updatedCoins);
            setPortfolio(finalProcessed);
            savePortfolioToStorage(finalProcessed);
          }
        } catch (error) {
          console.error("Failed to fetch updated prices:", error);
          // 即使无法获取最新价格，仍然继续使用初始处理后的数据
        }
      }

      setIsLoading(false);
      return true;
    } catch (err) {
      setError("Failed to import portfolio");
      console.error(err);
      setIsLoading(false);
      return false;
    }
  };

  /**
   * 处理投资组合数据，计算各项指标
   * @param {Array} coins - 币种数据数组
   * @returns {Object} 处理后的投资组合数据
   */
  const processPortfolioData = (coins) => {
    // 处理每个币种的数据
    const processedCoins = coins.map((coin) => {
      // 计算持有量、总投资、平均买入价格等
      let totalHoldings = 0;
      let totalInvestment = 0;
      let totalBuyAmount = 0;
      let firstBuyDate = null;
      let lastTransactionDate = null;

      // 处理每笔交易
      coin.transactions.forEach((tx) => {
        const amount = tx.amount || 0;
        const price = tx.price || 0;

        // 更新交易日期信息
        const txDate = new Date(tx.date);
        if (!firstBuyDate && tx.type === "buy") {
          firstBuyDate = txDate;
        } else if (tx.type === "buy" && txDate < firstBuyDate) {
          firstBuyDate = txDate;
        }

        if (!lastTransactionDate) {
          lastTransactionDate = txDate;
        } else if (txDate > lastTransactionDate) {
          lastTransactionDate = txDate;
        }

        // 计算持有量
        if (tx.type === "buy") {
          totalHoldings += amount;
          totalInvestment += amount * price;
          totalBuyAmount += amount;
        } else if (tx.type === "sell") {
          totalHoldings -= amount;
          // 这里使用简化的盈亏计算，实际应该使用FIFO等算法
          totalInvestment = Math.max(
            0,
            totalInvestment - (amount / totalHoldings) * totalInvestment
          );
        }
      });

      // 计算平均买入价格
      const averageBuyPrice =
        totalBuyAmount > 0 ? totalInvestment / totalBuyAmount : 0;

      // 计算当前价值和盈亏
      const currentPrice = coin.currentPrice || 0;
      const currentValue = totalHoldings * currentPrice;
      const profitLoss = currentValue - totalInvestment;
      const profitLossPercentage =
        totalInvestment > 0 ? (profitLoss / totalInvestment) * 100 : 0;

      // 返回处理后的币种数据
      return {
        ...coin,
        holdings: totalHoldings,
        totalInvestment,
        averageBuyPrice,
        currentValue,
        profitLoss,
        profitLossPercentage,
        firstBuyDate: firstBuyDate ? firstBuyDate.toISOString() : null,
        lastTransactionDate: lastTransactionDate
          ? lastTransactionDate.toISOString()
          : null,
      };
    });

    // 计算投资组合总指标
    let totalInvestment = 0;
    let totalValue = 0;

    processedCoins.forEach((coin) => {
      totalInvestment += coin.totalInvestment || 0;
      totalValue += coin.currentValue || 0;
    });

    const totalProfitLoss = totalValue - totalInvestment;
    const totalProfitLossPercentage =
      totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

    // 返回处理后的投资组合
    return {
      coins: processedCoins,
      totalInvestment,
      totalValue,
      totalProfitLoss,
      totalProfitLossPercentage,
    };
  };

  /**
   * 导出投资组合数据
   * @returns {string} 投资组合数据的JSON字符串
   */
  const exportPortfolioData = () => {
    try {
      // 确保导出数据包含完整的币种信息，特别是图标URL
      const exportData = {
        ...portfolio,
        coins: portfolio.coins.map((coin) => ({
          ...coin,
          // 确保包含必要的字段，方便导入时自动匹配和获取价格
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.image,
          currentPrice: coin.currentPrice,
          // 添加额外数据以帮助导入过程
          logoUrl: coin.image, // 冗余logoUrl字段，确保在导入时可以使用
          coinGeckoId: coin.id, // 明确的CoinGecko ID字段
          lastUpdated: new Date().toISOString(), // 添加导出时间戳
        })),
      };

      return JSON.stringify(exportData);
    } catch (err) {
      setError("Failed to export portfolio");
      console.error(err);
      return "";
    }
  };

  /**
   * 更新交易记录
   * @param {string} coinId - 加密货币ID
   * @param {string} transactionId - 交易记录ID
   * @param {Object} transactionData - 更新后的交易数据（不包含id和coinId）
   * @returns {boolean} 是否更新成功
   */
  const updateTransaction = (coinId, transactionId, transactionData) => {
    try {
      setPortfolio((prevPortfolio) => {
        const coinIndex = prevPortfolio.coins.findIndex(
          (coin) => coin.id === coinId
        );

        if (coinIndex < 0) return prevPortfolio;

        const updatedCoins = [...prevPortfolio.coins];
        const transactionIndex = updatedCoins[coinIndex].transactions.findIndex(
          (t) => t.id === transactionId
        );

        if (transactionIndex < 0) return prevPortfolio;

        // 更新交易记录
        updatedCoins[coinIndex].transactions[transactionIndex] = {
          ...updatedCoins[coinIndex].transactions[transactionIndex],
          ...transactionData,
          id: transactionId,
          coinId,
        };

        const updatedPortfolio = {
          ...prevPortfolio,
          coins: updatedCoins,
        };

        // 保存到本地存储
        savePortfolioToStorage(updatedPortfolio);

        return updatedPortfolio;
      });

      // 更新投资组合数据
      refreshPortfolio();

      return true;
    } catch (err) {
      setError("Failed to update transaction");
      console.error(err);
      return false;
    }
  };

  return {
    portfolio,
    isLoading,
    error,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    refreshPortfolio,
    importPortfolio,
    exportPortfolioData,
  };
};
