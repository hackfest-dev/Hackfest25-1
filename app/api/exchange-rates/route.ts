import { NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';
const API_KEY = process.env.EXCHANGE_RATE_API_KEY || '';

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
    // Get the conversion rate first
    const response = await axios.get(
      `${API_BASE_URL}/${API_KEY}/latest/${from}`
    );

    if (response.data.result === "success") {
      const rate = response.data.conversion_rates[to];
      
      if (!rate) {
        throw new Error(`No conversion rate found for ${to}`);
      }

      return NextResponse.json({
        conversion_rate: rate,
        conversion_result: amount ? rate * Number(amount) : rate,
        base_code: from,
        target_code: to,
        time_last_update_utc: response.data.time_last_update_utc
      });
    } else {
      throw new Error('API request failed');
    }
  } catch (error) {
    console.error('Error fetching from primary API, trying backup:', error);
    
    try {
      // Try backup API
      const backupUrl = new URL('https://api.exchangerate.host/convert');
      backupUrl.searchParams.append('from', from);
      backupUrl.searchParams.append('to', to);
      if (amount) {
        backupUrl.searchParams.append('amount', amount);
      }
      
      const backupResponse = await axios.get(backupUrl.toString());
      return NextResponse.json({
        conversion_rate: backupResponse.data.result,
        conversion_result: amount ? backupResponse.data.result * Number(amount) : backupResponse.data.result,
        base_code: from,
        target_code: to,
        time_last_update_utc: new Date().toUTCString()
      });
    } catch (backupError) {
      console.error('Error fetching from backup API:', backupError);
      return NextResponse.json(
        { error: 'Failed to fetch exchange rates' },
        { status: 500 }
      );
    }
  }
} 