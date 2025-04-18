"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { CURRENCIES, getExchangeRate, formatCurrency, FALLBACK_RATES } from "@/lib/currency";
import useUserSettings from "@/hooks/use-user-settings";

export function CurrencyConverter() {
  const { settings } = useUserSettings();
  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState<string>("");
  const [toCurrency, setToCurrency] = useState<string>("");
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set initial currencies based on user settings
  useEffect(() => {
    if (settings?.baseCurrency) {
      setFromCurrency(settings.baseCurrency);
      // Set 'to' currency to something different than base
      const defaultToCurrency = settings.baseCurrency === "USD" ? "EUR" : "USD";
      setToCurrency(defaultToCurrency);
    } else {
      setFromCurrency("USD");
      setToCurrency("EUR");
    }
  }, [settings]);
  
  // Auto-convert when currencies or amount changes
  useEffect(() => {
    if (fromCurrency && toCurrency && amount) {
      handleConvert();
    }
  }, [fromCurrency, toCurrency, amount]);
  
  const handleConvert = async () => {
    if (!fromCurrency || !toCurrency || !amount) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get exchange rate
      const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);
      setRate(exchangeRate);
      
      // Calculate result
      const convertedAmount = amount * exchangeRate;
      setResult(convertedAmount);
    } catch (error) {
      console.error("Error converting currency:", error);
      setError("Failed to get exchange rate. Using fallback rates.");
      
      // Fallback to static rates
      let fallbackRate;
      if (fromCurrency === 'USD') {
        fallbackRate = FALLBACK_RATES[toCurrency];
      } else if (toCurrency === 'USD') {
        fallbackRate = 1 / FALLBACK_RATES[fromCurrency];
      } else {
        // Convert through USD
        fallbackRate = FALLBACK_RATES[toCurrency] / FALLBACK_RATES[fromCurrency];
      }
      
      setRate(fallbackRate);
      setResult(amount * fallbackRate);
    } finally {
      setLoading(false);
    }
  };
  
  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Currency Converter</CardTitle>
        <CardDescription>Convert between world currencies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            placeholder="Enter amount"
            min={0}
          />
        </div>
        
        <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
          <Select value={fromCurrency} onValueChange={setFromCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="From" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={swapCurrencies}
            className="rounded-full"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
          
          <Select value={toCurrency} onValueChange={setToCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="To" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {result !== null && (
          <div className="mt-4 rounded-lg bg-muted p-3">
            <div className="text-sm text-muted-foreground">Result</div>
            <div className="text-2xl font-bold">
              {formatCurrency(result, toCurrency)}
            </div>
            {rate && (
              <div className="text-xs text-muted-foreground mt-1">
                1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
              </div>
            )}
            {error && (
              <div className="text-xs text-amber-500 mt-1">
                {error}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          {loading ? (
            <span className="flex items-center">
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              Updating rates...
            </span>
          ) : (
            "Rates updated just now"
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleConvert} disabled={loading}>
          {loading ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : "Refresh"}
        </Button>
      </CardFooter>
    </Card>
  );
} 