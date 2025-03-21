import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { kv } from "@vercel/kv";

// 尝试初始化KV存储，如果不可用则使用内存缓存
let kvStore;
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kvStore = kv;
  } else if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    kvStore = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.warn("Failed to initialize KV store:", error);
}

// 内存缓存（备用方案）
const memoryCache = {
  data: new Map(),
  set: async (key, value, ttl) => {
    memoryCache.data.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
    return true;
  },
  get: async (key) => {
    const item = memoryCache.data.get(key);
    if (!item) return null;
    if (item.expires < Date.now()) {
      memoryCache.data.delete(key);
      return null;
    }
    return item.value;
  },
};

// 使用可用的缓存存储
const cache = kvStore || memoryCache;

// 请求计数器
let requestCount = 0;
let requestResetTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 8; // 保守估计，防止触发CoinGecko限制

/**
 * CoinGecko API 代理，解决 CORS 问题并添加缓存层
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    console.error("CoinGecko API proxy error: Missing endpoint parameter");
    return NextResponse.json(
      {
        error: "Missing endpoint parameter",
        timestamp: new Date().toISOString(),
        details: "API请求需要提供endpoint参数",
      },
      { status: 400 }
    );
  }

  // 删除 endpoint 参数
  searchParams.delete("endpoint");

  // 添加 API key 如果环境变量中存在
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

  // 构建新的 URL 参数字符串
  const paramsString = Array.from(searchParams.entries())
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  // 确定使用哪个API版本
  let apiUrl;
  let headers = {
    Accept: "application/json",
    "User-Agent": "CryptoCost/1.0 (https://coin-cost.vercel.app/)",
  };

  // 如果有API key，则使用专业版API
  if (apiKey) {
    apiUrl = `https://pro-api.coingecko.com/api/v3/${endpoint}${
      paramsString ? `?${paramsString}` : ""
    }`;
    headers["x-cg-pro-api-key"] = apiKey;
    console.log("Using CoinGecko Pro API with API key");
  } else {
    // 否则使用免费版API
    apiUrl = `https://api.coingecko.com/api/v3/${endpoint}${
      paramsString ? `?${paramsString}` : ""
    }`;
    console.log("Using CoinGecko free API (no API key)");
  }

  // 缓存键 - 区分Pro和免费版本
  const cacheKey = `coingecko:${
    apiKey ? "pro:" : ""
  }${endpoint}:${paramsString}`;

  // 确定缓存时间 (秒)
  let cacheTTL = 300; // 默认5分钟

  // 不同端点使用不同的缓存时间
  if (endpoint.includes("market_chart")) {
    cacheTTL = 1800; // 历史数据缓存30分钟
  } else if (endpoint.includes("coins/markets")) {
    cacheTTL = 300; // 市场数据缓存5分钟
  } else if (endpoint.includes("search")) {
    cacheTTL = 3600; // 搜索结果缓存1小时
  } else if (endpoint.includes("coins/") && endpoint.includes("?")) {
    cacheTTL = 600; // 币种详情缓存10分钟
  }

  try {
    // 检查缓存
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log(`Returning cached data for: ${endpoint}`);
      return NextResponse.json(cachedData);
    }

    // 检查请求速率限制
    const now = Date.now();
    if (now - requestResetTime > 60000) {
      requestCount = 0;
      requestResetTime = now;
    }

    // 只对免费版API进行速率限制
    if (!apiKey && requestCount >= MAX_REQUESTS_PER_MINUTE) {
      console.warn("API请求频率已达上限，等待下一分钟");
      const timeToWait = 60000 - (now - requestResetTime) + 1000;
      await new Promise((resolve) => setTimeout(resolve, timeToWait));
      requestCount = 0;
      requestResetTime = Date.now();
    }

    // 仅当使用免费版API时增加计数
    if (!apiKey) {
      requestCount++;
    }

    console.log(
      `Proxying CoinGecko request to: ${apiUrl.replace(
        /x-cg-pro-api-key=[^&]+/,
        "x-cg-pro-api-key=REDACTED"
      )} (request ${requestCount} this minute)`
    );

    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers,
    });

    // 清除超时
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!response.ok) {
      const errorContent = isJson
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

      // 429错误（请求过多）需要特殊处理
      if (response.status === 429) {
        console.error("CoinGecko API rate limit exceeded");

        // 如果是没有API key的情况，重置计数器并强制等待
        if (!apiKey) {
          requestCount = MAX_REQUESTS_PER_MINUTE;
        }

        // 尝试返回缓存数据（即使是过期的）
        const staleData = await cache.get(`stale:${cacheKey}`);
        if (staleData) {
          return NextResponse.json({
            ...staleData,
            _fromStaleCache: true,
          });
        }
      }

      const errorInfo = {
        error: `CoinGecko API error: ${response.status}`,
        status: response.status,
        statusText: response.statusText,
        contentType,
        timestamp: new Date().toISOString(),
        endpoint,
        details: errorContent || "未能获取错误详情",
        url: apiUrl
          .replace(/api_key=[^&]+/, "api_key=REDACTED")
          .replace(/x-cg-pro-api-key=[^&]+/, "x-cg-pro-api-key=REDACTED"), // 隐藏API密钥
      };

      console.error("CoinGecko API error:", errorInfo);

      return NextResponse.json(errorInfo, { status: response.status });
    }

    if (!isJson) {
      console.error(`CoinGecko API returned non-JSON content: ${contentType}`);
      return NextResponse.json(
        {
          error: "Invalid content type",
          contentType,
          timestamp: new Date().toISOString(),
          endpoint,
          details: "API返回的内容类型不是JSON",
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    // 添加元数据
    const dataWithMeta = {
      ...data,
      _cached: false,
      _cachedUntil: new Date(Date.now() + cacheTTL * 1000).toISOString(),
    };

    // 处理coins/markets和类似的列表响应，确保始终返回数组
    if (
      endpoint.includes("coins/markets") ||
      (endpoint.includes("search") && dataWithMeta.coins)
    ) {
      // 确保返回的是数组
      if (!Array.isArray(dataWithMeta)) {
        // 如果API直接返回数组，保持原样
        if (Array.isArray(data)) {
          const wrappedData = [...data];
          wrappedData._cached = false;
          wrappedData._cachedUntil = new Date(
            Date.now() + cacheTTL * 1000
          ).toISOString();

          // 保存到缓存
          await cache.set(cacheKey, wrappedData, cacheTTL);
          // 同时保存一份长期的"过期缓存"用于应急
          await cache.set(`stale:${cacheKey}`, wrappedData, 86400); // 保存24小时

          return NextResponse.json(wrappedData);
        }

        // 如果是search endpoint，提取coins数组
        if (endpoint.includes("search") && Array.isArray(dataWithMeta.coins)) {
          dataWithMeta.data = dataWithMeta.coins;
        } else {
          // 否则包装在data字段中
          dataWithMeta.data = Array.isArray(data) ? data : [];
        }
      }
    }

    // 保存到缓存
    await cache.set(cacheKey, dataWithMeta, cacheTTL);

    // 同时保存一份长期的"过期缓存"用于应急
    await cache.set(`stale:${cacheKey}`, dataWithMeta, 86400); // 保存24小时

    return NextResponse.json(dataWithMeta);
  } catch (error) {
    const isTimeout = error.name === "AbortError";
    const statusCode = isTimeout ? 504 : 500;

    console.error("CoinGecko API proxy error:", error);

    // 尝试返回缓存数据（即使是过期的）
    try {
      const staleData = await cache.get(`stale:${cacheKey}`);
      if (staleData) {
        return NextResponse.json({
          ...staleData,
          _fromStaleCache: true,
          _error: error.message,
        });
      }
    } catch (cacheError) {
      console.error("Failed to retrieve stale cache:", cacheError);
    }

    const errorInfo = {
      error: isTimeout ? "CoinGecko API timeout" : "CoinGecko API proxy error",
      timestamp: new Date().toISOString(),
      endpoint,
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      url: apiUrl
        ?.replace(/api_key=[^&]+/, "api_key=REDACTED")
        .replace(/x-cg-pro-api-key=[^&]+/, "x-cg-pro-api-key=REDACTED"), // 隐藏API密钥
    };

    return NextResponse.json(errorInfo, { status: statusCode });
  }
}
