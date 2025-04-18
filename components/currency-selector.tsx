"use client";

import React, { useState, useEffect } from "react";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CURRENCIES, 
  getCurrencySymbol, 
  formatCurrency,
  getExchangeRate
} from "@/lib/currency";

// Props interface for the currency selector component
interface CurrencySelectorProps {
  value?: string;
  onChange?: (currency: string) => void;
  showIcon?: boolean;
  showCountries?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Currency Selector Component
export function CurrencySelector({
  value = "USD",
  onChange,
  showIcon = true,
  showCountries = false,
  placeholder = "Select currency",
  className = "",
  disabled = false,
}: CurrencySelectorProps) {
  const handleChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  // Group currencies by continent for better organization
  const groupedCurrencies = CURRENCIES.reduce((groups: any, currency) => {
    if (currency.countries.length === 0) {
      if (!groups["Other"]) groups["Other"] = [];
      groups["Other"].push(currency);
    } else {
      const region = currency.countries[0] || "Other";
      if (!groups[region]) groups[region] = [];
      groups[region].push(currency);
    }
    return groups;
  }, {});

  const regions = Object.keys(groupedCurrencies).sort();

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className={`w-full ${className}`}>
        <SelectValue placeholder={placeholder}>
          {value && (
            <div className="flex items-center gap-2">
              {showIcon && (
                <span className="text-base">
                  {CURRENCIES.find(c => c.code === value)?.flag || ""}
                </span>
              )}
              <span>
                {value} {showIcon && `(${getCurrencySymbol(value)})`}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {regions.map(region => (
          <SelectGroup key={region}>
            <SelectLabel>{region}</SelectLabel>
            {groupedCurrencies[region].map((currency: any) => (
              <SelectItem key={currency.code} value={currency.code}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{currency.flag}</span>
                  <span>
                    {currency.code} ({currency.symbol})
                  </span>
                  {showCountries && currency.countries.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      - {currency.countries.join(", ")}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

// Props interface for the currency converter component
interface CurrencyConverterProps {
  baseCurrency?: string;
  onBaseCurrencyChange?: (currency: string) => void;
  className?: string;
}

// Currency Converter Component
export function CurrencyConverter({
  baseCurrency = "USD",
  onBaseCurrencyChange,
  className = "",
}: CurrencyConverterProps) {
  const [fromCurrency, setFromCurrency] = useState(baseCurrency);
  const [toCurrency, setToCurrency] = useState<string>("EUR");
  const [amount, setAmount] = useState<string>("100");
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (onBaseCurrencyChange) {
      onBaseCurrencyChange(fromCurrency);
    }
  }, [fromCurrency, onBaseCurrencyChange]);

  useEffect(() => {
    if (fromCurrency && toCurrency) {
      convertCurrencies();
    }
  }, [fromCurrency, toCurrency]);

  const convertCurrencies = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      setConvertedAmount(null);
      return;
    }

    setIsLoading(true);
    try {
      const rate = await getExchangeRate(fromCurrency, toCurrency);
      const result = parseFloat(amount) * rate;
      setExchangeRate(rate);
      setConvertedAmount(result);
    } catch (error) {
      console.error("Error converting currencies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleFromCurrencyChange = (currency: string) => {
    setFromCurrency(currency);
  };

  const handleToCurrencyChange = (currency: string) => {
    setToCurrency(currency);
  };

  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Amount</label>
          <Input
            type="number"
            min="0"
            value={amount}
            onChange={handleAmountChange}
            onBlur={convertCurrencies}
            placeholder="Enter amount"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">From</label>
          <CurrencySelector
            value={fromCurrency}
            onChange={handleFromCurrencyChange}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">To</label>
          <CurrencySelector
            value={toCurrency}
            onChange={handleToCurrencyChange}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-col items-center py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwapCurrencies}
          className="h-8 px-2"
        >
          Swap Currencies
        </Button>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 text-center">
        {isLoading ? (
          <div className="text-muted-foreground">Converting...</div>
        ) : convertedAmount !== null ? (
          <div className="space-y-2">
            <div className="text-xl font-semibold">
              {formatCurrency(convertedAmount, toCurrency)}
            </div>
            <div className="text-sm text-muted-foreground">
              Exchange Rate: 1 {fromCurrency} = {exchangeRate?.toFixed(4)}{" "}
              {toCurrency}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">
            Enter an amount to convert
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {[100, 500, 1000, 5000].map((quickAmount) => (
          <Badge
            key={quickAmount}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10"
            onClick={() => {
              setAmount(quickAmount.toString());
              convertCurrencies();
            }}
          >
            {getCurrencySymbol(fromCurrency)}
            {quickAmount}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// Country Currency Widget
interface CountryCurrencyWidgetProps {
  countryCode?: string;
  baseCurrency?: string;
}

export function CountryCurrencyWidget({
  countryCode = "US",
  baseCurrency = "USD"
}: CountryCurrencyWidgetProps) {
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currency = CURRENCIES.find(c => 
    c.countries.some(country => country.startsWith(countryCode))
  );
  
  const localCurrency = currency?.code || "USD";
  
  useEffect(() => {
    if (baseCurrency === localCurrency) {
      setRate(1);
      return;
    }
    
    const fetchRate = async () => {
      setIsLoading(true);
      try {
        const exchangeRate = await getExchangeRate(baseCurrency, localCurrency);
        setRate(exchangeRate);
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRate();
  }, [baseCurrency, localCurrency]);
  
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <span className="text-lg">{currency?.flag || "🌎"}</span>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{localCurrency}</span>
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Loading...</span>
        ) : rate ? (
          <span className="text-xs text-muted-foreground">
            1 {baseCurrency} = {rate.toFixed(2)} {localCurrency}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not available</span>
        )}
      </div>
    </div>
  );
} 