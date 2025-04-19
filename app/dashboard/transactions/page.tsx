"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  ArrowUpDown, 
  Calendar, 
  Filter, 
  Loader2,
  MapPin, 
  Search, 
  Trash, 
  X,
  Pencil,
  PlusIcon,
  RefreshCw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { TransactionDialog } from "@/components/transaction-dialog";
import { getAllCategories, getCategoryIcon, getCategoryColor } from "@/lib/transactionCategories";
import useTransactions, { Transaction } from "@/hooks/use-transactions";
import { useAuth } from "@/context/AuthContext";
import useUserSettings from "@/hooks/use-user-settings";
import { useGPSLocation } from "@/hooks/use-gps-location";
import { COUNTRIES } from "@/lib/countries";
import { 
  convertCurrency, 
  formatCurrency as formatCurrencyUtil, 
  getExchangeRate, 
  FALLBACK_RATES, 
  getCurrencySymbol
} from "@/lib/currency";
import { Plus } from "lucide-react";
import { AIAssistant } from "@/components/ai-assistant";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  THB: "฿",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const needsSpace = ['Fr', 'R', 'zł', 'RM', 'Rp', 'Col$', 'Mex$', 'S$', 'C$', 'A$', 'NZ$', 'HK$'];
  const formattedSymbol = needsSpace.includes(symbol) ? `${symbol} ` : symbol;
  return `${amount < 0 ? '-' : ''}${formattedSymbol}${Math.abs(amount).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

// Format date for display
const formatDate = (date: Date | string): string => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM d, yyyy");
};

// Update the TransactionFilters interface to include all properties
interface TransactionFilters {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  search?: string;
  currency?: string;
  countryName?: string;
  sortBy?: string;
  sortOrder?: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { location: gpsLocation, loading: gpsLoading } = useGPSLocation();
  const { 
    transactions, 
    pagination, 
    loading: transactionsLoading, 
    fetchTransactions,
    deleteTransaction,
    updateFilters,
    filters
  } = useTransactions({
    page: 1,
    limit: 20,
    sortBy: "date",
    sortOrder: "desc",
  });
  
  // Base currency from user settings
  const baseCurrency = settings?.baseCurrency || "USD";
  
  // UI state
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currency, setCurrency] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Currency conversion
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [convertedTransactions, setConvertedTransactions] = useState<Transaction[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  
  // Get unique countries from transactions
  const availableCountries = Array.from(
    new Set(transactions.filter(t => t.location?.country).map(t => t.location!.country))
  ).map(countryName => {
    const country = COUNTRIES.find(c => c.name === countryName);
    return country || { name: countryName, code: "", flagEmoji: "🏳️" };
  }).sort((a, b) => a.name.localeCompare(b.name));
  
  // Delete confirmation
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Load initial transactions
  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchExchangeRates();
    }
  }, [user, filters]);
  
  // Fetch exchange rates and convert transaction amounts
  useEffect(() => {
    const convertTransactionAmounts = async () => {
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
        
        // Use existing rates or fetch them if needed
        let rates = {...exchangeRates};
        const missingCurrencies = uniqueCurrencies.filter(c => !rates[c]);
        
        if (missingCurrencies.length > 0) {
          await Promise.all(
            missingCurrencies.map(async (currency) => {
              try {
                const rate = await getExchangeRate(currency, baseCurrency);
                rates[currency] = rate;
              } catch (error) {
                console.error(`Error fetching rate for ${currency}:`, error);
                // Fallback to static rates
                if (baseCurrency === 'USD') {
                  rates[currency] = 1 / (FALLBACK_RATES[currency] || 1);
                } else if (currency === 'USD') {
                  rates[currency] = FALLBACK_RATES[baseCurrency] || 1;
                } else {
                  // Convert through USD
                  const fromRate = FALLBACK_RATES[currency] || 1;
                  const toRate = FALLBACK_RATES[baseCurrency] || 1;
                  rates[currency] = toRate / fromRate;
                }
              }
            })
          );
          
          setExchangeRates(rates);
        }
        
        // Convert transactions
        const converted = transactions.map(transaction => {
          if (transaction.currency === baseCurrency) {
            return { ...transaction, convertedAmount: transaction.amount };
          }
          
          const rate = rates[transaction.currency] || 1;
          const convertedAmount = transaction.amount * rate;
          
          return {
            ...transaction,
            convertedAmount,
            baseCurrency
          };
        });
        
        setConvertedTransactions(converted);
      } catch (error) {
        console.error("Error converting transaction amounts:", error);
        // Just use original transactions if conversion fails
        setConvertedTransactions(transactions);
      } finally {
        setLoadingRates(false);
      }
    };
    
    convertTransactionAmounts();
  }, [transactions, baseCurrency]);
  
  // Apply date filter
  useEffect(() => {
    if (date?.from) {
      updateFilters({
        startDate: date.from.toISOString(),
        endDate: date.to?.toISOString(),
        page: 1,
      });
    }
  }, [date]);
  
  // Fetch exchange rates
  const fetchExchangeRates = async () => {
    setLoadingRates(true);
    try {
      // Common currencies plus the base currency
      const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "THB", "SGD", "HKD", "CNY", "INR"];
      if (baseCurrency && !currencies.includes(baseCurrency)) {
        currencies.push(baseCurrency);
      }
      
      // Create a rates object
      const rates: Record<string, number> = {};
      
      // Fetch rates for each currency
      await Promise.all(
        currencies.map(async (currency) => {
          if (currency === baseCurrency) {
            rates[currency] = 1; // Base currency to itself is always 1
            return;
          }
          
          try {
            const rate = await getExchangeRate(currency, baseCurrency);
            rates[currency] = rate;
          } catch (error) {
            console.error(`Error fetching rate for ${currency}:`, error);
            // Fallback to static rates
            if (baseCurrency === 'USD') {
              rates[currency] = 1 / (FALLBACK_RATES[currency] || 1);
            } else if (currency === 'USD') {
              rates[currency] = FALLBACK_RATES[baseCurrency] || 1;
            } else {
              // Convert through USD
              const fromRate = FALLBACK_RATES[currency] || 1;
              const toRate = FALLBACK_RATES[baseCurrency] || 1;
              rates[currency] = toRate / fromRate;
            }
          }
        })
      );
      
      setExchangeRates(rates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
    } finally {
      setLoadingRates(false);
    }
  };
  
  // Handle search
  const handleSearch = () => {
    updateFilters({
      search: searchQuery,
      page: 1, // Reset to first page
    });
  };
  
  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    updateFilters({
      category: category === "all" ? undefined : category,
      page: 1, // Reset to first page
    });
  };
  
  // Handle currency filter
  const handleCurrencyFilter = (currency: string) => {
    setCurrency(currency);
    updateFilters({
      currency: currency === "all" ? undefined : currency,
      page: 1, // Reset to first page
    });
  };

  // Handle country filter
  const handleCountryFilter = (country: string) => {
    setCountryFilter(country);
    updateFilters({
      countryName: country === "all" ? undefined : country,
      page: 1, // Reset to first page
    });
  };
  
  // Handle sort
  const handleSort = (field: string) => {
    const isAsc = filters.sortBy === field && filters.sortOrder === "asc";
    updateFilters({
      sortBy: field,
      sortOrder: isAsc ? "desc" : "asc",
    });
  };
  
  // Handle pagination
  const handlePageChange = (page: number) => {
    updateFilters({
      page,
    });
  };
  
  // Handle delete
  const confirmDelete = async () => {
    if (!transactionToDelete?._id) return;
    
    setIsDeleting(true);
    
    try {
      await deleteTransaction(transactionToDelete._id);
      setTransactionToDelete(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setDate(undefined);
    setSelectedCategory("");
    setSearchQuery("");
    setCategoryFilter("all");
    setCurrency("all");
    setCountryFilter("all");
    updateFilters({
      page: 1,
      limit: 20,
      sortBy: "date",
      sortOrder: "desc",
      search: undefined,
      category: undefined,
      currency: undefined,
      countryName: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };
  
  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory.length > 0) count++;
    if (date?.from) count++;
    if (filters.search) count++;
    if (filters.currency) count++;
    if (filters.countryName) count++;
    return count;
  };
  
  // Add a manual refresh button for explicit data loading
  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchTransactions(),
      fetchExchangeRates()
    ]).finally(() => {
      setRefreshing(false);
    });
  };
  
  // Filter by current location
  const filterByCurrentLocation = () => {
    if (!gpsLocation) return;
    
    setCountryFilter(gpsLocation.country || "all");
    updateFilters({
      countryName: gpsLocation.country || undefined,
      page: 1,
    });
  };
  
  // Check if transaction is in current location
  const isCurrentLocation = (transaction: Transaction) => {
    return gpsLocation && 
      transaction.location?.country === gpsLocation.country;
  };
  
  // Loading state
  const isLoading = transactionsLoading || loadingRates;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">
            Manage and track your financial transactions across the globe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {/* Add Income Button */}
          <TransactionDialog
            buttonProps={{
              variant: "outline",
              className: "gap-1 shadow-sm text-green-600 hover:text-green-700 hover:bg-green-50"
            }}
            defaultValues={{
              amount: 0,
              type: 'income'
            }}
            trigger={
              <Button
                variant="outline"
                className="gap-1 shadow-sm text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Plus className="h-4 w-4" />
                <span>Add Income</span>
              </Button>
            }
          />
          {/* Add Expense Button */}
          <TransactionDialog
            buttonProps={{
              variant: "default",
              className: "gap-1 shadow-sm bg-red-600 hover:bg-red-700"
            }}
            defaultValues={{
              amount: 0,
              type: 'expense'
            }}
            trigger={
              <Button
                variant="default"
                className="gap-1 shadow-sm bg-red-600 hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Expense</span>
              </Button>
            }
          />
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Base Currency Indicator */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                <span>Base: {baseCurrency}</span>
              </div>
              
              <div className="relative w-full max-w-sm md:w-auto">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8 w-full md:w-auto"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {getActiveFilterCount() > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="border rounded-md p-4 mt-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {date?.from ? (
                            date.to ? (
                              <>
                                {formatDate(date.from)} - {formatDate(date.to)}
                              </>
                            ) : (
                              formatDate(date.from)
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from}
                          selected={date}
                          onSelect={setDate}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={categoryFilter}
                      onValueChange={handleCategoryFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getAllCategories().map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Currency Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <Select value={currency} onValueChange={handleCurrencyFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Currencies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Currencies</SelectItem>
                        {Object.keys(CURRENCY_SYMBOLS).map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {CURRENCY_SYMBOLS[currency]} {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Country Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <div className="flex gap-2">
                      <Select
                        value={countryFilter}
                        onValueChange={handleCountryFilter}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="All Countries" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          {availableCountries.length > 0 ? (
                            availableCountries.map((country) => (
                              <SelectItem key={country.name} value={country.name}>
                                {country.flagEmoji} {country.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No countries available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      
                      {gpsLocation && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={filterByCurrentLocation}
                          title="Filter by current location"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end space-x-2">
                  <Button variant="outline" onClick={clearFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">
                    <Button 
                      variant="ghost" 
                      className="px-0 font-medium"
                      onClick={() => handleSort("description")}
                    >
                      Description
                      {filters.sortBy === "description" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="px-0 font-medium"
                      onClick={() => handleSort("category")}
                    >
                      Category
                      {filters.sortBy === "category" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="px-0 font-medium"
                      onClick={() => handleSort("date")}
                    >
                      Date
                      {filters.sortBy === "date" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="px-0 font-medium"
                      onClick={() => handleSort("amount")}
                    >
                      Amount
                      {filters.sortBy === "amount" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <p>{transactionsLoading ? "Loading transactions..." : "Converting currencies..."}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center gap-4">
                        <div className="rounded-full bg-muted p-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-10 h-10 text-muted-foreground"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
                            />
                          </svg>
                        </div>
                        
                        {getActiveFilterCount() > 0 ? (
                          <>
                            <div className="text-center">
                              <h3 className="text-lg font-medium">No transactions found</h3>
                              <p className="text-muted-foreground mt-1">
                                Try changing your filters or adding a transaction
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={clearFilters}>
                                Clear Filters
                              </Button>
                              <TransactionDialog />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-center">
                              <h3 className="text-lg font-medium">No transactions yet</h3>
                              <p className="text-muted-foreground mt-1">
                                Start tracking your finances by adding your first transaction
                              </p>
                            </div>
                            <TransactionDialog />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  convertedTransactions.map((transaction) => {
                    const CategoryIcon = getCategoryIcon(transaction.category);
                    const categoryColor = getCategoryColor(transaction.category);
                    const isInCurrentLocation = isCurrentLocation(transaction);
                    
                    // Display original amount and converted amount if different
                    const originalAmount = formatCurrency(transaction.amount, transaction.currency);
                    const showConverted = transaction.currency !== baseCurrency && transaction.convertedAmount !== undefined;
                    const convertedAmount = showConverted ? 
                      formatCurrency(transaction.convertedAmount as number, baseCurrency) : null;
                    
                    return (
                      <TableRow key={transaction._id}>
                        <TableCell className="max-w-[200px] truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: categoryColor }}
                            />
                            <CategoryIcon className="h-4 w-4" />
                            <span>{transaction.category}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(new Date(transaction.date))}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className={transaction.amount < 0 ? "text-red-500" : "text-green-500"}>
                              {originalAmount}
                            </span>
                            {showConverted && (
                              <span className="text-xs text-muted-foreground">
                                ≈ {convertedAmount}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {transaction.location ? (
                            <div className="flex items-center gap-1">
                              <div className={`p-1 rounded-full ${isInCurrentLocation ? 'bg-blue-500' : 'bg-slate-500'}`}>
                                <MapPin className="h-2 w-2 text-white" />
                              </div>
                              <span>
                                {transaction.location.country}
                                {isInCurrentLocation && (
                                  <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4">
                                    Current
                                  </Badge>
                                )}
                              </span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TransactionDialog
                              transaction={transaction}
                              trigger={
                                <Button size="icon" variant="ghost">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setTransactionToDelete(transaction)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        
        {/* Pagination */}
        {pagination.total > 0 && (
          <CardFooter className="flex items-center justify-between border-t p-4">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} transactions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {pagination.pages > 5 && (
                  <>
                    <span className="mx-1">...</span>
                    <Button
                      variant={pagination.page === pagination.pages ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(pagination.pages)}
                    >
                      {pagination.pages}
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* AI Assistant */}
      <AIAssistant />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {transactionToDelete && (
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="font-medium">{transactionToDelete.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Amount</p>
                    <p className={`font-medium ${transactionToDelete.amount < 0 ? "text-red-500" : "text-green-500"}`}>
                      {formatCurrency(transactionToDelete.amount, transactionToDelete.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {formatDate(new Date(transactionToDelete.date))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <p className="font-medium">{transactionToDelete.category}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransactionToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}