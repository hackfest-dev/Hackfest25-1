"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  BarChart3, 
  ArrowLeftRight, 
  MapPin,
  Sparkles,
  Info,
  Loader2,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

import { CurrencyConverter } from "@/components/dashboard/currency-converter";
import { CurrencyList } from "@/components/dashboard/currency-list";
import useUserSettings from "@/hooks/use-user-settings";
import { 
  getCurrencyInsights, 
  getVolatileCurrencies, 
  getBestTravelCurrency,
  getCurrencyHealthMetrics,
  getEconomicIndicators
} from "@/lib/currency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CurrenciesPage() {
  const { settings } = useUserSettings();
  const [baseCurrency, setBaseCurrency] = useState<string>("USD"); // Default
  const [selectedCurrency, setSelectedCurrency] = useState<string>("EUR");
  const [apiLimitError, setApiLimitError] = useState<boolean>(false);
  
  // State for AI data
  const [currencyInsights, setCurrencyInsights] = useState<string>("");
  const [volatileCurrencies, setVolatileCurrencies] = useState<Array<{ code: string, name: string, volatility: number }>>([]);
  const [bestTravel, setBestTravel] = useState<{ country: string, currency: string, code: string, advantage: number, flag: string } | null>(null);
  const [currencyHealth, setCurrencyHealth] = useState<Array<{
    code: string;
    flag: string;
    stability: "Stable" | "Moderate" | "Volatile";
    score: number;
    color: "green" | "yellow" | "red";
  }>>([]);
  const [economicIndicators, setEconomicIndicators] = useState<{
    interestRate: string;
    inflation: string;
    gdpGrowth: string;
    tradeBalance: string;
  } | null>(null);
  
  // Loading states
  const [loadingInsights, setLoadingInsights] = useState<boolean>(false);
  const [loadingVolatile, setLoadingVolatile] = useState<boolean>(false);
  const [loadingBestTravel, setLoadingBestTravel] = useState<boolean>(false);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);
  const [loadingIndicators, setLoadingIndicators] = useState<boolean>(false);

  // Set base currency when settings load
  useEffect(() => {
    if (settings?.baseCurrency) {
      console.log("Setting base currency from user settings:", settings.baseCurrency);
      setBaseCurrency(settings.baseCurrency);
    }
  }, [settings]);

  // Fetch currency insights when selectedCurrency changes
  useEffect(() => {
    if (selectedCurrency) {
      fetchCurrencyInsights();
      fetchEconomicIndicators();
    }
  }, [selectedCurrency, baseCurrency]);

  // Initial data fetch - staggered to avoid rate limiting
  useEffect(() => {
    const fetchInitialData = async () => {
      // Reset API limit error
      setApiLimitError(false);
      
      try {
        // Fetch in sequence with longer delays between API calls
        await fetchVolatileCurrencies();
        // Add a longer delay between API calls (3 seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await fetchBestTravelCurrency();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await fetchCurrencyHealth();
      } catch (error) {
        if (error instanceof Error && error.message.includes('429')) {
          setApiLimitError(true);
          console.error("API rate limit exceeded. Using fallback data.");
        } else {
          console.error("Error loading initial data:", error);
        }
      }
    };
    
    fetchInitialData();
  }, [baseCurrency]);

  // Check for API errors and update state
  const handleApiError = (error: any) => {
    console.error("API error:", error);
    if (error instanceof Error && error.message.includes('429')) {
      setApiLimitError(true);
      return true;
    }
    return false;
  };

  // Fetch functions with error handling
  const fetchCurrencyInsights = async () => {
    if (loadingInsights) return; // Prevent duplicate calls
    
    setLoadingInsights(true);
    try {
      const insights = await getCurrencyInsights(selectedCurrency, baseCurrency);
      setCurrencyInsights(insights);
    } catch (error) {
      console.error('Error fetching currency insights:', error);
      const isRateLimited = handleApiError(error);
      if (!isRateLimited) {
        setCurrencyInsights("Unable to retrieve currency insights at this time. Please try again later.");
      }
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchVolatileCurrencies = async () => {
    if (loadingVolatile) return; // Prevent duplicate calls
    
    setLoadingVolatile(true);
    try {
      const volatile = await getVolatileCurrencies(baseCurrency);
      setVolatileCurrencies(volatile);
    } catch (error) {
      console.error('Error fetching volatile currencies:', error);
      handleApiError(error);
      // Fallback is handled in the API function
    } finally {
      setLoadingVolatile(false);
    }
  };

  const fetchBestTravelCurrency = async () => {
    if (loadingBestTravel) return; // Prevent duplicate calls
    
    setLoadingBestTravel(true);
    try {
      const best = await getBestTravelCurrency(baseCurrency);
      setBestTravel(best);
    } catch (error) {
      console.error('Error fetching best travel currency:', error);
      handleApiError(error);
      // Fallback is handled in the API function
    } finally {
      setLoadingBestTravel(false);
    }
  };

  const fetchCurrencyHealth = async () => {
    if (loadingHealth) return; // Prevent duplicate calls
    
    setLoadingHealth(true);
    try {
      const currencies = ["EUR", "GBP", "JPY", "MXN", "TRY"];
      const health = await getCurrencyHealthMetrics(currencies);
      setCurrencyHealth(health);
    } catch (error) {
      console.error('Error fetching currency health:', error);
      handleApiError(error);
      // Fallback is handled in the API function
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchEconomicIndicators = async () => {
    if (loadingIndicators) return; // Prevent duplicate calls
    
    setLoadingIndicators(true);
    try {
      const indicators = await getEconomicIndicators(selectedCurrency);
      setEconomicIndicators(indicators);
    } catch (error) {
      console.error('Error fetching economic indicators:', error);
      handleApiError(error);
      // Fallback is handled in the API function
    } finally {
      setLoadingIndicators(false);
    }
  };

  // Handle currency selection from the list
  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
  };

  // Update base currency and reset data
  const handleBaseCurrencyChange = (currency: string) => {
    setBaseCurrency(currency);
    // Data will refresh due to dependency in useEffect
  };

  // Refresh all data - with staggered requests
  const refreshAllData = async () => {
    // Reset API limit error
    setApiLimitError(false);
    
    try {
      // Fetch most important data first
      await fetchCurrencyInsights();
      // Add a small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fetchVolatileCurrencies();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fetchBestTravelCurrency();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fetchCurrencyHealth();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fetchEconomicIndicators();
    } catch (error) {
      handleApiError(error);
      console.error("Error refreshing data:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Currencies</h2>
          <p className="text-muted-foreground">
            Manage and track global currencies with live exchange rates
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Badge variant="outline" className="w-fit flex items-center gap-1 px-3 py-1.5">
          <Globe className="h-4 w-4" />
          <span>Base Currency: {baseCurrency}</span>
        </Badge>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshAllData}
            disabled={loadingInsights || loadingVolatile || loadingBestTravel || loadingHealth || loadingIndicators}
          >
            <RefreshCw className={`h-4 w-4 ${loadingInsights || loadingVolatile || loadingBestTravel || loadingHealth || loadingIndicators ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* API Rate Limit Warning */}
      {apiLimitError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Rate Limit Exceeded</AlertTitle>
          <AlertDescription>
            The Gemini AI API rate limit has been exceeded. Some features will use fallback data. 
            Please try again later or refresh individual sections.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="converter" className="space-y-4">
        <TabsList>
          <TabsTrigger value="converter" className="flex items-center gap-1.5">
            <ArrowLeftRight className="h-4 w-4" />
            <span>Converter</span>
          </TabsTrigger>
          <TabsTrigger value="currencies" className="flex items-center gap-1.5">
            <Globe className="h-4 w-4" />
            <span>Currency List</span>
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span>Exchange Rates</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="destinations" className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span>Destinations</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Currency Converter Tab */}
        <TabsContent value="converter">
          <div className="grid gap-6 md:grid-cols-2">
            <CurrencyConverter />
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Currency Insights</CardTitle>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => {
                      fetchVolatileCurrencies();
                      setTimeout(() => fetchBestTravelCurrency(), 1000); // Stagger the requests
                    }}
                    disabled={loadingVolatile || loadingBestTravel}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingVolatile || loadingBestTravel ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription>
                  Real-time smart tips and information about currencies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Currency Volatility</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Over the past 30 days, these currencies have shown the highest volatility against {baseCurrency}:
                  </p>
                  {loadingVolatile ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {volatileCurrencies.map((currency) => (
                        <div key={currency.code} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                            <Badge variant="outline">{currency.code}</Badge>
                            <span className="text-sm">{currency.name}</span>
                      </div>
                          <Badge variant="destructive">{`±${currency.volatility.toFixed(1)}%`}</Badge>
                    </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Best Currency for Your Next Trip</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Based on current exchange rates and travel costs:
                  </p>
                  {loadingBestTravel ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : bestTravel ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{bestTravel.flag}</span>
                      <div>
                          <div className="font-medium">{bestTravel.country}</div>
                          <div className="text-sm text-muted-foreground">
                            Your {baseCurrency} goes {bestTravel.advantage}% further than last year
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedCurrency(bestTravel.code)}>
                        Explore
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Unable to retrieve data at this time.
                  </div>
                  )}
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Currency Transfer Tips</h3>
                  <p className="text-sm text-muted-foreground">
                    For optimal currency exchange when traveling, consider using digital banks like Wise or Revolut to get better rates and avoid high ATM fees.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Currency List Tab */}
        <TabsContent value="currencies">
          <CurrencyList 
            baseCurrency={baseCurrency} 
            onCurrencySelect={(currency) => {
              handleBaseCurrencyChange(currency);
              handleCurrencySelect(currency);
            }} 
          />
        </TabsContent>
        
        {/* Exchange Rates Tab */}
        <TabsContent value="rates">
          <div className="grid gap-6 md:grid-cols-8">
            <Card className="md:col-span-5">
              <CardHeader>
                <CardTitle>Historical Exchange Rates</CardTitle>
                <CardDescription>
                  Track currency performance over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Interactive exchange rate chart coming soon</p>
                  <Button variant="outline">View Available Data</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle>Currency Health</CardTitle>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={fetchCurrencyHealth}
                    disabled={loadingHealth}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingHealth ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription>
                  Stability metrics for major currencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHealth ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                <div className="space-y-4">
                    {currencyHealth.map((currency) => (
                      <div key={currency.code} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                            <span>{currency.flag}</span>
                            <span>{currency.code}</span>
                      </div>
                          <div className={`text-${currency.color}-500`}>{currency.stability}</div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-${currency.color}-500`} 
                            style={{ width: `${currency.score}%` }} 
                          />
                        </div>
                    </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* AI Insights Tab */}
        <TabsContent value="insights">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:row-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>AI Currency Analysis: {selectedCurrency}</CardTitle>
                      </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={fetchCurrencyInsights}
                    disabled={loadingInsights}
                  >
                    {loadingInsights ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowLeftRight className="h-4 w-4" />
                    )}
                  </Button>
                    </div>
                <CardDescription>
                  Real-time currency analysis powered by Gemini AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInsights ? (
                  <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Analyzing currency data...</p>
                    </div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {currencyInsights.split('\n\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Popular Currency Pairs</CardTitle>
                <CardDescription>
                  Most frequently traded with {selectedCurrency}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["USD", "EUR", "GBP", "JPY", "CNY"].filter(c => c !== selectedCurrency).slice(0, 4).map((currency) => (
                    <Button 
                      key={currency}
                      variant="outline" 
                      className="w-full justify-between"
                      onClick={() => setSelectedCurrency(currency)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{
                          currency === "USD" ? "🇺🇸" :
                          currency === "EUR" ? "🇪🇺" :
                          currency === "GBP" ? "🇬🇧" :
                          currency === "JPY" ? "🇯🇵" :
                          currency === "CNY" ? "🇨🇳" : ""
                        }</span>
                        <span>{currency}</span>
                      </div>
                      <Badge variant="secondary">
                        View Analysis
                      </Badge>
                    </Button>
                  ))}
                    </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Economic Indicators</CardTitle>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={fetchEconomicIndicators}
                    disabled={loadingIndicators}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingIndicators ? 'animate-spin' : ''}`} />
                  </Button>
                    </div>
                <CardDescription>
                  Factors affecting {selectedCurrency}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingIndicators ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : economicIndicators ? (
                  <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                        <div>Interest Rate</div>
                        <div className="font-medium">{economicIndicators.interestRate}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <div>Inflation</div>
                          <div className="font-medium">{economicIndicators.inflation}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                          <div>GDP Growth</div>
                          <div className="font-medium">{economicIndicators.gdpGrowth}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <div>Trade Balance</div>
                          <div className="font-medium">{economicIndicators.tradeBalance}</div>
                        </div>
                    </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    Unable to retrieve economic data at this time.
                </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Nomad Destinations Tab */}
        <TabsContent value="destinations">
          <Card>
            <CardHeader>
              <CardTitle>Popular Digital Nomad Destinations</CardTitle>
              <CardDescription>
                Currency and cost of living information for popular nomad hubs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Destination Cards */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇹🇭</span>
                      <div>
                        <div className="font-medium">Chiang Mai, Thailand</div>
                        <div className="text-sm text-muted-foreground">THB</div>
                      </div>
                    </div>
                    <Badge variant="outline">30.6 THB = 1 USD</Badge>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Coworking</span>
                      <span className="font-medium">฿3,000/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>1BR Apartment</span>
                      <span className="font-medium">฿12,000/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Internet</span>
                      <span className="font-medium">300 Mbps</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Coffee</span>
                      <span className="font-medium">฿60</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Badge variant="secondary">Digital Nomad Friendly</Badge>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇵🇹</span>
                      <div>
                        <div className="font-medium">Lisbon, Portugal</div>
                        <div className="text-sm text-muted-foreground">EUR</div>
                      </div>
                    </div>
                    <Badge variant="outline">0.92 EUR = 1 USD</Badge>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Coworking</span>
                      <span className="font-medium">€150/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>1BR Apartment</span>
                      <span className="font-medium">€800/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Internet</span>
                      <span className="font-medium">500 Mbps</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Coffee</span>
                      <span className="font-medium">€1.80</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Badge variant="secondary">D7 Visa Available</Badge>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇲🇽</span>
                      <div>
                        <div className="font-medium">Mexico City, Mexico</div>
                        <div className="text-sm text-muted-foreground">MXN</div>
                      </div>
                    </div>
                    <Badge variant="outline">17.5 MXN = 1 USD</Badge>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Coworking</span>
                      <span className="font-medium">MX$2,800/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>1BR Apartment</span>
                      <span className="font-medium">MX$15,000/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Internet</span>
                      <span className="font-medium">200 Mbps</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Coffee</span>
                      <span className="font-medium">MX$45</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Badge variant="secondary">Temp. Resident Visa</Badge>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 