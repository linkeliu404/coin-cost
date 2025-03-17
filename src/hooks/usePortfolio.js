import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getPortfolioFromStorage,
  savePortfolioToStorage,
} from "@/utils/localStorage";
import { updatePortfolio } from "@/utils/cryptoUtils";
import { getMultipleCryptocurrencyDetails } from "@/lib/api";

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
   * @param {string} data - 投资组合数据的JSON字符串
   * @returns {boolean} 是否导入成功
   */
  const importPortfolio = (data) => {
    try {
      const importedPortfolio = JSON.parse(data);
      setPortfolio(importedPortfolio);
      savePortfolioToStorage(importedPortfolio);
      refreshPortfolio();
      return true;
    } catch (err) {
      setError("Failed to import portfolio");
      console.error(err);
      return false;
    }
  };

  /**
   * 导出投资组合数据
   * @returns {string} 投资组合数据的JSON字符串
   */
  const exportPortfolioData = () => {
    try {
      return JSON.stringify(portfolio);
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
