const PORTFOLIO_KEY = "crypto-portfolio";

/**
 * 从本地存储获取投资组合数据
 * @returns {Object|null} 投资组合数据
 */
export const getPortfolioFromStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    const portfolioData = localStorage.getItem(PORTFOLIO_KEY);
    if (!portfolioData) return null;

    return JSON.parse(portfolioData);
  } catch (error) {
    console.error("Failed to get portfolio from storage:", error);
    return null;
  }
};

/**
 * 保存投资组合数据到本地存储
 * @param {Object} portfolio - 投资组合数据
 */
export const savePortfolioToStorage = (portfolio) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
  } catch (error) {
    console.error("Failed to save portfolio to storage:", error);
  }
};

/**
 * 添加交易记录
 * @param {string} coinId - 加密货币ID
 * @param {Object} transaction - 交易记录
 * @returns {Object|null} 更新后的投资组合数据
 */
export const addTransaction = (coinId, transaction) => {
  const portfolio = getPortfolioFromStorage() || {
    coins: [],
    totalInvestment: 0,
    totalValue: 0,
    totalProfitLoss: 0,
    totalProfitLossPercentage: 0,
  };

  // 查找币种
  const coinIndex = portfolio.coins.findIndex((coin) => coin.id === coinId);

  if (coinIndex >= 0) {
    // 如果币种已存在，添加交易记录
    portfolio.coins[coinIndex].transactions.push(transaction);
  } else {
    // 如果币种不存在，创建新的币种记录
    portfolio.coins.push({
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
    });
  }

  savePortfolioToStorage(portfolio);
  return portfolio;
};

/**
 * 删除交易记录
 * @param {string} coinId - 加密货币ID
 * @param {string} transactionId - 交易记录ID
 * @returns {Object|null} 更新后的投资组合数据
 */
export const deleteTransaction = (coinId, transactionId) => {
  const portfolio = getPortfolioFromStorage();
  if (!portfolio) return null;

  const coinIndex = portfolio.coins.findIndex((coin) => coin.id === coinId);
  if (coinIndex < 0) return portfolio;

  // 过滤掉要删除的交易记录
  portfolio.coins[coinIndex].transactions = portfolio.coins[
    coinIndex
  ].transactions.filter((t) => t.id !== transactionId);

  // 如果没有交易记录了，删除这个币种
  if (portfolio.coins[coinIndex].transactions.length === 0) {
    portfolio.coins = portfolio.coins.filter((coin) => coin.id !== coinId);
  }

  savePortfolioToStorage(portfolio);
  return portfolio;
};

/**
 * 导出投资组合数据
 * @returns {string} 投资组合数据的JSON字符串
 */
export const exportPortfolio = () => {
  const portfolio = getPortfolioFromStorage();
  if (!portfolio) return "";

  return JSON.stringify(portfolio);
};

/**
 * 导入投资组合数据
 * @param {string} data - 投资组合数据的JSON字符串
 * @returns {boolean} 是否导入成功
 */
export const importPortfolio = (data) => {
  try {
    const portfolio = JSON.parse(data);
    savePortfolioToStorage(portfolio);
    return true;
  } catch (error) {
    console.error("Failed to import portfolio:", error);
    return false;
  }
};
