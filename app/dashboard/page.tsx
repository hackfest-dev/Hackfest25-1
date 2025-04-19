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
      const timeSeries = createTimeSeriesData(convertedTransactions);
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
  // Group transactions by date
  const groupedByDate: Record<string, { income: number; expenses: number }> = {};
  
  // Sort transactions by date first
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Process each transaction
  sortedTransactions.forEach(transaction => {
    // Format the date consistently
    const date = new Date(transaction.date).toISOString().split('T')[0];
    
    // Initialize the date entry if it doesn't exist
    if (!groupedByDate[date]) {
      groupedByDate[date] = { income: 0, expenses: 0 };
    }
    
    // Convert the transaction amount to the user's base currency
    let convertedAmount = transaction.convertedAmount || transaction.amount;
    
    // Add the amount to the appropriate category based on amount sign
    if (convertedAmount > 0) {
      groupedByDate[date].income += convertedAmount;
    } else {
      groupedByDate[date].expenses += convertedAmount;
    }
  });
  
  // Convert the grouped data to the format needed for the chart
  const chartData = Object.entries(groupedByDate)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, values]) => ({
      date,
      income: parseFloat(values.income.toFixed(2)),
      expenses: Math.abs(parseFloat(values.expenses.toFixed(2))), // Make expenses positive for better visualization
      total: parseFloat((values.income + values.expenses).toFixed(2))
    }));
  
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
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Track your global finances in one place</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>

          {/* Base Currency Indicator */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Base: {baseCurrency}</span>
          </div>
          
          {/* Analytics Link */}
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href="/dashboard/analytics">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </a>
          </Button>
          
          {/* Refresh Button */}
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
            >
            <>
              <Plus className="h-4 w-4" />
              <span>Add Income</span>
            </>
            </TransactionDialog>
            
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
            >
            <>
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </>
            </TransactionDialog>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Income
            </CardTitle>
            <CardDescription>
              Last {dateRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {formatCurrency(totalIncome, baseCurrency)}
              </div>
              <div className={`flex items-center ${incomeChange.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {incomeChange.startsWith('+') ? (
                  <ArrowUp className="mr-1 h-4 w-4" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4" />
                )}
                <span className="text-xs">
                  {incomeChange}
                </span>
              </div>
            </div>
            <Progress 
              value={totalIncome > 0 ? 100 : 0}
              className="h-1 mt-2 bg-green-100" 
            />
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <CardDescription>
              Last {dateRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {formatCurrency(totalExpenses, baseCurrency)}
              </div>
              <div className={`flex items-center ${!expensesChange.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {!expensesChange.startsWith('+') ? (
                  <ArrowDown className="mr-1 h-4 w-4" />
                ) : (
                  <ArrowUp className="mr-1 h-4 w-4" />
                )}
                <span className="text-xs">
                  {expensesChange}
                </span>
              </div>
            </div>
            <Progress 
              value={totalExpenses < 0 ? 100 : 0}
              className="h-1 mt-2 bg-red-100" 
            />
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Balance
            </CardTitle>
            <CardDescription>
              Income minus expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {formatCurrency(balance, baseCurrency)}
              </div>
              <div className={`flex items-center ${balance > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {balance > 0 ? (
                  <ArrowUp className="mr-1 h-4 w-4" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4" />
                )}
                <span className="text-xs">
                  {balanceChange}
                </span>
              </div>
            </div>
            <Progress 
              value={50}
              className={`h-1 mt-2 ${balance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Exchange Rate Information */}
      {Object.keys(exchangeRates).length > 0 && (
        <Card className="bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Exchange Rates</CardTitle>
            <CardDescription>
              {loadingRates ? "Updating rates..." : "Current conversion rates to " + baseCurrency}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(exchangeRates).map(([currency, rate]) => (
                <div key={currency} className="flex items-center justify-between bg-background p-2 rounded-md border">
                  <div className="font-medium">{currency}</div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap ml-2">
                    1 {currency} = {formatCurrency(rate, baseCurrency)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Content */}
      <div className="space-y-6">
        {/* Spending Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
            <CardDescription>
              Your financial activity over time
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading || loadingRates ? (
              <Skeleton className="h-full w-full" />
            ) : timeSeriesData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No transaction data available</p>
                  <p className="text-xs text-muted-foreground mt-1">Add transactions to see your spending trends</p>
                </div>
              </div>
            ) : (
              <div className="h-full w-full">
                <SpendingChart 
                  data={timeSeriesData}
                  baseCurrency={baseCurrency} 
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Spending Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Spending Categories</CardTitle>
            <CardDescription>
              Where your money is going
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[350px]">
            {loading || loadingRates ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(mainCategories)
                  .filter(([category, amount]) => amount > 0 && category !== "Income")
                  .map(([category, amount]) => {
                    const CategoryIcon = getCategoryIcon(category);
                    const percentage = totalExpenses !== 0 
                        ? (amount / Math.abs(totalExpenses)) * 100
                        : 0;
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full" 
                                 style={{ backgroundColor: "#6E56CF" }}>
                              <CategoryIcon className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-sm font-medium">{category}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatCurrency(amount, baseCurrency)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress
                          value={percentage > 100 ? 100 : percentage}
                          className="h-2"
                        />
                      </div>
                    );
                  })}
                
                {topCategories.length > 0 && topCategories
                  .filter(cat => 
                    !Object.keys(mainCategories).includes(cat.category) && 
                    cat.amount < 0)
                  .slice(0, 3)
                  .map(category => {
                    const CategoryIcon = getCategoryIcon(category.category);
                    const percentage = Math.abs(category.amount / totalExpenses) * 100;
                    
                    return (
                      <div key={category.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full" 
                                 style={{ backgroundColor: category.color || "#6E56CF" }}>
                              <CategoryIcon className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-sm font-medium">{category.category}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatCurrency(Math.abs(category.amount), baseCurrency)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress
                          value={percentage}
                          className="h-2"
                        />
                      </div>
                    );
                  })}

                {/* Income Category */}
                {mainCategories["Income"] > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full" 
                             style={{ backgroundColor: "#22c55e" }}>
                          <Receipt className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-sm font-medium">Income</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(mainCategories["Income"], baseCurrency)}
                        </span>
                      </div>
                    </div>
                    <Progress value={100} className="h-2 bg-green-100" />
                  </div>
                )}

                {Object.values(mainCategories).every(val => val === 0) && 
                  topCategories.length === 0 && (
                    <div className="flex items-center justify-center h-[250px]">
                      <div className="text-center">
                        <PieChart className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No expense data available</p>
                        <p className="text-xs text-muted-foreground mt-1">Add expense transactions to see your spending breakdown</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          asChild
                        >
                          <a href="/dashboard/transactions">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Transaction
                          </a>
                        </Button>
                      </div>
                    </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your most recent financial activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Description</TableHead>
                  <TableHead className="w-[20%]">Date</TableHead>
                  <TableHead className="w-[25%]">Amount</TableHead>
                  <TableHead className="w-[20%]">Category</TableHead>
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
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">No transactions found</p>
                      <p className="text-xs text-muted-foreground mt-1">Add your first transaction using the button above</p>
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
                      <TableRow key={transaction._id} className="group">
                        <TableCell>
                          <div className="font-medium truncate max-w-[200px]">{transaction.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {transaction.location?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{transaction.location.city}</span>
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</TableCell>
                        <TableCell className={transaction.amount < 0 ? "text-red-500" : "text-green-500"}>
                          <div className="whitespace-nowrap">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </div>
                          {transaction.currency !== baseCurrency && transaction.convertedAmount && (
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              ≈ {formatCurrency(transaction.convertedAmount, baseCurrency)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full" 
                                 style={{ backgroundColor: "#6E56CF" }}>
                              <CategoryIcon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="hidden sm:inline text-xs truncate max-w-[80px]">{transaction.category}</span>
                          </div>
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