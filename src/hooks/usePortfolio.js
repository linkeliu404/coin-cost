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
  const deleteTransaction = async (coinId, transactionId) => {
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

      // 立即更新投资组合数据
      await refreshPortfolio();

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

      // 验证导入的数据结构
      if (!importedPortfolio || !Array.isArray(importedPortfolio.coins)) {
        throw new Error("Invalid portfolio data format");
      }

      // 检查每个币种的数据是否有效
      for (const coin of importedPortfolio.coins) {
        if (!coin.id || !Array.isArray(coin.transactions)) {
          throw new Error(`Invalid coin data: ${coin.id || "unknown"}`);
        }

        // 检查每个交易记录是否有效
        for (const transaction of coin.transactions) {
          if (
            !transaction.id ||
            !transaction.date ||
            transaction.amount == null ||
            transaction.price == null ||
            !transaction.type
          ) {
            throw new Error(
              `Invalid transaction data in coin: ${coin.id || "unknown"}`
            );
          }
        }
      }

      // 获取所有币种的ID
      const coinIds = importedPortfolio.coins.map((coin) => coin.id);

      // 获取最新的加密货币数据
      const cryptoDataMap = await getMultipleCryptocurrencyDetails(coinIds);

      // 更新每个币种的实时价格和相关数据
      const updatedCoins = importedPortfolio.coins.map((coin) => {
        const cryptoData = cryptoDataMap[coin.id];
        if (!cryptoData) return coin;

        return {
          ...coin,
          name: cryptoData.name || coin.name,
          symbol: cryptoData.symbol || coin.symbol,
          image: cryptoData.image || coin.image,
          currentPrice: cryptoData.current_price,
        };
      });

      // 处理投资组合的统计数据
      const processedPortfolio = processPortfolioData({
        ...importedPortfolio,
        coins: updatedCoins,
      });

      // 保存到本地存储
      savePortfolioToStorage(processedPortfolio);
      setPortfolio(processedPortfolio);

      // 立即刷新以获取最新价格
      await refreshPortfolio();

      return true;
    } catch (err) {
      setError(`Failed to import portfolio: ${err.message}`);
      console.error(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理投资组合数据，计算各项指标
   * @param {Object} portfolio - 投资组合对象
   * @returns {Object} 处理后的投资组合数据
   */
  const processPortfolioData = (portfolio) => {
    // 处理每个币种的数据
    const processedCoins = portfolio.coins.map((coin) => {
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
