import { NextResponse } from "next/server";

/**
 * Binance API 代理 - 使用公共端点
 * 此端点现在作为备用方案存在，主要使用前端直接调用公共API
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const endpoint = searchParams.get("endpoint") || "ticker/price"; // 默认获取价格
  const interval = searchParams.get("interval");
  const limit = searchParams.get("limit");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
    console.log(
      `Fetching Binance data for symbol: ${symbol}, endpoint: ${endpoint}`
    );

    // 构建基础URL
    let url = `https://api1.binance.com/api/v3/${endpoint}?symbol=${symbol}`;

    // 添加可选参数
    if (interval) url += `&interval=${interval}`;
    if (limit) url += `&limit=${limit}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Binance API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Binance API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Binance API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Binance data", details: error.message },
      { status: 500 }
    );
  }
}
