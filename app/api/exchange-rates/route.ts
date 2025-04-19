import { NextResponse } from 'next/server';

const EXCHANGE_API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from and to currencies' },
        { status: 400 }
      );
    }

    // Fetch the latest rates for the base currency
    const response = await fetch(`${EXCHANGE_API_BASE_URL}/${from}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data = await response.json();
    
    // Get the exchange rate for the target currency
    const rate = data.rates[to];

    if (!rate) {
      return NextResponse.json(
        { error: 'Exchange rate not found for the specified currencies' },
        { status: 404 }
      );
    }

    // Return the exchange rate
    return NextResponse.json({
      from,
      to,
      rate,
      timestamp: data.time_last_updated
    });

  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}

// Add rate limiting and caching headers
export const runtime = 'edge';
export const revalidate = 3600; // Cache for 1 hour 