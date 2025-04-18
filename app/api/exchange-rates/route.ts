import { NextRequest, NextResponse } from 'next/server';
import { FALLBACK_RATES } from '@/lib/currency';

const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fromCurrency = searchParams.get('from');
  const toCurrency = searchParams.get('to');

  if (!fromCurrency || !toCurrency) {
    return NextResponse.json(
      { error: 'Missing from or to currency parameters' },
      { status: 400 }
    );
  }

  try {
    if (EXCHANGE_RATE_API_KEY) {
      // Try to get real-time rates if we have an API key
      const response = await fetch(
        `${API_BASE_URL}/${EXCHANGE_RATE_API_KEY}/pair/${fromCurrency}/${toCurrency}`
      );

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ rate: data.conversion_rate });
      }
    }

    // Fall back to static rates if API call fails or no API key
    if (fromCurrency === toCurrency) {
      return NextResponse.json({ rate: 1 });
    }

    // Calculate rate using USD as base
    if (fromCurrency === 'USD') {
      const rate = FALLBACK_RATES[toCurrency] || 1;
      return NextResponse.json({ rate });
    } 
    
    if (toCurrency === 'USD') {
      const rate = 1 / (FALLBACK_RATES[fromCurrency] || 1);
      return NextResponse.json({ rate });
    }

    // Convert through USD for other currency pairs
    const fromUSD = FALLBACK_RATES[fromCurrency] || 1;
    const toUSD = FALLBACK_RATES[toCurrency] || 1;
    const rate = toUSD / fromUSD;

    return NextResponse.json({ rate });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return NextResponse.json(
      { error: 'Failed to get exchange rate' },
      { status: 500 }
    );
  }
} 