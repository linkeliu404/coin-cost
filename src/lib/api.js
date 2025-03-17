import axios from "axios";

const API_BASE_URL = "https://api.coingecko.com/api/v3";

/**
 * 获取热门加密货币列表
 * @param {number} limit - 返回结果数量限制
 * @returns {Promise<Array>} 加密货币列表
 */
export const getTopCryptocurrencies = async (limit = 50) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: limit,
        page: 1,
        sparkline: true,
        price_change_percentage: "24h,7d",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Failed to fetch top cryptocurrencies:", error);
    return [];
  }
};

/**
 * 搜索加密货币
 * @param {string} query - 搜索关键词
 * @returns {Promise<Array>} 搜索结果列表
 */
export const searchCryptocurrencies = async (query) => {
  if (!query.trim()) return [];

  try {
    const response = await axios.get(`${API_BASE_URL}/search`, {
      params: {
        query,
      },
    });

    // 搜索API只返回基本信息，需要获取详细信息
    const coins = response.data.coins.slice(0, 10); // 限制结果数量

    if (coins.length === 0) return [];

    // 获取详细信息
    const coinIds = coins.map((coin) => coin.id).join(",");
    const detailsResponse = await axios.get(`${API_BASE_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        ids: coinIds,
        order: "market_cap_desc",
        sparkline: false,
        price_change_percentage: "24h",
      },
    });

    return detailsResponse.data;
  } catch (error) {
    console.error("Failed to search cryptocurrencies:", error);
    return [];
  }
};

/**
 * 获取特定加密货币的详细信息
 * @param {string} coinId - 加密货币ID
 * @returns {Promise<Object|null>} 加密货币详细信息
 */
export const getCryptocurrencyDetails = async (coinId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        ids: coinId,
        sparkline: true,
        price_change_percentage: "24h,7d",
      },
    });

    return response.data[0] || null;
  } catch (error) {
    console.error(`Failed to fetch details for ${coinId}:`, error);
    return null;
  }
};

/**
 * 获取多个加密货币的详细信息
 * @param {Array<string>} coinIds - 加密货币ID列表
 * @returns {Promise<Object>} 加密货币ID到详细信息的映射
 */
export const getMultipleCryptocurrencyDetails = async (coinIds) => {
  if (coinIds.length === 0) return {};

  try {
    const response = await axios.get(`${API_BASE_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        ids: coinIds.join(","),
        sparkline: true,
        price_change_percentage: "24h,7d",
      },
    });

    // 转换为 id -> 数据 的映射
    const cryptoDataMap = {};
    response.data.forEach((coin) => {
      cryptoDataMap[coin.id] = coin;
    });

    return cryptoDataMap;
  } catch (error) {
    console.error("Failed to fetch multiple cryptocurrency details:", error);
    return {};
  }
};

/**
 * 获取历史价格数据
 * @param {string} coinId - 加密货币ID
 * @param {number} days - 天数
 * @returns {Promise<Object>} 历史价格数据
 */
export const getHistoricalPriceData = async (coinId, days = 7) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: "usd",
          days,
        },
      }
    );

    return { [coinId]: response.data };
  } catch (error) {
    console.error(`Failed to fetch historical data for ${coinId}:`, error);
    return { [coinId]: { prices: [] } };
  }
};
