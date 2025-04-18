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

interface LocationTransactionListProps {
  limit?: number;
  showFilters?: boolean;
}

export function LocationTransactionList({ limit = 10, showFilters = true }: LocationTransactionListProps) {
  const { settings } = useUserSettings();
  const { location: gpsLocation, loading: gpsLoading } = useGPSLocation();
  const [timeframe, setTimeframe] = useState<number>(30); // Last 30 days by default
  const [showOnlyCurrentLocation, setShowOnlyCurrentLocation] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [convertedTransactions, setConvertedTransactions] = useState<Transaction[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  
  // Get the base currency from user settings
  const baseCurrency = settings?.baseCurrency || "USD";
  
  // Calculate date range based on timeframe
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - timeframe);
  
  // Use transactions hook with filters
  const { transactions, loading, error } = useTransactions({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: limit * 5, // Fetch more to group by location
    sortBy: "date",
    sortOrder: "desc",
    // Filter by location if user has selected to show only current location
    search: showOnlyCurrentLocation && gpsLocation ? gpsLocation.country : undefined
  });
  
  // Group transactions by location
  const [locationGroups, setLocationGroups] = useState<{[key: string]: Transaction[]}>({});
  
  useEffect(() => {
    const groups: {[key: string]: Transaction[]} = {};
    
    if (transactions.length > 0) {
      transactions.forEach(transaction => {
        if (!transaction.location?.country) return;
        
        // Use country name as the key
        const locationKey = transaction.location.country || 'unknown';
        if (!groups[locationKey]) {
          groups[locationKey] = [];
        }
        
        groups[locationKey].push(transaction);
      });
    }
    
    // Sort groups by transaction count (most active locations first)
    const sortedGroups: {[key: string]: Transaction[]} = {};
    Object.keys(groups)
      .sort((a, b) => groups[b].length - groups[a].length)
      .forEach(key => {
        sortedGroups[key] = groups[key];
      });
    
    setLocationGroups(sortedGroups);
  }, [transactions]);
  
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
      if (transactions.length === 0) return;
      
      setLoadingRates(true);
      
      try {
        // Get unique currencies from transactions
        const uniqueCurrencies = Array.from(
          new Set(transactions.map(t => t.currency).filter(c => c !== baseCurrency))
        );
        
        if (uniqueCurrencies.length === 0) {
          setConvertedTransactions(transactions);
          setLoadingRates(false);
          return;
        }
        
        // Create a rates object
        const rates: Record<string, number> = {};
        
        // Fetch rates for each unique currency
        await Promise.all(
          uniqueCurrencies.map(async (currency) => {
            try {
              const rate = await getExchangeRate(currency, baseCurrency);
              rates[currency] = rate;
            } catch (error) {
              console.error(`Error fetching rate for ${currency}:`, error);
              // Fallback to static rates
              if (baseCurrency === 'USD') {
                rates[currency] = 1 / FALLBACK_RATES[currency];
              } else if (currency === 'USD') {
                rates[currency] = FALLBACK_RATES[baseCurrency];
              } else {
                // Convert through USD as intermediary
                rates[currency] = FALLBACK_RATES[baseCurrency] / FALLBACK_RATES[currency];
              }
            }
          })
        );
        
        setExchangeRates(rates);
        
        // Convert transactions
        const converted = transactions.map(transaction => {
          if (transaction.currency === baseCurrency) {
            return { ...transaction, convertedAmount: transaction.amount };
          }
          
          const rate = rates[transaction.currency] || 1;
          return {
            ...transaction,
            convertedAmount: transaction.amount * rate
          };
        });
        
        setConvertedTransactions(converted);
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
        // Just use original transactions if rates can't be fetched
        setConvertedTransactions(transactions);
      } finally {
        setLoadingRates(false);
      }
    };
    
    fetchRates();
  }, [transactions, baseCurrency]);
  
  const timeframes = [
    { label: "7d", value: 7 },
    { label: "30d", value: 30 },
    { label: "90d", value: 90 },
    { label: "1y", value: 365 },
  ];

  // Calculate totals using converted amounts
  const calculateTotal = (txs: Transaction[]): number => {
    return txs.reduce((sum, tx) => {
      // Use converted amount if available
      const amount = tx.convertedAmount !== undefined ? tx.convertedAmount : tx.amount;
      return sum + (amount || 0);
    }, 0);
  };
  
  // Count transactions that have been converted
  const getConvertedCount = (txs: Transaction[]): number => {
    return txs.filter(tx => 
      tx.convertedAmount !== undefined && tx.currency !== baseCurrency
    ).length;
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Spending by Location</CardTitle>
            <CardDescription>
              Transaction history by country
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
              
              {gpsLocation && (
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
      
      <CardContent className="pb-4">
        {loading || loadingRates ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="ml-2">{loading ? "Loading transactions..." : "Converting currencies..."}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            <p>Error loading transaction data</p>
          </div>
        ) : Object.keys(locationGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No transactions with location data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add transactions with location information to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(locationGroups).map(([locationKey, locationTransactions]) => {
              const location = locationTransactions[0].location!;
              // Use country name for comparison
              const isCurrentLocation = gpsLocation && locationKey === gpsLocation.country;
              
              // Filter transactions that have been converted to match with the dashboard
              const convertedLocationTxs = convertedTransactions.filter(tx => 
                locationTransactions.some(locTx => locTx._id === tx._id)
              );
              
              const totalSpent = calculateTotal(convertedLocationTxs);
              
              return (
                <div key={locationKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-full ${isCurrentLocation ? 'bg-blue-500' : 'bg-slate-500'}`}>
                        <MapPin className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="font-medium flex items-center">
                        {location.country}
                        {isCurrentLocation && (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4">
                            Current
                          </Badge>
                        )}
                      </h3>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {locationTransactions.length} transactions
                    </div>
                  </div>
                  
                  <div className="border rounded-md divide-y">
                    {locationTransactions.slice(0, limit).map((transaction) => {
                      const CategoryIcon = getCategoryIcon(transaction.category);
                      
                      // Find the converted transaction
                      const convertedTx = convertedTransactions.find(tx => tx._id === transaction._id) || transaction;
                      const isConverted = convertedTx.convertedAmount !== undefined && transaction.currency !== baseCurrency;
                      
                      return (
                        <div 
                          key={transaction._id} 
                          className="p-2 text-sm flex items-center justify-between hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{transaction.description}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                {new Date(transaction.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                                {transaction.location?.city && (
                                  <span title={`${transaction.location?.city}, ${transaction.location?.country}`}>
                                    • <MapPin className="h-2.5 w-2.5 inline text-muted-foreground" /> {transaction.location?.city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className={transaction.amount < 0 ? "text-red-500" : "text-green-500"}>
                              {isConverted && (
                                <>
                                  {formatCurrency(convertedTx.convertedAmount || 0, baseCurrency)}
                                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                                    ≈ {formatCurrency(transaction.amount, transaction.currency)}
                                  </div>
                                </>
                              )}
                              {!isConverted && (
                                formatCurrency(transaction.amount, transaction.currency)
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {locationTransactions.length > limit && (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        + {locationTransactions.length - limit} more transactions
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-sm px-2">
                    <span className="text-muted-foreground">Total in {baseCurrency}:</span>
                    <span className={totalSpent < 0 ? "text-red-500" : "text-green-500"}>
                      {formatCurrency(totalSpent, baseCurrency)}
                    </span>
                  </div>
                  
                  {/* Show conversion summary */}
                  <div className="text-xs text-muted-foreground px-2 mt-1">
                    {getConvertedCount(convertedLocationTxs)} of {locationTransactions.length} transactions converted to {baseCurrency}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 