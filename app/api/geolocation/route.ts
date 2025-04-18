import { NextResponse } from 'next/server';

// Cache for storing location data
const locationCache = new Map();

export async function GET() {
  try {
    // Try to get location from cache first
    const cacheKey = 'user-location';
    if (locationCache.has(cacheKey)) {
      return NextResponse.json(locationCache.get(cacheKey));
    }

    // Try multiple geolocation services
    let locationData = null;

    // Try ipinfo.io first (more reliable free service)
    try {
      const response = await fetch('https://ipinfo.io/json');
      if (response.ok) {
        const data = await response.json();
        const [lat, lon] = data.loc ? data.loc.split(',') : [0, 0];
        
        // Get country name from country code
        const countryName = getCountryName(data.country);
        
        locationData = {
          city: data.city || 'Unknown',
          country: countryName || 'Unknown',
          country_code: data.country || 'US',
          latitude: parseFloat(lat) || 0,
          longitude: parseFloat(lon) || 0,
          timezone: data.timezone || 'UTC',
          currency: getCurrencyFromCountry(data.country) || 'USD',
          currency_symbol: getCurrencySymbol(getCurrencyFromCountry(data.country) || 'USD')
        };
      }
    } catch (error) {
      console.log('ipinfo.io failed, trying fallback...');
    }

    // If first service failed, try a simple IP lookup
    if (!locationData) {
      try {
        const response = await fetch('https://api.db-ip.com/v2/free/self');
        if (response.ok) {
          const data = await response.json();
          locationData = {
            city: data.city || 'Unknown',
            country: data.countryName || 'Unknown',
            country_code: data.countryCode || 'US',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            timezone: 'UTC',
            currency: getCurrencyFromCountry(data.countryCode) || 'USD',
            currency_symbol: getCurrencySymbol(getCurrencyFromCountry(data.countryCode) || 'USD')
          };
        }
      } catch (error) {
        console.log('db-ip.com failed, using default location...');
      }
    }

    // If both services failed, use a default location
    if (!locationData) {
      locationData = {
        city: "Unknown",
        country: "United States",
        country_code: "US",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
        currency: "USD",
        currency_symbol: "$"
      };
    }

    // Cache the location data for 1 hour
    locationCache.set(cacheKey, locationData);
    setTimeout(() => locationCache.delete(cacheKey), 60 * 60 * 1000);

    return NextResponse.json(locationData);
  } catch (error) {
    console.error('Error in geolocation API:', error);
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

// Helper function to get country name from country code
function getCountryName(countryCode: string): string {
  const countryNames: { [key: string]: string } = {
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
    IT: 'Italy',
    ES: 'Spain',
    JP: 'Japan',
    CN: 'China',
    IN: 'India',
    BR: 'Brazil',
    RU: 'Russia',
    KR: 'South Korea',
    MX: 'Mexico',
    ID: 'Indonesia',
    NL: 'Netherlands',
    TR: 'Turkey',
    SA: 'Saudi Arabia',
    CH: 'Switzerland',
    AR: 'Argentina',
    SE: 'Sweden',
    PL: 'Poland',
    BE: 'Belgium',
    TH: 'Thailand',
    IR: 'Iran',
    AT: 'Austria',
    NO: 'Norway',
    AE: 'United Arab Emirates',
    IL: 'Israel',
    VN: 'Vietnam',
    MY: 'Malaysia',
    HK: 'Hong Kong',
    PH: 'Philippines',
    SG: 'Singapore',
    DK: 'Denmark',
    FI: 'Finland',
    CL: 'Chile',
    ZA: 'South Africa',
    RO: 'Romania',
    PK: 'Pakistan',
    GR: 'Greece',
    CZ: 'Czech Republic',
    PT: 'Portugal',
    IE: 'Ireland',
    HU: 'Hungary',
    SK: 'Slovakia',
    EG: 'Egypt',
    QA: 'Qatar',
    PE: 'Peru',
    NZ: 'New Zealand',
    CO: 'Colombia',
    UA: 'Ukraine',
    DZ: 'Algeria',
    MA: 'Morocco',
    KW: 'Kuwait',
    VE: 'Venezuela',
    EC: 'Ecuador',
    CR: 'Costa Rica',
    PA: 'Panama',
    GT: 'Guatemala',
    CU: 'Cuba',
    BO: 'Bolivia',
    DO: 'Dominican Republic',
    HN: 'Honduras',
    PY: 'Paraguay',
    SV: 'El Salvador',
    NI: 'Nicaragua',
    PR: 'Puerto Rico',
    UY: 'Uruguay',
    JM: 'Jamaica',
    TT: 'Trinidad and Tobago',
    BS: 'Bahamas',
    BB: 'Barbados',
    LC: 'Saint Lucia',
    GD: 'Grenada',
    VC: 'Saint Vincent and the Grenadines',
    AG: 'Antigua and Barbuda',
    DM: 'Dominica',
    KN: 'Saint Kitts and Nevis',
    AI: 'Anguilla',
    VG: 'British Virgin Islands',
    KY: 'Cayman Islands',
    BM: 'Bermuda',
    MS: 'Montserrat',
    TC: 'Turks and Caicos Islands',
    AW: 'Aruba',
    CW: 'Curaçao',
    SX: 'Sint Maarten',
    BQ: 'Bonaire, Sint Eustatius and Saba',
    GL: 'Greenland',
    PM: 'Saint Pierre and Miquelon',
    MF: 'Saint Martin',
    BL: 'Saint Barthélemy',
    WF: 'Wallis and Futuna',
    PF: 'French Polynesia',
    NC: 'New Caledonia',
    TF: 'French Southern Territories',
    YT: 'Mayotte',
    RE: 'Réunion',
    MQ: 'Martinique',
    GP: 'Guadeloupe',
    GF: 'French Guiana',
    SR: 'Suriname',
    GY: 'Guyana'
  };
  return countryNames[countryCode] || 'Unknown';
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