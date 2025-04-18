import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Use reverse geocoding to get location details
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch location details');
    }

    const data = await response.json();
    
    // Extract relevant information
    const locationData = {
      city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
      country: data.address?.country || 'Unknown',
      country_code: data.address?.country_code?.toUpperCase() || 'US',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timezone: 'UTC', // We'll get this from the client
      currency: getCurrencyFromCountry(data.address?.country_code?.toUpperCase() || 'US'),
      currency_symbol: getCurrencySymbol(getCurrencyFromCountry(data.address?.country_code?.toUpperCase() || 'US'))
    };

    return NextResponse.json(locationData);
  } catch (error) {
    console.error('Error in GPS location API:', error);
    return NextResponse.json(
      { 
        city: "Unknown",
        country: "United States",
        country_code: "US",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
        currency: "USD",
        currency_symbol: "$"
      },
      { status: 200 }
    );
  }
}

// Helper function to get currency symbol
function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'Fr',
    CNY: '¥',
    NZD: 'NZ$',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    SGD: 'S$',
    HKD: 'HK$',
    KRW: '₩',
    RUB: '₽',
    TRY: '₺',
    BRL: 'R$',
    ZAR: 'R',
    MXN: 'Mex$',
    IDR: 'Rp',
    THB: '฿',
    MYR: 'RM',
    PHP: '₱',
    VND: '₫'
  };
  return symbols[currency] || currency;
}

// Helper function to get currency from country code
function getCurrencyFromCountry(countryCode: string): string {
  const countryToCurrency: { [key: string]: string } = {
    US: 'USD',
    GB: 'GBP',
    EU: 'EUR',
    JP: 'JPY',
    IN: 'INR',
    AU: 'AUD',
    CA: 'CAD',
    CH: 'CHF',
    CN: 'CNY',
    NZ: 'NZD',
    SE: 'SEK',
    NO: 'NOK',
    DK: 'DKK',
    SG: 'SGD',
    HK: 'HKD',
    KR: 'KRW',
    RU: 'RUB',
    TR: 'TRY',
    BR: 'BRL',
    ZA: 'ZAR',
    MX: 'MXN',
    ID: 'IDR',
    TH: 'THB',
    MY: 'MYR',
    PH: 'PHP',
    VN: 'VND'
  };
  return countryToCurrency[countryCode] || 'USD';
} 