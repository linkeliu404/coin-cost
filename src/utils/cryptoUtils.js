import { format } from "date-fns";

/**
 * 计算持有数量
 * @param {Array} transactions - 交易记录列表
 * @returns {number} 持有数量
 */
export const calculateHoldings = (transactions) => {
  return transactions.reduce((total, transaction) => {
    if (transaction.type === "buy") {
      return total + transaction.amount;
    } else {
      return total - transaction.amount;
    }
  }, 0);
};

/**
 * 计算平均买入价格
 * @param {Array} transactions - 交易记录列表
 * @returns {number} 平均买入价格
 */
export const calculateAverageBuyPrice = (transactions) => {
  const buyTransactions = transactions.filter((t) => t.type === "buy");

  if (buyTransactions.length === 0) return 0;

  const totalCost = buyTransactions.reduce(
    (sum, t) => sum + t.price * t.amount,
    0
  );
  const totalAmount = buyTransactions.reduce((sum, t) => sum + t.amount, 0);

  return totalAmount > 0 ? totalCost / totalAmount : 0;
};

/**
 * 计算总投资成本
 * @param {Array} transactions - 交易记录列表
 * @returns {number} 总投资成本
 */
export const calculateTotalInvestment = (transactions) => {
  return transactions.reduce((total, t) => {
    if (t.type === "buy") {
      return total + t.price * t.amount;
    } else {
      return total - t.price * t.amount;
    }
  }, 0);
};

/**
 * 计算当前价值
 * @param {number} holdings - 持有数量
 * @param {number} currentPrice - 当前价格
 * @returns {number} 当前价值
 */
export const calculateCurrentValue = (holdings, currentPrice) => {
  return holdings * currentPrice;
};

/**
 * 计算利润/损失
 * @param {number} currentValue - 当前价值
 * @param {number} totalInvestment - 总投资成本
 * @returns {number} 利润/损失
 */
export const calculateProfitLoss = (currentValue, totalInvestment) => {
  return currentValue - totalInvestment;
};

/**
 * 计算利润/损失百分比
 * @param {number} profitLoss - 利润/损失
 * @param {number} totalInvestment - 总投资成本
 * @returns {number} 利润/损失百分比
 */
export const calculateProfitLossPercentage = (profitLoss, totalInvestment) => {
  return totalInvestment > 0 ? (profitLoss / totalInvestment) * 100 : 0;
};

/**
 * 获取首次买入日期
 * @param {Array} transactions - 交易记录列表
 * @returns {string} 首次买入日期
 */
export const getFirstBuyDate = (transactions) => {
  const buyTransactions = transactions.filter((t) => t.type === "buy");

  if (buyTransactions.length === 0) return "";

  const dates = buyTransactions.map((t) => new Date(t.date));
  const firstDate = new Date(Math.min(...dates.map((d) => d.getTime())));

  return format(firstDate, "yyyy-MM-dd");
};

/**
 * 获取最近交易日期
 * @param {Array} transactions - 交易记录列表
 * @returns {string} 最近交易日期
 */
export const getLastTransactionDate = (transactions) => {
  if (transactions.length === 0) return "";

  const dates = transactions.map((t) => new Date(t.date));
  const lastDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  return format(lastDate, "yyyy-MM-dd");
};

/**
 * 更新投资组合币种数据
 * @param {Object} coin - 投资组合币种数据
 * @param {Object} cryptoData - 加密货币市场数据
 * @returns {Object} 更新后的投资组合币种数据
 */
export const updatePortfolioCoin = (coin, cryptoData) => {
  const holdings = calculateHoldings(coin.transactions);
  const averageBuyPrice = calculateAverageBuyPrice(coin.transactions);
  const totalInvestment = calculateTotalInvestment(coin.transactions);
  const currentPrice = cryptoData.current_price;
  const currentValue = calculateCurrentValue(holdings, currentPrice);
  const profitLoss = calculateProfitLoss(currentValue, totalInvestment);
  const profitLossPercentage = calculateProfitLossPercentage(
    profitLoss,
    totalInvestment
  );
  const firstBuyDate = getFirstBuyDate(coin.transactions);
  const lastTransactionDate = getLastTransactionDate(coin.transactions);

  return {
    ...coin,
    symbol: cryptoData.symbol,
    name: cryptoData.name,
    image: cryptoData.image,
    holdings,
    averageBuyPrice,
    totalInvestment,
    currentPrice,
    currentValue,
    profitLoss,
    profitLossPercentage,
    firstBuyDate,
    lastTransactionDate,
  };
};

/**
 * 更新整个投资组合数据
 * @param {Object} portfolio - 投资组合数据
 * @param {Object} cryptoDataMap - 加密货币ID到市场数据的映射
 * @returns {Object} 更新后的投资组合数据
 */
export const updatePortfolio = (portfolio, cryptoDataMap) => {
  const updatedCoins = portfolio.coins.map((coin) => {
    const cryptoData = cryptoDataMap[coin.id];
    if (!cryptoData) return coin;

    return updatePortfolioCoin(coin, cryptoData);
  });

  const totalInvestment = updatedCoins.reduce(
    (sum, coin) => sum + coin.totalInvestment,
    0
  );
  const totalValue = updatedCoins.reduce(
    (sum, coin) => sum + coin.currentValue,
    0
  );
  const totalProfitLoss = totalValue - totalInvestment;
  const totalProfitLossPercentage =
    totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

  return {
    coins: updatedCoins,
    totalInvestment,
    totalValue,
    totalProfitLoss,
    totalProfitLossPercentage,
  };
};
