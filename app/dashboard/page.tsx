"use client";

import { useState, useEffect } from "react";
import axios from "axios";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDownIcon,
  Clock,
  CreditCard,
  DollarSign,
  Home,
  MapPin,
  PieChart,
  PiggyBank,
  Plus,
  RefreshCw,
  TrendingUp,
  Receipt,
  ChevronRight,
} from "lucide-react";

import { SpendingChart } from "@/components/dashboard/charts";
import { CategoryPieChart } from "@/components/dashboard/charts";
import { TransactionDialog } from "@/components/transaction-dialog";
import useTransactions, { Transaction } from "@/hooks/use-transactions";
import { useAuth } from "@/context/AuthContext";
import useUserSettings from "@/hooks/use-user-settings";
import { getCategoryIcon } from "@/lib/transactionCategories";
import { 
  getExchangeRate, 
  FALLBACK_RATES, 
  getCurrencySymbol
} from "@/lib/currency";

const formatCurrency = (amount: number, currency: string) => {
  const symbol = getCurrencySymbol(currency);
  const needsSpace = ['Fr', 'R', 'zł', 'RM', 'Rp', 'Col$', 'Mex$', 'S$', 'C$', 'A$', 'NZ$', 'HK$'];
  const formattedSymbol = needsSpace.includes(symbol) ? `${symbol} ` : symbol;
  return `${amount < 0 ? '-' : ''}${formattedSymbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Calculate percentage change between two values
const percentChange = (current: number, previous: number): string => {
  if (previous === 0) {
    return current > 0 ? "+100%" : current < 0 ? "-100%" : "0%";
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { 
    transactions, 
    loading: transactionsLoading,
    error,
    updateFilters,
    stats,
    fetchTransactions
  } = useTransactions();
  
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [dateRange, setDateRange] = useState("30");
  const [refreshing, setRefreshing] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [convertedTransactions, setConvertedTransactions] = useState<Transaction[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previousPeriodStats, setPreviousPeriodStats] = useState({
    income: 0,
    expenses: 0,
    balance: 0
  });
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<any>({
    baseCurrency: 'USD',
    theme: 'light'
  });
  
  // Update base currency from settings
  useEffect(() => {
    if (settings?.baseCurrency) {
      setBaseCurrency(settings.baseCurrency);
    }
  }, [settings]);
  
  // Fetch transactions when component mounts
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          await Promise.all([
            fetchTransactionData(),
            fetchPreviousPeriodData(),
            fetchUserSettings(),
            fetchExchangeRates()
          ]);
        } catch (error) {
          console.error("Error loading dashboard data:", error);
        }
      };
      loadData();
    }
  }, [user, dateRange]);
  
  // Update time series data when converted transactions change
  useEffect(() => {
    if (convertedTransactions.length > 0) {
      console.log('Creating time series data from converted transactions:', convertedTransactions.length);
      const timeSeries = createTimeSeriesData(convertedTransactions);
      console.log('Generated time series data:', timeSeries);
      setTimeSeriesData(timeSeries);
    }
  }, [convertedTransactions]);
  
  // Fetch exchange rates and convert transaction amounts
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
                // Convert through USD
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
  
  // Function to fetch transaction data with selected date range
  const fetchTransactionData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Create date range filter
      const startDate = new Date();
      const endDate = new Date();
      
      // Set date range based on selected option
      if (dateRange === "7") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === "30") {
        startDate.setDate(startDate.getDate() - 30);
      } else if (dateRange === "90") {
        startDate.setDate(startDate.getDate() - 90);
      } else if (dateRange === "365") {
        startDate.setDate(startDate.getDate() - 365);
      }
      
      // Update filters in the hook
      updateFilters({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId: user.uid
      });
      
      // Fetch transactions from the hook
      await fetchTransactions();
      
      // Create time series data for the spending chart
      if (transactions.length > 0) {
        const timeData = createTimeSeriesData(transactions);
        setTimeSeriesData(timeData);
      }
      
      // Fetch category stats
      await fetchCategoryStats({
        userId: user.uid,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch previous period data for comparison
  const fetchPreviousPeriodData = async () => {
    if (!user) return;
    
    // Calculate previous period date range
    const currentEndDate = new Date();
    const currentStartDate = new Date();
    currentStartDate.setDate(currentStartDate.getDate() - parseInt(dateRange));
    
    const previousEndDate = new Date(currentStartDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - parseInt(dateRange));
    
    try {
      // Create parameters for API call
      const params = new URLSearchParams();
      params.append('userId', user.uid);
      params.append('startDate', previousStartDate.toISOString());
      params.append('endDate', previousEndDate.toISOString());
      
      // Make direct API call to get previous period data
      const response = await axios.get(`/api/transactions?${params.toString()}`);
      const data = response.data;
      
      // Calculate previous period totals
      const prevTransactions: Transaction[] = data.transactions || [];
      
      const prevIncome = prevTransactions
        .filter((t: Transaction) => t.amount > 0)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      
      const prevExpenses = prevTransactions
        .filter((t: Transaction) => t.amount < 0)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      
      setPreviousPeriodStats({
        income: prevIncome,
        expenses: prevExpenses,
        balance: prevIncome + prevExpenses
      });
    } catch (error) {
      console.error("Error fetching previous period data:", error);
    }
  };
  
  // Calculate totals from converted transactions
  const totalIncome = convertedTransactions
    .filter(t => t.convertedAmount ? t.convertedAmount > 0 : t.amount > 0)
    .reduce((sum, t) => sum + (t.convertedAmount || t.amount), 0);
  
  const totalExpenses = convertedTransactions
    .filter(t => t.convertedAmount ? t.convertedAmount < 0 : t.amount < 0)
    .reduce((sum, t) => sum + (t.convertedAmount || t.amount), 0);
  
  const balance = totalIncome + totalExpenses; // Expenses are negative
  
  // Calculate monthly averages (assuming 30 days is about a month)
  const avgDailySpend = Math.abs(totalExpenses) / parseInt(dateRange);
  const monthlyBurnRate = avgDailySpend * 30;
  
  // Convert category stats to use base currency using the exchange rates
  const convertedCategoryStats = stats?.categoryStats ? stats.categoryStats.map(category => {
    // Find all transactions in this category
    const categoryTransactions = convertedTransactions.filter(t => t.category === category.category);
    
    // Calculate the total converted amount for this category
    const convertedAmount = categoryTransactions.reduce((sum, t) => sum + (t.convertedAmount || t.amount), 0);
    
    return {
      ...category,
      amount: convertedAmount,
      originalAmount: category.amount
    };
  }) : [];
  
  // Calculate top spending categories using converted amounts
  const topCategories = (convertedCategoryStats || [])
    .filter(cat => cat.amount < 0) // Only expenses
    .sort((a, b) => a.amount - b.amount) // Sort by amount (ascending since expenses are negative)
    .slice(0, 5);
  
  // Calculate transaction count
  const transactionCount = transactions.length;
  
  // Find largest transaction (by absolute amount)
  const largestTransaction = convertedTransactions.length > 0
    ? convertedTransactions.reduce((largest, current) => {
        const currentAmount = current.convertedAmount || current.amount;
        const largestAmount = largest.convertedAmount || largest.amount;
        return Math.abs(currentAmount) > Math.abs(largestAmount) ? current : largest;
      })
    : null;
  
  // Calculate percentage changes compared to previous period
  const incomeChange = percentChange(totalIncome, previousPeriodStats.income);
  const expensesChange = percentChange(Math.abs(totalExpenses), Math.abs(previousPeriodStats.expenses));
  const balanceChange = previousPeriodStats.balance !== 0 
    ? percentChange(balance, previousPeriodStats.balance)
    : balance > 0 ? "+100%" : "-100%";
  
  // Handle refreshing data
  const handleRefresh = () => {
    fetchTransactionData();
  };

// Process transactions for time series chart
const createTimeSeriesData = (transactions: Transaction[]) => {
  console.log('Starting to process time series data');
  
  // Group transactions by date
  const groupedByDate: Record<string, { Income: number; Expenses: number }> = {};
  
  // Sort transactions by date first
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  console.log('Sorted transactions:', sortedTransactions.length);
  
  // Process each transaction
  sortedTransactions.forEach(transaction => {
    // Format the date consistently
    const date = new Date(transaction.date);
    const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Initialize the date entry if it doesn't exist
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = { Income: 0, Expenses: 0 };
    }
    
    // Convert the transaction amount to the user's base currency
    let convertedAmount = transaction.convertedAmount || transaction.amount;
    
    // Add the amount to the appropriate category based on amount sign
    if (convertedAmount > 0) {
      groupedByDate[dateKey].Income += Math.abs(convertedAmount);
    } else {
      groupedByDate[dateKey].Expenses += Math.abs(convertedAmount); // Store expenses as positive values
    }
  });
  
  console.log('Grouped by date:', groupedByDate);
  
  // Convert the grouped data to the format needed for the chart
  const chartData = Object.entries(groupedByDate)
    .sort(([a, _], [b, __]) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    })
    .map(([date, values]) => ({
      date,
      Income: parseFloat(values.Income.toFixed(2)),
      Expenses: parseFloat(values.Expenses.toFixed(2))
    }));
  
  console.log('Final chart data:', chartData);
  return chartData;
};

  const fetchUserSettings = async () => {
    if (!user) return;
    
    try {
      const { data } = await axios.get(`/api/users/${user.uid}/settings`);
      setUserSettings(data);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      // Default to USD if we can't get settings
      setUserSettings({ baseCurrency: 'USD', theme: 'light' });
    }
  };

  const fetchCategoryStats = async (filters: any) => {
    try {
      // Fetch with category stats included
      const { data } = await axios.get('/api/transactions', {
        params: {
          ...filters,
          includeStats: true,
          categoryType: 'expense', // Only include expenses for the pie chart
        }
      });
      
      if (data.categoryStats && exchangeRates) {
        // Convert amounts to base currency
        const convertedStats = data.categoryStats.map((stat: any) => {
          const convertedAmount = stat.currency !== userSettings.baseCurrency && exchangeRates
            ? stat.amount * exchangeRates[stat.currency] / exchangeRates[userSettings.baseCurrency]
            : stat.amount;
          
          return {
            ...stat,
            convertedAmount,
          };
        });
        
        // Sort by converted amount and take top 5
        const topCategories = convertedStats
          .sort((a: any, b: any) => b.convertedAmount - a.convertedAmount)
          .slice(0, 5)
          .map((stat: any) => ({
            name: stat.category,
            value: Math.abs(stat.convertedAmount),
            color: stat.color
          }));
          
        setCategoryData(topCategories);
      }
    } catch (error) {
      console.error('Error fetching category stats:', error);
    }
  };

  const fetchExchangeRates = async () => {
    setLoadingRates(true);
    try {
      // Get unique currencies from transactions
      const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]; // Common currencies
      if (userSettings.baseCurrency && !currencies.includes(userSettings.baseCurrency)) {
        currencies.push(userSettings.baseCurrency);
      }
      
      // Create a rates object
      const rates: Record<string, number> = {};
      
      // Fetch rates for each currency
      await Promise.all(
        currencies.map(async (currency) => {
          try {
            const rate = await getExchangeRate(currency, "USD"); // Get all rates to USD as base
            rates[currency] = rate;
          } catch (error) {
            console.error(`Error fetching rate for ${currency}:`, error);
            // Fallback to static rates
            rates[currency] = FALLBACK_RATES[currency] || 1;
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

  // Get category-specific spending
  const getCategorySpending = (categoryName: string) => {
    return convertedTransactions
      .filter(t => t.category === categoryName && (t.convertedAmount ? t.convertedAmount < 0 : t.amount < 0))
      .reduce((sum, t) => sum + Math.abs(t.convertedAmount || t.amount), 0);
  };

  // Specific category data
  const mainCategories = {
    "Income": totalIncome,
    "Food & Dining": getCategorySpending("Food & Dining"),
    "Transportation": getCategorySpending("Transportation"),
    "Housing & Utilities": getCategorySpending("Housing & Utilities"),
    "Entertainment": getCategorySpending("Entertainment")
  };

  return (
    <div className="flex flex-col space-y-6 p-4 md:p-6">
      {/* Dashboard Header - Simplified and Modern */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Your financial overview</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector - Enhanced */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[140px] h-9">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent>
                <p>Select time range</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Base Currency Display - Modern Badge */}
          <Badge variant="secondary" className="h-9 px-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {baseCurrency}
          </Badge>
          
          {/* Action Buttons - Cleaner Layout */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <TransactionDialog 
              defaultValues={{ amount: 0, type: 'income' }}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Income
                </Button>
              }
            />
            
            <TransactionDialog 
              defaultValues={{ amount: 0, type: 'expense' }}
              trigger={
                <Button
                  variant="default"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Expense
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Financial Overview Cards - Modern Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income Card - Enhanced */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-green-500" />
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-1">
              <div className="text-2xl font-bold">
                {formatCurrency(totalIncome, baseCurrency)}
              </div>
              <div className={`flex items-center mt-1 text-sm ${
                incomeChange.startsWith('+') ? 'text-green-500' : 'text-red-500'
              }`}>
                {incomeChange.startsWith('+') ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-1" />
                )}
                {incomeChange}
              </div>
            </div>
            <Progress 
              value={totalIncome > 0 ? 100 : 0}
              className="h-1 mt-3" 
            />
          </CardContent>
        </Card>

        {/* Expenses Card - Enhanced */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-500" />
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-1">
              <div className="text-2xl font-bold">
                {formatCurrency(totalExpenses, baseCurrency)}
              </div>
              <div className={`flex items-center mt-1 text-sm ${
                !expensesChange.startsWith('+') ? 'text-green-500' : 'text-red-500'
              }`}>
                {!expensesChange.startsWith('+') ? (
                  <ArrowDown className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowUp className="h-4 w-4 mr-1" />
                )}
                {expensesChange}
              </div>
            </div>
            <Progress 
              value={totalExpenses < 0 ? 100 : 0}
              className="h-1 mt-3" 
            />
          </CardContent>
        </Card>

        {/* Balance Card - Enhanced */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-1">
              <div className="text-2xl font-bold">
                {formatCurrency(balance, baseCurrency)}
              </div>
              <div className={`flex items-center mt-1 text-sm ${
                balance > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {balance > 0 ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-1" />
                )}
                {balanceChange}
              </div>
            </div>
            <Progress 
              value={totalIncome > 0 ? (balance / totalIncome) * 100 : 0}
              className="h-1 mt-3" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid - Modern Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Spending Trends Chart - Enhanced */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Spending Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading || loadingRates ? (
              <Skeleton className="h-full w-full" />
            ) : timeSeriesData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 text-primary/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No data available</p>
                </div>
              </div>
            ) : (
              <SpendingChart 
                data={timeSeriesData}
                baseCurrency={baseCurrency} 
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions - Enhanced */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <a href="/dashboard/transactions">
                View All
                <ChevronRight className="h-4 w-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading || loadingRates ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : convertedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Receipt className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">No transactions found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    convertedTransactions
                      .slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 10)
                      .map((transaction) => {
                        const CategoryIcon = getCategoryIcon(transaction.category);
                        return (
                          <TableRow key={transaction._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <CategoryIcon className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">{transaction.description}</div>
                                  {transaction.location?.city && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {transaction.location.city}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className={transaction.amount < 0 ? "text-red-500" : "text-green-500"}>
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </div>
                              {transaction.currency !== baseCurrency && transaction.convertedAmount && (
                                <div className="text-xs text-muted-foreground">
                                  ≈ {formatCurrency(transaction.convertedAmount, baseCurrency)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {transaction.category}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}