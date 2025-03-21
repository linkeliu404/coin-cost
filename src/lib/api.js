import axios from "axios";

// API配置
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";
const BINANCE_API_URL = "https://api.binance.com/api/v3";

// 判断是否在生产环境
const isProduction = process.env.NODE_ENV === "production";

// API基础URL
const API_BASE_URL = isProduction ? "" : "";

// 缓存配置
const CACHE_EXPIRY = 15 * 60 * 1000; // 延长缓存到15分钟
const cache = {
  topCoins: { data: null, timestamp: 0 },
  coinDetails: {},
  marketData: {},
  historicalPrices: {},
  // 添加请求速率限制
  requestCount: 0,
  requestResetTime: 0,
};

// 初始化API错误跟踪
if (typeof window !== "undefined") {
  window._apiErrors = window._apiErrors || [];

  // 添加记录API错误的方法
  window.trackApiError = (endpoint, error) => {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      endpoint,
      error:
        typeof error === "object"
          ? { message: error.message, stack: error.stack, name: error.name }
          : String(error),
    };

    console.error(`API Error [${endpoint}]:`, error);
    window._apiErrors.push(errorInfo);

    // 最多保留最近50条错误记录
    if (window._apiErrors.length > 50) {
      window._apiErrors.shift();
    }

    return errorInfo;
  };

  // 显示API错误弹窗的方法
  window.showApiErrors = () => {
    if (!window._apiErrors || window._apiErrors.length === 0) {
      alert("没有记录到API错误");
      return;
    }

    const errorMessage = window._apiErrors
      .map(
        (err) =>
          `${err.timestamp} [${err.endpoint}]: ${JSON.stringify(err.error)}`
      )
      .join("\n\n");

    alert(`最近API错误 (${window._apiErrors.length}):\n\n${errorMessage}`);
  };
}

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

// 添加请求速率限制处理函数
async function rateLimitedRequest(fetcher, fallbackData = null) {
  // 检查当前分钟内的请求数
  const now = Date.now();
  if (now - cache.requestResetTime > 60000) {
    // 重置计数器（每分钟）
    cache.requestCount = 0;
    cache.requestResetTime = now;
  }

  // 如果请求数超过限制，延迟或直接返回缓存
  const MAX_REQUESTS_PER_MINUTE = 8; // 保守估计，防止触发限制

  if (cache.requestCount >= MAX_REQUESTS_PER_MINUTE) {
    console.warn("API请求频率已达上限，使用缓存数据或延迟请求");

    // 如果有提供的备用数据，直接返回
    if (fallbackData !== null) {
      return fallbackData;
    }

    // 否则延迟请求到下一分钟
    const timeToNextMinute = 60000 - (now - cache.requestResetTime);
    await new Promise((resolve) =>
      setTimeout(resolve, timeToNextMinute + 1000)
    );

    // 重置计数器
    cache.requestCount = 0;
    cache.requestResetTime = Date.now();
  }

  // 增加请求计数
  cache.requestCount++;

  try {
    return await fetcher();
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error("遇到API限制，等待冷却期...");
      // 触发了限制，强制等待较长时间
      await new Promise((resolve) => setTimeout(resolve, 60000));
      cache.requestCount = 0;
      cache.requestResetTime = Date.now();

      // 如果有备用数据，返回备用数据
      if (fallbackData !== null) {
        return fallbackData;
      }

      // 否则再次尝试
      return await fetcher();
    }
    throw error;
  }
}

/**
 * 获取CoinGecko数据的代理函数
 * @param {string} endpoint - API端点路径
 * @param {Object} params - 请求参数
 * @returns {Promise<Object>} 响应数据
 */
async function fetchCoinGeckoProxy(endpoint, params = {}) {
  // 生成缓存键
  const cacheKey = `${endpoint}_${JSON.stringify(params)}`;

  // 检查缓存
  if (
    cache.marketData[cacheKey] &&
    Date.now() - cache.marketData[cacheKey].timestamp < CACHE_EXPIRY
  ) {
    console.log(`Using cached data for: ${endpoint}`);
    return cache.marketData[cacheKey].data;
  }

  try {
    // 添加请求速率限制
    const data = await rateLimitedRequest(async () => {
      let response;

      if (isProduction) {
        const searchParams = new URLSearchParams({
          endpoint,
          ...params,
        });

        response = await axios.get(`/api/coingecko?${searchParams.toString()}`);
      } else {
        response = await axios.get(`${COINGECKO_API_URL}/${endpoint}`, {
          params,
        });
      }

      return response.data;
    });

    // 更新缓存
    cache.marketData[cacheKey] = {
      data: data,
      timestamp: Date.now(),
    };

    return data;
  } catch (error) {
    // 记录错误
    if (typeof window !== "undefined") {
      window.trackApiError(`CoinGecko[${endpoint}]`, error);
    }

    // 尝试使用过期缓存
    if (cache.marketData[cacheKey]) {
      console.log(`Using stale cache for ${endpoint} due to error`);
      return cache.marketData[cacheKey].data;
    }

    // 重新抛出错误
    throw error;
  }
}

/**
 * 获取币安价格数据，使用更可靠的公共端点
 * @param {string} symbol - 币种符号(带USDT后缀，例如 BTCUSDT)
 * @returns {Promise<number|null>} - 返回价格或null
 */
async function getBinancePrice(symbol) {
  try {
    // 使用 Binance 公共 API 端点，而不是通过本地代理
    const response = await fetch(
      `https://api1.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `Binance API warning: ${response.status} - ${errorText}`;
      console.warn(errorMsg);

      // 记录错误
      if (typeof window !== "undefined") {
        window.trackApiError(`BinancePrice[${symbol}]`, {
          message: errorMsg,
          status: response.status,
          details: errorText,
        });
      }

      return null;
    }

    const data = await response.json();
    const price = parseFloat(data.price);
    return isNaN(price) ? null : price;
  } catch (error) {
    console.warn("Binance price API error (will try fallback):", error);

    // 记录错误
    if (typeof window !== "undefined") {
      window.trackApiError(`BinancePrice[${symbol}]`, error);
    }

    return null;
  }
}

/**
 * 获取 Binance K线数据，使用更可靠的公共端点
 * @param {string} symbol - 币种符号(带USDT后缀，例如 BTCUSDT)
 * @param {string} interval - 时间间隔，例如 1d, 4h, 1h
 * @param {number} limit - 返回的K线数量
 * @returns {Promise<Array|null>} - 返回K线数据或null
 */
async function getBinanceKlines(symbol, interval = "1d", limit = 7) {
  try {
    // 使用 Binance 公共 API 端点获取 K 线数据
    const response = await fetch(
      `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(
        `Binance Klines API warning: ${response.status} - ${errorText}`
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Binance klines API error (will try fallback):", error);
    return null;
  }
}

/**
 * 使用 CoinGecko 作为主要数据源，币安作为备用
 * @param {Object} coinGeckoData - CoinGecko返回的数据
 * @returns {Promise<Object>} - 增强后的数据
 */
async function enrichWithBinanceData(coinGeckoData) {
  try {
    const symbol = coinGeckoData.symbol.toUpperCase();
    const binanceSymbol = `${symbol}USDT`;

    // 尝试从 Binance 获取价格
    const binancePrice = await getBinancePrice(binanceSymbol);

    if (binancePrice !== null) {
      // 如果 Binance 价格可用，则更新价格
      const percentChange = coinGeckoData.price_change_percentage_24h || 0;

      return {
        ...coinGeckoData,
        current_price: binancePrice,
        binance_symbol: binanceSymbol,
        binance_price_available: true,
      };
    }

    // 如果 Binance 价格不可用，保留 CoinGecko 价格
    return {
      ...coinGeckoData,
      binance_price_available: false,
    };
  } catch (error) {
    console.warn("Error enriching with Binance data:", error);
    return coinGeckoData;
  }
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
      response.map((coin) => enrichWithBinanceData(coin))
    );

    // 更新缓存
    cache.topCoins = {
      data: enrichedData,
      timestamp: now,
    };

    return enrichedData.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch top cryptocurrencies:", error);

    // 记录错误
    if (typeof window !== "undefined") {
      window.trackApiError("getTopCryptocurrencies", error);
    }

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
 * 获取加密货币详情
 * @param {string} coinId - 加密货币ID
 * @returns {Promise<Object>} - 加密货币详情
 */
export const getCryptocurrencyDetails = async (coinId) => {
  try {
    console.log(`Fetching details for coin ID: ${coinId}`);
    const data = await fetchCoinGeckoProxy(
      `coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );

    if (!data || !data.id) {
      throw new Error("Invalid cryptocurrency details response");
    }

    // 构造基础响应对象
    const response = {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      image:
        data.image?.large ||
        data.image?.small ||
        `https://raw.githubusercontent.com/coinwink/cryptocurrency-logos/master/coins/32x32/${data.symbol.toLowerCase()}.png`,
      current_price: data.market_data?.current_price?.usd || 0,
      market_cap: data.market_data?.market_cap?.usd || 0,
      market_cap_rank: data.market_data?.market_cap_rank || null,
      fully_diluted_valuation:
        data.market_data?.fully_diluted_valuation?.usd || 0,
      total_volume: data.market_data?.total_volume?.usd || 0,
      high_24h: data.market_data?.high_24h?.usd || 0,
      low_24h: data.market_data?.low_24h?.usd || 0,
      price_change_24h: data.market_data?.price_change_24h || 0,
      price_change_percentage_24h:
        data.market_data?.price_change_percentage_24h || 0,
      market_cap_change_24h: data.market_data?.market_cap_change_24h || 0,
      market_cap_change_percentage_24h:
        data.market_data?.market_cap_change_percentage_24h || 0,
      circulating_supply: data.market_data?.circulating_supply || 0,
      total_supply: data.market_data?.total_supply || 0,
      max_supply: data.market_data?.max_supply || 0,
      last_updated: data.last_updated || new Date().toISOString(),
    };

    // 尝试用 Binance 数据丰富响应
    return await enrichWithBinanceData(response);
  } catch (error) {
    console.error("Failed to fetch cryptocurrency details:", error);
    throw new Error("Failed to fetch cryptocurrency details");
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
    // 批量处理币种查询，每次最多查询5个
    const batchSize = 5;
    for (let i = 0; i < coinsToFetch.length; i += batchSize) {
      const batchIds = coinsToFetch.slice(i, i + batchSize);
      const response = await fetchWithRetry(async () => {
        return await fetchCoinGeckoProxy("coins/markets", {
          vs_currency: "usd",
          ids: batchIds.join(","),
          sparkline: true,
          price_change_percentage: "24h,7d",
        });
      });

      // 处理这批次的结果
      if (response && Array.isArray(response)) {
        const enrichedPromises = response.map(async (coin) => {
          try {
            const enriched = await enrichWithBinanceData(coin);

            // 更新缓存
            cache.coinDetails[coin.id] = {
              data: enriched,
              timestamp: now,
            };

            return [coin.id, enriched];
          } catch (err) {
            console.warn(`Error enriching data for ${coin.id}:`, err);
            return [coin.id, coin];
          }
        });

        // 等待所有增强数据处理完成
        const enrichedEntries = await Promise.all(enrichedPromises);

        // 合并结果
        enrichedEntries.forEach(([id, data]) => {
          result[id] = data;
        });
      }

      // 如果还有更多批次，等待一小段时间以避免触发频率限制
      if (i + batchSize < coinsToFetch.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

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
 * 获取历史价格数据，支持多币种
 * @param {Array<string>|string} coinIds - 加密货币ID或ID数组
 * @param {number} days - 天数
 * @returns {Promise<Object>} - 历史价格数据，格式为 {coinId: {prices: [[timestamp, price], ...], market_caps: [...], total_volumes: [...]}}
 */
export const getHistoricalPriceData = async (coinIds, days = 7) => {
  // 处理单个coinId的情况
  const coinIdArray = Array.isArray(coinIds) ? coinIds : [coinIds];
  const result = {};

  try {
    console.log(
      `Fetching historical price data for coin IDs: ${coinIdArray.join(
        ", "
      )}, days: ${days}`
    );

    // 使用Promise.all并行获取多个币种的数据
    await Promise.all(
      coinIdArray.map(async (coinId) => {
        try {
          // 优先使用CoinGecko API
          const data = await fetchCoinGeckoProxy(
            `coins/${coinId}/market_chart`,
            {
              vs_currency: "usd",
              days: days.toString(),
              interval: days <= 1 ? "hourly" : "daily",
            }
          );

          if (data && data.prices && data.prices.length) {
            result[coinId] = {
              ...data,
              source: "coingecko",
            };
            return;
          }

          // 如果CoinGecko无数据，尝试Binance作为备选
          console.log(`No CoinGecko data for ${coinId}, trying Binance...`);

          // 获取币种符号信息
          const coinInfo = await fetchCoinGeckoProxy(
            `coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
          );

          if (!coinInfo || !coinInfo.symbol) {
            throw new Error("Invalid coin information");
          }

          const symbol = coinInfo.symbol.toUpperCase();
          const binanceSymbol = `${symbol}USDT`;

          // 尝试使用Binance获取数据
          const interval = days <= 1 ? "1h" : days <= 7 ? "4h" : "1d";
          const limit = days <= 1 ? 24 : days <= 7 ? 42 : Math.min(days, 90);

          const binanceData = await getBinanceKlines(
            binanceSymbol,
            interval,
            limit
          );

          if (binanceData && binanceData.length > 0) {
            const prices = binanceData.map((kline) => [
              parseInt(kline[0]), // timestamp
              parseFloat(kline[4]), // close price
            ]);

            result[coinId] = {
              prices,
              market_caps: [],
              total_volumes: [],
              source: "binance",
            };
          } else {
            // 两个来源都没有数据
            result[coinId] = {
              prices: [],
              market_caps: [],
              total_volumes: [],
              error: "No price data available from any source",
            };
          }
        } catch (error) {
          console.error(`Error fetching data for ${coinId}:`, error);
          result[coinId] = {
            prices: [],
            market_caps: [],
            total_volumes: [],
            error: error.message,
          };
        }
      })
    );

    return result;
  } catch (error) {
    console.error("Failed to fetch historical price data:", error);
    // 返回空数据对象，避免整个应用崩溃
    coinIdArray.forEach((coinId) => {
      result[coinId] = {
        prices: [],
        market_caps: [],
        total_volumes: [],
        error: error.message,
      };
    });
    return result;
  }
};

/**
 * 获取特定时间的历史价格
 * @param {string} coinId - 加密货币ID
 * @param {number|Date} timestamp - 时间戳或日期对象
 * @returns {Promise<number|null>} - 返回价格或null
 */
export const getHistoricalPrice = async (coinId, timestamp) => {
  // 确保timestamp是毫秒时间戳
  const tsInMs =
    timestamp instanceof Date
      ? timestamp.getTime()
      : typeof timestamp === "number"
      ? timestamp
      : new Date(timestamp).getTime();

  // 转换为秒时间戳，因为CoinGecko API使用秒
  const tsInSec = Math.floor(tsInMs / 1000);

  try {
    console.log(
      `Fetching historical price for coin: ${coinId}, timestamp: ${new Date(
        tsInMs
      ).toISOString()}`
    );

    // 检查缓存
    const cacheKey = `${coinId}_${tsInSec}`;
    // 这里实现了简单的内存缓存，实际项目中可能需要更复杂的缓存机制
    if (window._priceCache && window._priceCache[cacheKey]) {
      console.log("Retrieved price from cache");
      return window._priceCache[cacheKey];
    }

    // 计算日期差异，决定使用哪个API
    const now = Date.now();
    const diffInDays = (now - tsInMs) / (1000 * 60 * 60 * 24);

    // 获取代币符号信息
    const coinInfo = await fetchCoinGeckoProxy(
      `coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );

    if (!coinInfo || !coinInfo.symbol) {
      throw new Error("Failed to get coin symbol information");
    }

    const symbol = coinInfo.symbol.toUpperCase();
    const binanceSymbol = `${symbol}USDT`;

    // 尝试从Binance获取历史价格
    if (diffInDays <= 30) {
      try {
        // 将日期转换为合适的区间
        const interval = diffInDays <= 1 ? "1h" : diffInDays <= 7 ? "4h" : "1d";
        const limit =
          Math.ceil(diffInDays) *
            (interval === "1h" ? 24 : interval === "4h" ? 6 : 1) +
          5;

        const klines = await getBinanceKlines(binanceSymbol, interval, limit);

        if (klines && klines.length > 0) {
          // 找到最接近的时间点
          let closestKline = klines[0];
          let minDiff = Math.abs(parseInt(klines[0][0]) - tsInMs);

          for (let i = 1; i < klines.length; i++) {
            const diff = Math.abs(parseInt(klines[i][0]) - tsInMs);
            if (diff < minDiff) {
              minDiff = diff;
              closestKline = klines[i];
            }
          }

          const price = parseFloat(closestKline[4]); // 收盘价

          // 缓存结果
          if (!window._priceCache) window._priceCache = {};
          window._priceCache[cacheKey] = price;

          return price;
        }
      } catch (error) {
        console.warn(
          "Failed to get Binance historical price, falling back to CoinGecko",
          error
        );
      }
    }

    // Binance数据不可用或时间太久远，使用CoinGecko API
    // 决定使用哪个CoinGecko端点
    if (diffInDays <= 30) {
      // 过去30天用hourly数据
      const hourlyData = await fetchCoinGeckoProxy(
        `coins/${coinId}/market_chart?vs_currency=usd&days=${Math.ceil(
          diffInDays
        )}&interval=hourly`
      );

      if (hourlyData && hourlyData.prices && hourlyData.prices.length > 0) {
        // 找到最接近的时间点
        const closestPrice = findClosestPrice(hourlyData.prices, tsInMs);

        // 缓存结果
        if (!window._priceCache) window._priceCache = {};
        window._priceCache[cacheKey] = closestPrice;

        return closestPrice;
      }
    } else {
      // 过去30天以上用daily数据
      const dailyData = await fetchCoinGeckoProxy(
        `coins/${coinId}/market_chart?vs_currency=usd&days=${Math.min(
          Math.ceil(diffInDays),
          365
        )}&interval=daily`
      );

      if (dailyData && dailyData.prices && dailyData.prices.length > 0) {
        // 找到最接近的时间点
        const closestPrice = findClosestPrice(dailyData.prices, tsInMs);

        // 缓存结果
        if (!window._priceCache) window._priceCache = {};
        window._priceCache[cacheKey] = closestPrice;

        return closestPrice;
      }
    }

    // 如果在CoinGecko也找不到数据，尝试估算历史价格
    console.warn("Could not find exact historical price, trying estimation");
    return await estimateHistoricalPrice(coinId, tsInMs);
  } catch (error) {
    console.error("Failed to fetch historical price:", error);
    // 如果所有API都失败，尝试估算价格
    try {
      return await estimateHistoricalPrice(coinId, tsInMs);
    } catch (estError) {
      console.error("Failed to estimate historical price:", estError);
      return null;
    }
  }
};

/**
 * 找到最接近指定时间戳的价格
 * @param {Array} prices - 价格数组，格式 [[timestamp, price], ...]
 * @param {number} targetTimestamp - 目标时间戳
 * @returns {number} - 最接近的价格
 */
function findClosestPrice(prices, targetTimestamp) {
  if (!prices || !prices.length) return null;

  let closestPrice = prices[0][1];
  let minDiff = Math.abs(prices[0][0] - targetTimestamp);

  for (let i = 1; i < prices.length; i++) {
    const diff = Math.abs(prices[i][0] - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closestPrice = prices[i][1];
    }
  }

  return closestPrice;
}

/**
 * 估算历史价格（当无法获取确切价格时）
 * @param {string} coinId - 加密货币ID
 * @param {number} timestamp - 时间戳
 * @returns {Promise<number|null>} 估算的价格
 */
async function estimateHistoricalPrice(coinId, timestamp) {
  try {
    // 获取当前价格
    const coinDetails = await getCryptocurrencyDetails(coinId);
    if (!coinDetails || !coinDetails.current_price) return null;

    const currentPrice = coinDetails.current_price;
    const now = Date.now();
    const timeDiff = now - timestamp;

    // 基于时间差异应用不同的随机因子
    // 越接近当前时间，估算越接近当前价格
    let randomFactorRange;

    if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
      // 7天内
      randomFactorRange = 0.1; // 价格在±10%范围内波动
    } else if (timeDiff < 30 * 24 * 60 * 60 * 1000) {
      // 30天内
      randomFactorRange = 0.2; // 价格在±20%范围内波动
    } else if (timeDiff < 90 * 24 * 60 * 60 * 1000) {
      // 90天内
      randomFactorRange = 0.3; // 价格在±30%范围内波动
    } else {
      // 更早
      randomFactorRange = 0.5; // 价格在±50%范围内波动
    }

    // 生成随机因子
    const randomFactor =
      1 - randomFactorRange + Math.random() * randomFactorRange * 2;

    // 应用随机因子估算价格
    const estimatedPrice = currentPrice * randomFactor;

    return estimatedPrice;
  } catch (error) {
    console.error("Failed to estimate historical price:", error);
    return null;
  }
}
