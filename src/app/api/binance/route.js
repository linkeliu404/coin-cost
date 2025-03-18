import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
    console.log(`Fetching Binance data for symbol: ${symbol}`);

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Binance API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Binance API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data || !data.lastPrice) {
      console.error("Invalid Binance API response:", data);
      return NextResponse.json(
        { error: "Invalid Binance API response" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Binance API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Binance data" },
      { status: 500 }
    );
  }
}
