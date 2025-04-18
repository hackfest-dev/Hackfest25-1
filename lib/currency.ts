import axios from 'axios';

// Use our internal API route instead of external API
const API_BASE_URL = '/api/exchange-rates';

// Base URL for the ExchangeRate API - using a more reliable free API
const API_KEY = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY || '';

// Interface for currency with country information
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  countries: string[];
  flag?: string;
}

// Interface for country with currency
export interface CountryData {
  name: string;
  code: string;
  currency: string;
  flag: string;
  continent?: string;
}

// Interface for exchange rate data
export interface ExchangeRateData {
  base: string;
  date: string;
  rates: {
    [key: string]: number;
  };
  success: boolean;
  timestamp: number;
}

// Interface for time series data
export interface TimeSeriesData {
  base: string;
  start_date: string;
  end_date: string;
  rates: {
    [date: string]: {
      [currency: string]: number;
    };
  };
  success: boolean;
  timeseries: boolean;
}

// Static fallback exchange rates (when API is unavailable)
export const FALLBACK_RATES: { [key: string]: number } = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.77,
  JPY: 150.25,
  THB: 35.27,
  CAD: 1.36,
  AUD: 1.52,
  SGD: 1.35,
  MXN: 17.54,
  INR: 83.12,
  CNY: 7.23,
  HKD: 7.82,
  CHF: 0.89,
  BRL: 5.15,
  ZAR: 18.82,
  VND: 24850,
  IDR: 15750,
  MYR: 4.72,
  PHP: 57.50,
  NZD: 1.67,
  TRY: 32.15,
  AED: 3.67,
  COP: 3950,
  PLN: 3.95,
  RUB: 91.20,
};

// Currency symbols for formatting
export const CURRENCY_SYMBOLS: { [key: string]: string } = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥", 
  THB: "฿",
  CAD: "C$",
  AUD: "A$",
  SGD: "S$",
  MXN: "Mex$",
  INR: "₹",
  CNY: "¥",
  HKD: "HK$",
  CHF: "Fr",
  BRL: "R$",
  ZAR: "R",
  VND: "₫",
  IDR: "Rp",
  MYR: "RM",
  PHP: "₱",
  NZD: "NZ$",
  TRY: "₺",
  AED: "د.إ",
  COP: "Col$",
  PLN: "zł",
  RUB: "₽",
};

// Popular currencies with country information
export const CURRENCIES: Currency[] = [
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    countries: ["United States", "Panama", "Ecuador", "El Salvador"],
    flag: "🇺🇸",
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    countries: ["Germany", "France", "Italy", "Spain", "Portugal", "Netherlands"],
    flag: "🇪🇺",
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    countries: ["United Kingdom"],
    flag: "🇬🇧",
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    countries: ["Japan"],
    flag: "🇯🇵",
  },
  {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    countries: ["Thailand"],
    flag: "🇹🇭",
  },
  {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    countries: ["Singapore"],
    flag: "🇸🇬",
  },
  {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "Mex$",
    countries: ["Mexico"],
    flag: "🇲🇽",
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    countries: ["Canada"],
    flag: "🇨🇦",
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    countries: ["Australia"],
    flag: "🇦🇺",
  },
  {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    countries: ["India"],
    flag: "🇮🇳",
  },
  {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    countries: ["China"],
    flag: "🇨🇳",
  },
  {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    countries: ["Vietnam"],
    flag: "🇻🇳",
  },
  {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    countries: ["Indonesia"],
    flag: "🇮🇩",
  },
  {
    code: "MYR",
    name: "Malaysian Ringgit",
    symbol: "RM",
    countries: ["Malaysia"],
    flag: "🇲🇾",
  },
  {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    countries: ["Philippines"],
    flag: "🇵🇭",
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    countries: ["United Arab Emirates"],
    flag: "🇦🇪",
  },
  {
    code: "COP",
    name: "Colombian Peso",
    symbol: "Col$",
    countries: ["Colombia"],
    flag: "🇨🇴",
  },
];

// Country to currency code mapping
export const COUNTRY_TO_CURRENCY: { [countryCode: string]: string } = {
  US: "USD", // United States
  PA: "USD", // Panama
  EC: "USD", // Ecuador
  SV: "USD", // El Salvador
  
  DE: "EUR", // Germany
  FR: "EUR", // France
  IT: "EUR", // Italy
  ES: "EUR", // Spain
  PT: "EUR", // Portugal
  NL: "EUR", // Netherlands
  BE: "EUR", // Belgium
  AT: "EUR", // Austria
  GR: "EUR", // Greece
  
  GB: "GBP", // United Kingdom
  JP: "JPY", // Japan
  TH: "THB", // Thailand
  SG: "SGD", // Singapore
  MX: "MXN", // Mexico
  CA: "CAD", // Canada
  AU: "AUD", // Australia
  IN: "INR", // India
  CN: "CNY", // China
  VN: "VND", // Vietnam
  ID: "IDR", // Indonesia
  MY: "MYR", // Malaysia
  PH: "PHP", // Philippines
  AE: "AED", // United Arab Emirates
  CO: "COP", // Colombia
};

// Popular digital nomad destinations
export const NOMAD_DESTINATIONS: CountryData[] = [
  { name: "Bali", code: "ID", currency: "IDR", flag: "🇮🇩", continent: "Asia" },
  { name: "Chiang Mai", code: "TH", currency: "THB", flag: "🇹🇭", continent: "Asia" },
  { name: "Lisbon", code: "PT", currency: "EUR", flag: "🇵🇹", continent: "Europe" },
  { name: "Mexico City", code: "MX", currency: "MXN", flag: "🇲🇽", continent: "North America" },
  { name: "Medellin", code: "CO", currency: "COP", flag: "🇨🇴", continent: "South America" },
  { name: "Ho Chi Minh City", code: "VN", currency: "VND", flag: "🇻🇳", continent: "Asia" },
  { name: "Kuala Lumpur", code: "MY", currency: "MYR", flag: "🇲🇾", continent: "Asia" },
  { name: "Budapest", code: "HU", currency: "HUF", flag: "🇭🇺", continent: "Europe" },
  { name: "Prague", code: "CZ", currency: "CZK", flag: "🇨🇿", continent: "Europe" },
  { name: "Berlin", code: "DE", currency: "EUR", flag: "🇩🇪", continent: "Europe" },
];

/**
 * Get latest exchange rates with a specific base currency
 */
export const getLatestRates = async (baseCurrency: string = 'USD'): Promise<ExchangeRateData> => {
  try {
    // Try primary API first
    const response = await axios.get(`${API_BASE_URL}/latest/${baseCurrency}`);
    return {
      base: baseCurrency,
      date: new Date().toISOString().split('T')[0],
      rates: response.data.rates,
      success: true,
      timestamp: Math.floor(Date.now() / 1000)
    };
  } catch (error) {
    console.error('Error fetching from primary API, trying backup API:', error);
    
    try {
      // Try backup API
      const backupResponse = await axios.get(`https://api.exchangerate.host/latest?base=${baseCurrency}`);
      return backupResponse.data;
    } catch (backupError) {
      console.error('Error fetching from backup API, using fallback rates:', backupError);
      // Only use fallback rates if both APIs fail
      return {
        base: baseCurrency,
        date: new Date().toISOString().split('T')[0],
        rates: convertRatesFromUSD(baseCurrency),
        success: true,
        timestamp: Math.floor(Date.now() / 1000)
      };
    }
  }
};

/**
 * Convert fallback rates based on a different currency than USD
 */
const convertRatesFromUSD = (baseCurrency: string): { [key: string]: number } => {
  // If base is USD, return fallback rates directly
  if (baseCurrency === 'USD') {
    return FALLBACK_RATES;
  }
  
  // Get the USD to base currency rate
  const usdToBase = FALLBACK_RATES[baseCurrency] || 1;
  
  // Convert all rates relative to the new base
  const convertedRates: { [key: string]: number } = {};
  for (const [currency, rate] of Object.entries(FALLBACK_RATES)) {
    convertedRates[currency] = rate / usdToBase;
  }
  
  // Make sure base currency has rate of 1
  convertedRates[baseCurrency] = 1;
  
  return convertedRates;
};

/**
 * Get exchange rate between two currencies using our API route
 */
export const getExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number> => {
  try {
    const response = await axios.get(API_BASE_URL, {
      params: {
        from: fromCurrency,
        to: toCurrency
      }
    });
    return response.data.conversion_rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Fallback to static rates if API fails
    if (fromCurrency === 'USD') {
      return FALLBACK_RATES[toCurrency];
    } else if (toCurrency === 'USD') {
      return 1 / FALLBACK_RATES[fromCurrency];
    } else {
      // Convert through USD
      return FALLBACK_RATES[toCurrency] / FALLBACK_RATES[fromCurrency];
    }
  }
};

/**
 * Convert an amount from one currency to another using our API route
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  try {
    const response = await axios.get(API_BASE_URL, {
      params: {
        from: fromCurrency,
        to: toCurrency,
        amount
      }
    });
    return response.data.conversion_result;
  } catch (error) {
    console.error('Error converting currency:', error);
    // Use fallback rates if API fails
    if (fromCurrency === 'USD') {
      return amount * FALLBACK_RATES[toCurrency];
    } else if (toCurrency === 'USD') {
      return amount / FALLBACK_RATES[fromCurrency];
    } else {
      // Convert through USD
      const amountInUSD = amount / FALLBACK_RATES[fromCurrency];
      return amountInUSD * FALLBACK_RATES[toCurrency];
    }
  }
};

/**
 * Get historical exchange rates for a time period using live data
 */
export const getTimeSeriesRates = async (
  startDate: string,
  endDate: string,
  baseCurrency: string = 'USD',
  symbols: string[] = []
): Promise<TimeSeriesData> => {
  try {
    // Try primary API first
    const response = await axios.get(
      `${API_BASE_URL}/timeframe/${startDate}/${endDate}/${baseCurrency}`
    );
    
    return {
      base: baseCurrency,
      start_date: startDate,
      end_date: endDate,
      rates: response.data.rates,
      success: true,
      timeseries: true
    };
  } catch (error) {
    console.error('Error fetching time series from primary API, trying backup:', error);
    
    try {
      // Try backup API
      const backupUrl = new URL('https://api.exchangerate.host/timeseries');
      backupUrl.searchParams.append('start_date', startDate);
      backupUrl.searchParams.append('end_date', endDate);
      backupUrl.searchParams.append('base', baseCurrency);
      
      if (symbols.length > 0) {
        backupUrl.searchParams.append('symbols', symbols.join(','));
      }
      
      const backupResponse = await axios.get(backupUrl.toString());
      return backupResponse.data;
    } catch (backupError) {
      console.error('Error fetching time series from backup API:', backupError);
      throw backupError;
    }
  }
};

/**
 * Get supported currency list
 */
export const getSupportedCurrencies = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/symbols`);
    return Object.keys(response.data.symbols);
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    return Object.keys(FALLBACK_RATES); // Fallback to static list
  }
};

/**
 * Get currency symbol for displaying amounts
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

/**
 * Format currency with proper symbol and decimals
 */
export const formatCurrency = (amount: number, currencyCode: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${amount < 0 ? '-' : ''}${symbol}${Math.abs(amount).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Get currency information by code
 */
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find(currency => currency.code === code);
};

/**
 * Get currency for a country
 */
export const getCurrencyForCountry = (countryCode: string): string => {
  return COUNTRY_TO_CURRENCY[countryCode] || 'USD';
};

// Keep the rate cache implementation
const rateCache: {
  [key: string]: {
    rate: number;
    timestamp: number;
  };
} = {};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached exchange rate or fetch new one
 */
export const getCachedExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number> => {
  const cacheKey = `${fromCurrency}-${toCurrency}`;
  const now = Date.now();
  
  // Check cache first
  if (rateCache[cacheKey] && (now - rateCache[cacheKey].timestamp) < CACHE_DURATION) {
    return rateCache[cacheKey].rate;
  }
  
  // Fetch new rate
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  
  // Update cache
  rateCache[cacheKey] = {
    rate,
    timestamp: now
  };
  
  return rate;
};

// Function to get currency insights from Gemini AI
export const getCurrencyInsights = async (currencyCode: string, baseCurrency: string): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Missing Gemini API key");
    return "Currency insights unavailable. Add NEXT_PUBLIC_GEMINI_API_KEY to your environment variables.";
  }
  
  const prompt = `
    Provide a detailed analysis of the ${currencyCode} currency compared to ${baseCurrency}.
    Include the following information:
    1. Current strengths and weaknesses of ${currencyCode}
    2. Recent trends and fluctuations in the past 30 days
    3. Key economic factors affecting this currency
    4. Brief forecast for the next 3 months
    5. Digital nomad considerations when using this currency
    
    Format the response in structured paragraphs with clear headings.
  `;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected response structure from Gemini API");
    }
  } catch (error) {
    console.error("Error getting currency insights:", error);
    return "Unable to retrieve currency insights at this time. Please try again later.";
  }
};

// Function to get currency volatility insights from Gemini AI
export const getVolatileCurrencies = async (baseCurrency: string): Promise<{ code: string, name: string, volatility: number }[]> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Missing Gemini API key");
    // Return fallback data
    return [
      { code: "THB", name: "Thai Baht", volatility: 4.2 },
      { code: "MXN", name: "Mexican Peso", volatility: 3.7 },
      { code: "TRY", name: "Turkish Lira", volatility: 3.5 }
    ];
  }
  
  // Check for cached data first
  try {
    const cachedData = localStorage.getItem(`volatile_currencies_${baseCurrency}`);
    const cachedTimestamp = localStorage.getItem(`volatile_currencies_${baseCurrency}_timestamp`);
    
    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      const cacheAge = now - timestamp;
      
      // Use cached data if it's less than 1 hour old
      if (cacheAge < 3600000) {
        return JSON.parse(cachedData);
      }
    }
  } catch (error) {
    console.error("Error accessing localStorage:", error);
  }
  
  const prompt = `
    Based on current market data and economic trends, provide the top 3 most volatile currencies against ${baseCurrency} over the last 30 days.
    For each currency, include:
    1. Currency code (e.g., EUR, JPY)
    2. Full currency name
    3. Estimated volatility as a percentage
    
    Format the response as valid JSON in this exact structure:
    [
      {"code": "XXX", "name": "Full Name", "volatility": 0.0},
      {"code": "YYY", "name": "Full Name", "volatility": 0.0},
      {"code": "ZZZ", "name": "Full Name", "volatility": 0.0}
    ]
    
    Don't include any explanatory text before or after the JSON. Return only the JSON array.
  `;
  
  try {
    // Add a delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
      const jsonText = data.candidates[0].content.parts[0].text.trim();
      const result = JSON.parse(jsonText);
      
      // Cache the result
      try {
        localStorage.setItem(`volatile_currencies_${baseCurrency}`, JSON.stringify(result));
        localStorage.setItem(`volatile_currencies_${baseCurrency}_timestamp`, Date.now().toString());
      } catch (error) {
        console.error("Error caching volatile currencies:", error);
      }
      
      return result;
    } else {
      throw new Error("Unexpected response structure from Gemini API");
    }
  } catch (error) {
    console.error("Error getting volatile currencies:", error);
    // Fallback to static data
    return [
      { code: "THB", name: "Thai Baht", volatility: 4.2 },
      { code: "MXN", name: "Mexican Peso", volatility: 3.7 },
      { code: "TRY", name: "Turkish Lira", volatility: 3.5 }
    ];
  }
};

// Function to get best travel currency recommendations from Gemini AI
export const getBestTravelCurrency = async (baseCurrency: string): Promise<{ 
  country: string, 
  currency: string, 
  code: string,
  advantage: number, 
  flag: string 
}> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Missing Gemini API key");
    // Return fallback data
    return {
      country: "Thailand",
      currency: "Thai Baht",
      code: "THB",
      advantage: 12,
      flag: "🇹🇭"
    };
  }
  
  const prompt = `
    Based on current exchange rates, economic trends, and travel costs, what is the best currency destination for someone with ${baseCurrency} to travel to right now?
    Consider:
    1. Recent currency strength/weakness against ${baseCurrency}
    2. Cost of living in the country
    3. Digital nomad friendliness
    
    Format the response as valid JSON in this exact structure:
    {
      "country": "Country Name",
      "currency": "Currency Name",
      "code": "3-letter code",
      "advantage": percentage advantage compared to last year (just the number),
      "flag": "flag emoji"
    }
    
    Don't include any explanatory text before or after the JSON. Return only the JSON object.
  `;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
      const jsonText = data.candidates[0].content.parts[0].text.trim();
      const result = JSON.parse(jsonText);
      return result;
    } else {
      throw new Error("Unexpected response structure from Gemini API");
    }
  } catch (error) {
    console.error("Error getting best travel currency:", error);
    // Fallback to static data
    return {
      country: "Thailand",
      currency: "Thai Baht",
      code: "THB",
      advantage: 12,
      flag: "🇹🇭"
    };
  }
};

// Function to get currency health metrics from Gemini AI
export const getCurrencyHealthMetrics = async (currencies: string[]): Promise<Array<{
  code: string;
  flag: string;
  stability: "Stable" | "Moderate" | "Volatile";
  score: number;
  color: "green" | "yellow" | "red";
}>> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Missing Gemini API key");
    // Return fallback data
    return [
      { code: "EUR", flag: "🇪🇺", stability: "Stable", score: 85, color: "green" },
      { code: "GBP", flag: "🇬🇧", stability: "Moderate", score: 60, color: "yellow" },
      { code: "JPY", flag: "🇯🇵", stability: "Stable", score: 80, color: "green" },
      { code: "MXN", flag: "🇲🇽", stability: "Moderate", score: 50, color: "yellow" },
      { code: "TRY", flag: "🇹🇷", stability: "Volatile", score: 25, color: "red" }
    ];
  }
  
  const prompt = `
    Provide a currency health analysis for these currencies: ${currencies.join(", ")}.
    For each currency, assess:
    1. Overall stability
    2. Recent volatility
    3. Economic factors affecting the currency
    
    Format the response as valid JSON in this exact structure:
    [
      {
        "code": "XXX",
        "flag": "flag emoji",
        "stability": "Stable" or "Moderate" or "Volatile",
        "score": stability score (1-100),
        "color": "green" for stable, "yellow" for moderate, "red" for volatile
      },
      ...etc for each currency
    ]
    
    Don't include any explanatory text before or after the JSON. Return only the JSON array.
  `;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
      const jsonText = data.candidates[0].content.parts[0].text.trim();
      const result = JSON.parse(jsonText);
      return result;
    } else {
      throw new Error("Unexpected response structure from Gemini API");
    }
  } catch (error) {
    console.error("Error getting currency health metrics:", error);
    // Fallback to static data
    return [
      { code: "EUR", flag: "🇪🇺", stability: "Stable", score: 85, color: "green" },
      { code: "GBP", flag: "🇬🇧", stability: "Moderate", score: 60, color: "yellow" },
      { code: "JPY", flag: "🇯🇵", stability: "Stable", score: 80, color: "green" },
      { code: "MXN", flag: "🇲🇽", stability: "Moderate", score: 50, color: "yellow" },
      { code: "TRY", flag: "🇹🇷", stability: "Volatile", score: 25, color: "red" }
    ];
  }
};

// Function to get economic indicators from Gemini AI
export const getEconomicIndicators = async (currency: string): Promise<{
  interestRate: string;
  inflation: string;
  gdpGrowth: string;
  tradeBalance: string;
}> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Missing Gemini API key");
    // Return fallback data
    return {
      interestRate: currency === "USD" ? "5.25%" : currency === "EUR" ? "4.00%" : "3.50%",
      inflation: currency === "USD" ? "3.4%" : currency === "EUR" ? "2.8%" : "4.2%",
      gdpGrowth: currency === "USD" ? "2.8%" : currency === "EUR" ? "0.3%" : "2.1%",
      tradeBalance: currency === "USD" ? "-$62.2B" : currency === "EUR" ? "+€28.7B" : "-$5.2B"
    };
  }
  
  const prompt = `
    Provide the current key economic indicators for the country or region that uses ${currency} as its currency.
    Include:
    1. Current central bank interest rate
    2. Current inflation rate
    3. Latest GDP growth rate (year-over-year)
    4. Latest trade balance figure with the currency symbol
    
    Format the response as valid JSON in this exact structure:
    {
      "interestRate": "X.XX%",
      "inflation": "X.X%",
      "gdpGrowth": "X.X%",
      "tradeBalance": "+$XXB" or "-$XXB" (with appropriate currency symbol)
    }
    
    Don't include any explanatory text before or after the JSON. Return only the JSON object.
  `;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
      const jsonText = data.candidates[0].content.parts[0].text.trim();
      const result = JSON.parse(jsonText);
      return result;
    } else {
      throw new Error("Unexpected response structure from Gemini API");
    }
  } catch (error) {
    console.error("Error getting economic indicators:", error);
    // Return fallback data
    return {
      interestRate: currency === "USD" ? "5.25%" : currency === "EUR" ? "4.00%" : "3.50%",
      inflation: currency === "USD" ? "3.4%" : currency === "EUR" ? "2.8%" : "4.2%",
      gdpGrowth: currency === "USD" ? "2.8%" : currency === "EUR" ? "0.3%" : "2.1%",
      tradeBalance: currency === "USD" ? "-$62.2B" : currency === "EUR" ? "+€28.7B" : "-$5.2B"
    };
  }
}; 