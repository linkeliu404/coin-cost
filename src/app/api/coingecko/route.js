import { NextResponse } from "next/server";

/**
 * CoinGecko API 代理，解决 CORS 问题
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  // 删除 endpoint 参数
  searchParams.delete("endpoint");

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

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CoinGecko API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `CoinGecko API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("CoinGecko API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch CoinGecko data" },
      { status: 500 }
    );
  }
}
