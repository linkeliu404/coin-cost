import axios from "axios";

// API配置
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";
const BINANCE_API_URL = "https://api.binance.com/api/v3";

// 判断是否在生产环境
const isProduction = process.env.NODE_ENV === "production";

// API基础URL
const API_BASE_URL = isProduction ? "" : "";

// 缓存配置
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存
const cache = {
  topCoins: { data: null, timestamp: 0 },
  coinDetails: {},
  marketData: {},
};

// 辅助函数：重试机制
async function fetchWithRetry(fetcher, retries = 3, delay = 1000) {
  try {
    return await fetcher();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(fetcher, retries - 1, delay * 1.5);
  }
}

/**
 * 获取CoinGecko数据的代理函数
 * @param {string} endpoint - API端点路径
 * @param {Object} params - 请求参数
 * @returns {Promise<Object>} 响应数据
 */
async function fetchCoinGeckoProxy(endpoint, params = {}) {
  // 在生产环境中使用代理，在开发环境中直接调用API
  if (isProduction) {
    const searchParams = new URLSearchParams({
      endpoint,
      ...params,
    });

    return axios.get(`/api/coingecko?${searchParams.toString()}`);
  } else {
    return axios.get(`${COINGECKO_API_URL}/${endpoint}`, { params });
  }
}

/**
 * 从Binance获取币种价格
 * @param {string} symbol - 币种符号，如BTC
 * @returns {Promise<Object|null>} - 价格数据
 */
async function getBinancePrice(symbol) {
  try {
    if (!symbol) return null;

    // 转换为Binance支持的格式（如BTC变为BTCUSDT）
    const binanceSymbol = `${symbol.toUpperCase()}USDT`;

    const response = await fetch(`/api/binance?symbol=${binanceSymbol}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!data || !data.lastPrice) {
      throw new Error("Invalid Binance API response");
    }

    return {
      symbol: symbol,
      price: parseFloat(data.lastPrice),
      price_change_24h: parseFloat(data.priceChange),
      price_change_percentage_24h: parseFloat(data.priceChangePercent),
    };
  } catch (error) {
    console.error(`Error fetching Binance price for ${symbol}:`, error);
    return null;
  }
}

/**
 * 合并币种数据，优先使用Binance的价格数据
 * @param {Object} coinGeckoData - CoinGecko数据
 * @returns {Promise<Object>} - 合并后的数据
 */
async function enrichWithBinanceData(coinGeckoData) {
  if (!coinGeckoData) return coinGeckoData;

  const binanceData = await getBinancePrice(coinGeckoData.symbol);

  if (binanceData) {
    return {
      ...coinGeckoData,
      binance_price: binanceData.price,
      current_price: binanceData.price, // 优先使用Binance价格
      price_change_percentage_24h: binanceData.price_change_percentage_24h,
      price_source: "binance",
    };
  }

  return {
    ...coinGeckoData,
    price_source: "coingecko",
  };
}

/**
 * 获取热门加密货币列表
 * @param {number} limit - 返回结果数量限制
 * @returns {Promise<Array>} 加密货币列表
 */
export const getTopCryptocurrencies = async (limit = 50) => {
  // 检查缓存
  const now = Date.now();
  if (cache.topCoins.data && now - cache.topCoins.timestamp < CACHE_EXPIRY) {
    return cache.topCoins.data.slice(0, limit);
  }

  try {
    const response = await fetchWithRetry(async () => {
      return await fetchCoinGeckoProxy("coins/markets", {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: Math.min(100, limit),
        page: 1,
        sparkline: true,
        price_change_percentage: "24h,7d",
      });
    });

    // 增强数据
    const enrichedData = await Promise.all(
      response.data.map((coin) => enrichWithBinanceData(coin))
    );

    // 更新缓存
    cache.topCoins = {
      data: enrichedData,
      timestamp: now,
    };

    return enrichedData.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch top cryptocurrencies:", error);

    // 如果缓存存在但已过期，仍然返回它
    if (cache.topCoins.data) {
      console.log("Returning stale cached data for top cryptocurrencies");
      return cache.topCoins.data.slice(0, limit);
    }

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
    // 检查是否是合约地址（以0x开头的40位十六进制字符串）
    const isContractAddress = /^0x[a-fA-F0-9]{40}$/i.test(query);

    // 如果是合约地址
    if (isContractAddress) {
      console.log(`Searching for contract address: ${query}`);

      try {
        // 使用专门的API搜索合约地址
        // 先尝试使用CoinGecko的资产平台API (使用ethereum作为默认平台)
        const ethResponse = await fetchWithRetry(async () => {
          return await fetchCoinGeckoProxy(
            "coins/ethereum/contract/" + query.toLowerCase()
          );
        });

        if (ethResponse.data && ethResponse.data.id) {
          // 获取详细市场数据
          const detailsResponse = await fetchWithRetry(async () => {
            return await fetchCoinGeckoProxy("coins/markets", {
              vs_currency: "usd",
              ids: ethResponse.data.id,
              sparkline: false,
              price_change_percentage: "24h",
            });
          });

          if (detailsResponse.data && detailsResponse.data.length > 0) {
            return [detailsResponse.data[0]];
          }
        }
      } catch (error) {
        console.log(
          "Failed to find exact contract, trying alternative methods:",
          error
        );
      }

      // 如果专门的合约搜索失败，尝试常规搜索
      const response = await fetchWithRetry(async () => {
        return await fetchCoinGeckoProxy("search", { query });
      });

      // 提取匹配的合约地址
      const matchingCoins = response.data.coins.filter(
        (coin) =>
          coin.platforms &&
          Object.values(coin.platforms).some(
            (addr) => addr && addr.toLowerCase() === query.toLowerCase()
          )
      );

      if (matchingCoins.length > 0) {
        // 获取详细信息
        const coinIds = matchingCoins.map((coin) => coin.id).join(",");
        const detailsResponse = await fetchWithRetry(async () => {
          return await fetchCoinGeckoProxy("coins/markets", {
            vs_currency: "usd",
            ids: coinIds,
            order: "market_cap_desc",
            sparkline: false,
            price_change_percentage: "24h",
          });
        });

        return detailsResponse.data;
      }

      // 如果仍然没有找到，返回空数组
      return [];
    }
    // 普通搜索
    else {
      // 先尝试在缓存的热门币中搜索
      if (cache.topCoins.data) {
        const cacheResults = cache.topCoins.data.filter(
          (coin) =>
            coin.name.toLowerCase().includes(query.toLowerCase()) ||
            coin.symbol.toLowerCase().includes(query.toLowerCase())
        );

        if (cacheResults.length > 0) {
          console.log("Returning search results from cache");
          return cacheResults.slice(0, 10);
        }
      }

      // 使用CoinGecko搜索API
      const response = await fetchWithRetry(async () => {
        return await fetchCoinGeckoProxy("search", { query });
      });

      // 搜索API只返回基本信息，需要获取详细信息
      const coins = response.data.coins.slice(0, 10); // 限制结果数量

      if (coins.length === 0) return [];

      // 获取详细信息
      const coinIds = coins.map((coin) => coin.id).join(",");
      const detailsResponse = await fetchWithRetry(async () => {
        return await fetchCoinGeckoProxy("coins/markets", {
          vs_currency: "usd",
          ids: coinIds,
          order: "market_cap_desc",
          sparkline: false,
          price_change_percentage: "24h",
        });
      });

      // 增强数据
      return await Promise.all(
        detailsResponse.data.map((coin) => enrichWithBinanceData(coin))
      );
    }
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
  // 检查缓存
  const now = Date.now();
  if (
    cache.coinDetails[coinId] &&
    now - cache.coinDetails[coinId].timestamp < CACHE_EXPIRY
  ) {
    return cache.coinDetails[coinId].data;
  }

  try {
    const response = await fetchWithRetry(async () => {
      return await fetchCoinGeckoProxy("coins/markets", {
        vs_currency: "usd",
        ids: coinId,
        sparkline: true,
        price_change_percentage: "24h,7d",
      });
    });

    if (!response.data[0]) return null;

    // 增强数据
    const enrichedData = await enrichWithBinanceData(response.data[0]);

    // 更新缓存
    cache.coinDetails[coinId] = {
      data: enrichedData,
      timestamp: now,
    };

    return enrichedData;
  } catch (error) {
    console.error(`Failed to fetch details for ${coinId}:`, error);

    // 如果缓存存在但已过期，仍然返回它
    if (cache.coinDetails[coinId]) {
      console.log(`Returning stale cached data for ${coinId}`);
      return cache.coinDetails[coinId].data;
    }

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

  // 准备结果对象
  const result = {};
  const coinsToFetch = [];

  // 检查哪些需要获取，哪些可以使用缓存
  const now = Date.now();
  coinIds.forEach((id) => {
    if (
      cache.coinDetails[id] &&
      now - cache.coinDetails[id].timestamp < CACHE_EXPIRY
    ) {
      result[id] = cache.coinDetails[id].data;
    } else {
      coinsToFetch.push(id);
    }
  });

  // 如果所有币种都在缓存中，直接返回
  if (coinsToFetch.length === 0) return result;

  try {
    const response = await fetchWithRetry(async () => {
      return await fetchCoinGeckoProxy("coins/markets", {
        vs_currency: "usd",
        ids: coinsToFetch.join(","),
        sparkline: true,
        price_change_percentage: "24h,7d",
      });
    });

    // 转换为 id -> 数据 的映射
    const enrichedPromises = response.data.map(async (coin) => {
      const enriched = await enrichWithBinanceData(coin);

      // 更新缓存
      cache.coinDetails[coin.id] = {
        data: enriched,
        timestamp: now,
      };

      return [coin.id, enriched];
    });

    // 等待所有增强数据处理完成
    const enrichedEntries = await Promise.all(enrichedPromises);

    // 合并结果
    enrichedEntries.forEach(([id, data]) => {
      result[id] = data;
    });

    return result;
  } catch (error) {
    console.error("Failed to fetch multiple cryptocurrency details:", error);

    // 对于未能获取的币种，尝试使用过期缓存
    coinsToFetch.forEach((id) => {
      if (cache.coinDetails[id]) {
        console.log(`Using stale cache for ${id}`);
        result[id] = cache.coinDetails[id].data;
      }
    });

    return result;
  }
};

/**
 * 获取历史价格数据
 * @param {string} coinId - 加密货币ID
 * @param {number} days - 天数
 * @returns {Promise<Object>} 历史价格数据
 */
export const getHistoricalPriceData = async (coinId, days = 7) => {
  // 检查缓存
  const cacheKey = `${coinId}_${days}`;
  const now = Date.now();
  if (
    cache.marketData[cacheKey] &&
    now - cache.marketData[cacheKey].timestamp < CACHE_EXPIRY
  ) {
    return { [coinId]: cache.marketData[cacheKey].data };
  }

  try {
    const response = await fetchWithRetry(async () => {
      return await fetchCoinGeckoProxy(`coins/${coinId}/market_chart`, {
        vs_currency: "usd",
        days,
      });
    });

    // 更新缓存
    cache.marketData[cacheKey] = {
      data: response.data,
      timestamp: now,
    };

    return { [coinId]: response.data };
  } catch (error) {
    console.error(`Failed to fetch historical data for ${coinId}:`, error);

    // 如果缓存存在但已过期，仍然返回它
    if (cache.marketData[cacheKey]) {
      console.log(`Returning stale historical data for ${coinId}`);
      return { [coinId]: cache.marketData[cacheKey].data };
    }

    return { [coinId]: { prices: [] } };
  }
};
