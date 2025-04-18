"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Search, Globe, ArrowUpDown } from "lucide-react";

import { 
  CURRENCIES, 
  CURRENCY_SYMBOLS, 
  getLatestRates, 
  formatCurrency,
  ExchangeRateData,
  Currency,
  NOMAD_DESTINATIONS
} from "@/lib/currency";

interface CurrencyListProps {
  baseCurrency: string;
  onCurrencySelect?: (currency: string) => void;
}

export function CurrencyList({ baseCurrency = "USD", onCurrencySelect }: CurrencyListProps) {
  const [rates, setRates] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContinent, setSelectedContinent] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({ key: "code", direction: "ascending" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRates();
  }, [baseCurrency]);

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLatestRates(baseCurrency);
      setRates(data);
    } catch (error) {
      console.error("Error fetching rates:", error);
      setError("Unable to fetch exchange rates. Using fallback data.");
      // Create fallback data with empty rates object to prevent undefined errors
      setRates({
        base: baseCurrency,
        date: new Date().toISOString().split('T')[0],
        rates: {},
        success: false,
        timestamp: Math.floor(Date.now() / 1000)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRates();
  };

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedCurrencies = () => {
    const filtered = CURRENCIES.filter(currency => {
      // Apply continent filter
      if (selectedContinent !== "all") {
        const hasCountryInContinent = currency.countries.some(countryName => {
          const destination = NOMAD_DESTINATIONS.find(d => d.currency === currency.code);
          return destination?.continent === selectedContinent;
        });
        if (!hasCountryInContinent) return false;
      }
      
      // Apply search filter
      if (searchTerm) {
        return (
          currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          currency.countries.some(country => 
            country.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
      
      return true;
    });

    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'rate') {
        // Safely access rates with fallback to 0 if undefined
        const rateA = rates?.rates?.[a.code] || 0;
        const rateB = rates?.rates?.[b.code] || 0;
        return sortConfig.direction === 'ascending' 
          ? rateA - rateB 
          : rateB - rateA;
      } else if (sortConfig.key === 'code') {
        return sortConfig.direction === 'ascending'
          ? a.code.localeCompare(b.code)
          : b.code.localeCompare(a.code);
      } else if (sortConfig.key === 'name') {
        return sortConfig.direction === 'ascending'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return 0;
    });
  };

  const continents = [
    { value: "all", label: "All Regions" },
    { value: "Asia", label: "Asia" },
    { value: "Europe", label: "Europe" },
    { value: "North America", label: "North America" },
    { value: "South America", label: "South America" },
    { value: "Africa", label: "Africa" },
    { value: "Oceania", label: "Oceania" },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Global Currencies</CardTitle>
            <CardDescription>
              Exchange rates and currency information
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              <span>Base: {baseCurrency}</span>
            </Badge>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">Currency List</TabsTrigger>
            <TabsTrigger value="popular">Popular Destinations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search currency, country..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={selectedContinent}
                onValueChange={setSelectedContinent}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  {continents.map((continent) => (
                    <SelectItem key={continent.value} value={continent.value}>
                      {continent.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Currency Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-[100px] cursor-pointer"
                      onClick={() => handleSort('code')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Code</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Currency</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Countries</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer"
                      onClick={() => handleSort('rate')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Rate</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : sortedCurrencies().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No results found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedCurrencies().map((currency) => (
                      <TableRow 
                        key={currency.code}
                        className={onCurrencySelect ? "cursor-pointer hover:bg-muted/50" : ""}
                        onClick={() => onCurrencySelect && onCurrencySelect(currency.code)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{currency.flag}</span>
                            <span>{currency.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>{currency.name}</span>
                            <Badge variant="outline" className="ml-1">
                              {currency.symbol}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {currency.countries.map(country => (
                              <Badge key={country} variant="secondary" className="text-xs">
                                {country}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {/* Safely access rates with null check and a fallback */}
                          {rates?.rates?.[currency.code] 
                            ? formatCurrency(1, baseCurrency) + ' = ' + formatCurrency(rates.rates[currency.code], currency.code)
                            : loading ? "Loading..." : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="popular" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {NOMAD_DESTINATIONS.map((destination) => {
                const currencyInfo = CURRENCIES.find(c => c.code === destination.currency);
                const exchangeRate = rates?.rates?.[destination.currency] || 0;
                
                return (
                  <Card key={destination.code} className="overflow-hidden">
                    <div className="flex items-center p-4 border-b gap-3">
                      <div className="text-3xl">{destination.flag}</div>
                      <div>
                        <h3 className="font-medium">{destination.name}</h3>
                        <p className="text-sm text-muted-foreground">{destination.continent}</p>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">{destination.currency}</Badge>
                          <span className="text-sm">{currencyInfo?.name}</span>
                        </div>
                        <div className="text-sm font-mono">
                          1 {baseCurrency} = {loading 
                            ? <Skeleton className="h-4 w-16 inline-block" /> 
                            : exchangeRate.toFixed(4)
                          } {destination.currency}
                        </div>
                      </div>
                      <div className="text-sm space-y-1 mt-3">
                        <div className="flex justify-between">
                          <span>100 {baseCurrency}</span>
                          <span className="font-medium">
                            {loading 
                              ? <Skeleton className="h-4 w-20 inline-block" /> 
                              : formatCurrency(100 * exchangeRate, destination.currency)
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>1,000 {baseCurrency}</span>
                          <span className="font-medium">
                            {loading 
                              ? <Skeleton className="h-4 w-20 inline-block" /> 
                              : formatCurrency(1000 * exchangeRate, destination.currency)
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 