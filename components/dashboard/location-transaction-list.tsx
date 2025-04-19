"use client";

import { useState, useEffect, useMemo } from "react";
import { useGPSLocation } from "@/hooks/use-gps-location";
import useTransactions, { Transaction } from "@/hooks/use-transactions";
import useUserSettings from "@/hooks/use-user-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ArrowUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency as formatCurrencyUtil, FALLBACK_RATES, getExchangeRate } from "@/lib/currency";
import { getCategoryIcon } from "@/lib/transactionCategories";
import { createLocationObject } from "@/lib/location";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LocationTransactionListProps {
  limit?: number;
  showFilters?: boolean;
  transactions: Transaction[];
  gpsLocation?: { country: string; city?: string } | null;
  baseCurrency: string;
  loading?: boolean;
  error?: boolean;
}

interface LocationSummary {
  expenses: number;
  income: number;
  transactions: Transaction[];
}

interface ConvertedTransaction extends Transaction {
  convertedAmount?: number;
}

interface TimeframeOption {
  label: string;
  value: number;
  days: number;
}

const timeframes: TimeframeOption[] = [
  { label: "7D", value: 7, days: 7 },
  { label: "30D", value: 30, days: 30 },
  { label: "90D", value: 90, days: 90 },
  { label: "1Y", value: 365, days: 365 },
];

export function LocationTransactionList({
  limit = 10,
  showFilters = true,
  transactions,
  gpsLocation,
  baseCurrency,
  loading,
  error
}: LocationTransactionListProps) {
  const { settings } = useUserSettings();
  const { location: gpsLocationFromHook, loading: gpsLoading } = useGPSLocation();
  const [timeframe, setTimeframe] = useState<number>(30);
  const [locationGroups, setLocationGroups] = useState<{[key: string]: LocationSummary}>({});
  const [convertedTransactions, setConvertedTransactions] = useState<ConvertedTransaction[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [showOnlyCurrentLocation, setShowOnlyCurrentLocation] = useState(false);

  // Get the base currency from user settings
  const baseCurrencyFromSettings = settings?.baseCurrency || "USD";
  
  // Calculate date range based on timeframe
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - timeframe);
  
  // Use transactions hook with filters
  const { transactions: transactionsFromHook, loading: transactionsLoading, error: transactionsError } = useTransactions({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: limit * 5, // Fetch more to group by location
    sortBy: "date",
    sortOrder: "desc",
    // Filter by location if user has selected to show only current location
    search: showOnlyCurrentLocation && gpsLocationFromHook ? gpsLocationFromHook.country : undefined
  });
  
  // Filter transactions by timeframe and group by location
  useEffect(() => {
    if (!transactionsFromHook?.length) return;

    const now = new Date();
    const filteredTransactions = transactionsFromHook.filter(tx => {
      const txDate = new Date(tx.date);
      const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= timeframe;
    });

    const groups = filteredTransactions.reduce<{[key: string]: LocationSummary}>((acc, tx) => {
      if (!tx.location?.country) return acc;
      
      const key = tx.location.country;
      if (!acc[key]) {
        acc[key] = {
          expenses: 0,
          income: 0,
          transactions: []
        };
      }
      
      const convertedTx = convertedTransactions.find(ct => ct._id === tx._id);
      const amount = convertedTx?.convertedAmount || tx.amount;
      
      if (amount < 0) {
        acc[key].expenses += Math.abs(amount);
      } else {
        acc[key].income += amount;
      }
      
      acc[key].transactions.push(tx);
      return acc;
    }, {});

    setLocationGroups(groups);
  }, [transactionsFromHook, timeframe, convertedTransactions]);
  
  // Format currency with the right symbol (using the dashboard's logic)
  const formatCurrency = (amount: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    const needsSpace = ['Fr', 'R', 'zł', 'RM', 'Rp', 'Col$', 'Mex$', 'S$', 'C$', 'A$', 'NZ$', 'HK$'];
    const formattedSymbol = needsSpace.includes(symbol) ? `${symbol} ` : symbol;
    return `${amount < 0 ? '-' : ''}${formattedSymbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Get currency symbol from currency code
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
  
  // Fetch exchange rates and convert transaction amounts (using dashboard's approach)
  useEffect(() => {
    const fetchRates = async () => {
      if (transactionsFromHook.length === 0) return;
      
      setLoadingRates(true);
      
      try {
        // Get unique currencies from transactions
        const uniqueCurrencies = Array.from(
          new Set(transactionsFromHook.map(t => t.currency).filter(c => c !== baseCurrencyFromSettings))
        );
        
        if (uniqueCurrencies.length === 0) {
          setConvertedTransactions(transactionsFromHook);
          setLoadingRates(false);
          return;
        }
        
        // Create a rates object
        const rates: Record<string, number> = {};
        
        // Fetch rates for each unique currency
        await Promise.all(
          uniqueCurrencies.map(async (currency) => {
            try {
              const rate = await getExchangeRate(currency, baseCurrencyFromSettings);
              rates[currency] = rate;
            } catch (error) {
              console.error(`Error fetching rate for ${currency}:`, error);
              // Fallback to static rates
              if (baseCurrencyFromSettings === 'USD') {
                rates[currency] = 1 / FALLBACK_RATES[currency];
              } else if (currency === 'USD') {
                rates[currency] = FALLBACK_RATES[baseCurrencyFromSettings];
              } else {
                // Convert through USD as intermediary
                rates[currency] = FALLBACK_RATES[baseCurrencyFromSettings] / FALLBACK_RATES[currency];
              }
            }
          })
        );
        
        setConvertedTransactions(transactionsFromHook.map(transaction => {
          if (transaction.currency === baseCurrencyFromSettings) {
            return { ...transaction, convertedAmount: transaction.amount };
          }
          
          const rate = rates[transaction.currency] || 1;
          return {
            ...transaction,
            convertedAmount: transaction.amount * rate
          };
        }));
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
        // Just use original transactions if rates can't be fetched
        setConvertedTransactions(transactionsFromHook);
      } finally {
        setLoadingRates(false);
      }
    };
    
    fetchRates();
  }, [transactionsFromHook, baseCurrencyFromSettings]);
  
  // Calculate totals using converted amounts
  const calculateTotal = (txs: Transaction[]): number => {
    return txs.reduce((sum, tx) => {
      // Use converted amount if available
      const amount = tx.convertedAmount !== undefined ? tx.convertedAmount : tx.amount;
      return sum + (amount || 0);
    }, 0);
  };
  
  if (loading || loadingRates) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        Error loading transactions. Please try again.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Spending by Location</CardTitle>
            <CardDescription>
              Transaction history and analysis by country
            </CardDescription>
          </div>
          
          {showFilters && (
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border overflow-hidden">
                {timeframes.map((tf) => (
                  <Button
                    key={tf.value}
                    variant={timeframe === tf.value ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none border-0 h-8 px-3"
                    onClick={() => setTimeframe(tf.value)}
                  >
                    {tf.label}
                  </Button>
                ))}
              </div>
              
              {gpsLocationFromHook && (
                <Button
                  variant={showOnlyCurrentLocation ? "default" : "outline"}
                  size="sm"
                  className="gap-1 h-8"
                  onClick={() => setShowOnlyCurrentLocation(!showOnlyCurrentLocation)}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Current Location</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {Object.keys(locationGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No transactions with location data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add transactions with location information to see them here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(locationGroups)
              .filter(([key]) => !showOnlyCurrentLocation || key === gpsLocationFromHook?.country)
              .map(([locationKey, locationData]) => {
                const location = locationData.transactions[0].location!;
                const isCurrentLocation = gpsLocationFromHook && locationKey === gpsLocationFromHook.country;
                
                // Calculate totals in base currency for this specific location
                const locationTransactions = convertedTransactions.filter(tx => 
                  tx.location?.country === locationKey
                );
                
                const totalExpenses = Math.abs(calculateTotal(
                  locationTransactions.filter(tx => tx.amount < 0)
                ));
                const totalIncome = calculateTotal(
                  locationTransactions.filter(tx => tx.amount > 0)
                );
                
                return (
                  <div key={locationKey} className="p-4 space-y-4">
                    {/* Location Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isCurrentLocation ? 'bg-primary' : 'bg-muted'}`}>
                          <MapPin className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {location.country}
                            {isCurrentLocation && (
                              <Badge variant="secondary" className="font-normal">
                                Current
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {locationData.transactions.length} transactions
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {/* Expenses Summary */}
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 space-y-1">
                        <div className="text-sm text-red-600 dark:text-red-400">Total Expenses</div>
                        <div className="text-lg font-semibold text-red-700 dark:text-red-300">
                          {formatCurrency(totalExpenses, baseCurrencyFromSettings)}
                        </div>
                      </div>

                      {/* Income Summary */}
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 space-y-1">
                        <div className="text-sm text-green-600 dark:text-green-400">Total Income</div>
                        <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                          {formatCurrency(totalIncome, baseCurrencyFromSettings)}
                        </div>
                      </div>
                    </div>

                    {/* Transactions List */}
                    <div className="space-y-2">
                      {locationData.transactions.slice(0, limit).map((transaction) => {
                        const CategoryIcon = getCategoryIcon(transaction.category);
                        const convertedTx = convertedTransactions.find(tx => tx._id === transaction._id) || transaction;
                        const isConverted = convertedTx.convertedAmount !== undefined && transaction.currency !== baseCurrencyFromSettings;
                        
                        return (
                          <div 
                            key={transaction._id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-full ${transaction.amount < 0 ? 'bg-red-100 dark:bg-red-950/50' : 'bg-green-100 dark:bg-green-950/50'}`}>
                                <CategoryIcon className={`h-3.5 w-3.5 ${transaction.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                              </div>
                              <div>
                                <div className="font-medium">{transaction.description}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  {new Date(transaction.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                  {transaction.location?.city && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-2.5 w-2.5" />
                                      {transaction.location?.city}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className={`text-right ${transaction.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {isConverted ? (
                                <>
                                  <div>{formatCurrency(convertedTx.convertedAmount || 0, baseCurrencyFromSettings)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatCurrency(transaction.amount, transaction.currency)}
                                  </div>
                                </>
                              ) : (
                                formatCurrency(transaction.amount, transaction.currency)
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {locationData.transactions.length > limit && (
                      <div className="text-center">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                          + {locationData.transactions.length - limit} more transactions
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 