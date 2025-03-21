import { NextResponse } from "next/server";

/**
 * CoinGecko API 代理，解决 CORS 问题
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
  if (apiKey) {
    searchParams.set("x_cg_demo_api_key", apiKey);
  }

  // 构建新的 URL 参数字符串
  const paramsString = Array.from(searchParams.entries())
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  // 构建完整的 API URL
  const apiUrl = `https://api.coingecko.com/api/v3/${endpoint}${
    paramsString ? `?${paramsString}` : ""
  }`;

  try {
    console.log(`Proxying CoinGecko request to: ${apiUrl}`);

    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    const headers = {
      Accept: "application/json",
      "User-Agent": "CryptoCost/1.0 (https://coin-cost.vercel.app/)",
    };

    // 添加 API Key 到请求头中
    if (apiKey) {
      headers["x-cg-demo-api-key"] = apiKey;
    }

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
          .replace(/x_cg_demo_api_key=[^&]+/, "x_cg_demo_api_key=REDACTED"), // 隐藏API密钥
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
    return NextResponse.json(data);
  } catch (error) {
    const isTimeout = error.name === "AbortError";
    const statusCode = isTimeout ? 504 : 500;

    const errorInfo = {
      error: isTimeout ? "CoinGecko API timeout" : "CoinGecko API proxy error",
      timestamp: new Date().toISOString(),
      endpoint,
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      url: apiUrl
        ?.replace(/api_key=[^&]+/, "api_key=REDACTED")
        .replace(/x_cg_demo_api_key=[^&]+/, "x_cg_demo_api_key=REDACTED"), // 隐藏API密钥
    };

    console.error("CoinGecko API proxy error:", errorInfo);

    return NextResponse.json(errorInfo, { status: statusCode });
  }
}
