import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { FALLBACK_RATES } from "@/lib/currency";

// Helper function to convert rates from USD to another base currency
const convertRatesFromUSD = (baseCurrency: string): { [key: string]: number } => {
  if (baseCurrency === 'USD') {
    return { ...FALLBACK_RATES };
  }
  
  const rates: { [key: string]: number } = {};
  const baseRate = FALLBACK_RATES[baseCurrency];
  
  if (!baseRate) {
    return { ...FALLBACK_RATES };
  }
  
  // Convert all rates to be based on the new base currency
  Object.keys(FALLBACK_RATES).forEach(currency => {
    rates[currency] = FALLBACK_RATES[currency] / baseRate;
  });
  
  return rates;
};

// Cache exchange rates for 24 hours
const CACHE_TTL = 60 * 60 * 24;
const EXCHANGE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseCurrency = searchParams.get("base") || "USD";
  
  try {
    // Check cache first
    const cacheKey = `exchange_rates:${baseCurrency}`;
    const cachedRates = await kv.get(cacheKey);
    
    if (cachedRates) {
      return NextResponse.json({ 
        base: baseCurrency, 
        rates: cachedRates,
        fromCache: true
      });
    }
    
    // Fetch fresh rates if not in cache
    const apiUrl = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${baseCurrency}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result !== "success") {
      throw new Error(`Failed to fetch exchange rates: ${data.error}`);
    }
    
    // Store in cache
    await kv.set(cacheKey, data.conversion_rates, { ex: CACHE_TTL });
    
    return NextResponse.json({
      base: baseCurrency,
      rates: data.conversion_rates,
      fromCache: false
    });
    
  } catch (error) {
    console.error("Exchange rate API error:", error);
    
    // Return fallback rates converted to the requested base currency
    return NextResponse.json({
      base: baseCurrency,
      rates: convertRatesFromUSD(baseCurrency),
      fallback: true
    }, { status: 200 });
  }
} 