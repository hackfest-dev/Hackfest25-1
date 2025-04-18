"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightIcon,
  BarChart3,
  CalendarIcon,
  CircleSlash,
  DollarSign,
  GanttChartSquare,
  Globe,
  PieChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { SpendingChart, CategoryPieChart } from "@/components/dashboard/charts";
import { LocationAnalytics } from "@/components/dashboard/location-analytics";
import useTransactions, { Transaction } from "@/hooks/use-transactions";
import { useAuth } from "@/context/AuthContext";
import useUserSettings from "@/hooks/use-user-settings";
import { getCategoryIcon } from "@/lib/transactionCategories";
import { getExchangeRate, FALLBACK_RATES, getCurrencySymbol } from "@/lib/currency";

// Currency formatter function
const formatCurrency = (amount: number, currency: string) => {
  const symbol = getCurrencySymbol(currency);
  const needsSpace = ['Fr', 'R', 'zł', 'RM', 'Rp', 'Col$', 'Mex$', 'S$', 'C$', 'A$', 'NZ$', 'HK$'];
  const formattedSymbol = needsSpace.includes(symbol) ? `${symbol} ` : symbol;
  return `${amount < 0 ? '-' : ''}${formattedSymbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Calculate percentage change
const percentChange = (current: number, previous: number): string => {
  if (previous === 0) {
    return current > 0 ? "+100%" : current < 0 ? "-100%" : "0%";
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { 
    transactions, 
    loading,
    updateFilters,
    stats,
    fetchTransactions
  } = useTransactions();
  
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30");
  const [refreshing, setRefreshing] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [convertedTransactions, setConvertedTransactions] = useState<Transaction[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  
  // Update base currency from settings
  useEffect(() => {
    if (settings?.baseCurrency) {
      setBaseCurrency(settings.baseCurrency);
    }
  }, [settings]);
  
  // Fetch transactions when component mounts
  useEffect(() => {
    if (user) {
      console.log("Fetching transaction data and exchange rates...");
      fetchTransactionData();
    }
  }, [user, dateRange]);
  
  // Process transactions and fetch exchange rates when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      console.log("Transactions updated, converting currencies...");
      convertTransactionCurrencies();
    }
  }, [transactions, baseCurrency]);
  
  // Convert transaction currencies to base currency
  const convertTransactionCurrencies = async () => {
    setLoadingRates(true);
    
    try {
      // Get unique currencies from transactions
      const uniqueCurrencies = Array.from(
        new Set(transactions.map(t => t.currency).filter(c => c !== baseCurrency))
      );
      
      console.log("Found unique currencies:", uniqueCurrencies);
      
      if (uniqueCurrencies.length === 0) {
        // All transactions are already in base currency
        const converted = transactions.map(t => ({...t, convertedAmount: t.amount}));
        setConvertedTransactions(converted);
        processDataWithConvertedTransactions(converted);
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
              rates[currency] = 1 / (FALLBACK_RATES[currency] || 1);
            } else if (currency === 'USD') {
              rates[currency] = FALLBACK_RATES[baseCurrency] || 1;
            } else {
              // Convert through USD
              const fromUSD = FALLBACK_RATES[currency] || 1;
              const toUSD = FALLBACK_RATES[baseCurrency] || 1;
              rates[currency] = toUSD / fromUSD;
            }
          }
        })
      );
      
      console.log("Exchange rates:", rates);
      setExchangeRates(rates);
      
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
          baseCurrency,
          exchangeRate: rate
        };
      });
      
      // Log an example conversion
      const example = converted.find(t => t.currency !== baseCurrency);
      if (example) {
        console.log("Example conversion:", {
          original: `${example.amount} ${example.currency}`,
          converted: `${example.convertedAmount} ${baseCurrency}`,
          rate: example.exchangeRate
        });
      }
      
      setConvertedTransactions(converted);
      processDataWithConvertedTransactions(converted);
    } catch (error) {
      console.error("Error converting transactions:", error);
      // Use original transactions if conversion fails
      const fallback = transactions.map(t => ({...t, convertedAmount: t.amount}));
      setConvertedTransactions(fallback);
      processDataWithConvertedTransactions(fallback);
    } finally {
      setLoadingRates(false);
    }
  };
  
  // Process all data with converted transactions
  const processDataWithConvertedTransactions = (converted: Transaction[]) => {
    const timeData = createTimeSeriesData(converted);
    setTimeSeriesData(timeData);
    processCategoryData(converted);
    processMonthlyData(converted);
  };
  
  // Process category data
  const processCategoryData = (convertedData: Transaction[] = convertedTransactions) => {
    // Use either stats data or build from transactions
    if (stats?.categoryStats && stats.categoryStats.length > 0) {
      console.log("Using category stats from API:", stats.categoryStats.length);
      
      // Convert stats to the format needed for charts - using exchange rates if needed
      const processedCategoryData = stats.categoryStats
        .filter(cat => cat.amount < 0) // Only include expenses
        .map(cat => {
          // Convert the amount if needed
          let value = Math.abs(cat.amount);
          
          // Note: If CategoryStats doesn't have currency property, we can't do conversion here
          // We'll rely on the transactions being already converted in the hook
          
          return {
            name: cat.category,
            value: value,
            count: 0, // We don't have count from the stats API
            color: cat.color || "#6E56CF"
          };
        })
        .sort((a, b) => b.value - a.value);
      
      console.log("Processed category data:", processedCategoryData);
      setCategoryData(processedCategoryData);
      return;
    }
    
    console.log("Building category data from transactions, count:", convertedData.length);
    
    // Count total transactions by category type (expense vs income)
    const expenseCount = convertedData.filter(t => {
      const amount = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
      return amount < 0;
    }).length;
    
    console.log("Total expense transactions:", expenseCount);
    
    // Group transactions by category
    const categoryGroups: Record<string, Transaction[]> = {};
    
    convertedData.forEach(transaction => {
      const amount = transaction.convertedAmount !== undefined ? 
        transaction.convertedAmount : transaction.amount;
        
      if (amount < 0) { // Only include expenses
        const category = transaction.category || "Uncategorized";
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(transaction);
      }
    });
    
    console.log("Category groups created:", Object.keys(categoryGroups).length, Object.keys(categoryGroups));
    
    // Calculate total amount per category
    const processedCategoryData = Object.entries(categoryGroups).map(([category, transactions]) => {
      const totalAmount = transactions.reduce((sum, t) => {
        // Always use convertedAmount for consistent currency
        const transactionAmount = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
        return sum + Math.abs(transactionAmount);
      }, 0);
      
      return {
        name: category,
        value: totalAmount,
        count: transactions.length,
        color: stats?.categoryStats?.find(c => c.category === category)?.color || "#6E56CF"
      };
    }).sort((a, b) => b.value - a.value);
    
    console.log("Processed category data from transactions:", processedCategoryData);
    setCategoryData(processedCategoryData);
  };
  
  // Process monthly data
  const processMonthlyData = (convertedData: Transaction[] = convertedTransactions) => {
    // Group transactions by month
    const monthlyGroups: Record<string, { income: number; expenses: number }> = {};
    
    convertedData.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { income: 0, expenses: 0 };
      }
      
      const amount = transaction.convertedAmount || transaction.amount;
      if (amount > 0) {
        monthlyGroups[monthKey].income += amount;
      } else {
        monthlyGroups[monthKey].expenses += Math.abs(amount);
      }
    });
    
    // Convert to array and sort by date
    const processedMonthlyData = Object.entries(monthlyGroups).map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: data.income,
        expenses: data.expenses,
        savings: data.income - data.expenses,
        savingsRate: data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0,
        date // For sorting
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    setMonthlyData(processedMonthlyData);
  };
  
  // Process transactions for time series chart
  const createTimeSeriesData = (transactions: Transaction[]) => {
    // Group transactions by date
    const groupedByDate: Record<string, { income: number; expense: number }> = {};
    
    // Process each transaction
    transactions.forEach(transaction => {
      // Format the date
      const date = new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      // Initialize the date entry if it doesn't exist
      if (!groupedByDate[date]) {
        groupedByDate[date] = { income: 0, expense: 0 };
      }
      
      // Use convertedAmount if available, otherwise use amount
      const amount = transaction.convertedAmount !== undefined ? transaction.convertedAmount : transaction.amount;
      
      // Add the amount to the appropriate category based on amount sign
      if (amount > 0) {
        groupedByDate[date].income += amount;
      } else {
        groupedByDate[date].expense += Math.abs(amount);
      }
    });
    
    // Convert the grouped data to the format needed for the chart
    return Object.entries(groupedByDate).map(([date, values]) => ({
      date,
      Income: parseFloat(values.income.toFixed(2)),
      Expenses: parseFloat(values.expense.toFixed(2))
    }));
  };
  
  // Compute expense stats with proper conversion
  const computeExpenseStats = (data: Transaction[] = convertedTransactions) => {
    // Calculate income using converted amounts
    const income = data
      .filter(t => {
        const amount = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
        return amount > 0;
      })
      .reduce((sum, t) => sum + (t.convertedAmount !== undefined ? t.convertedAmount : t.amount), 0);
    
    // Calculate expenses using converted amounts
    const expenses = data
      .filter(t => {
        const amount = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
        return amount < 0;
      })
      .reduce((sum, t) => sum + Math.abs(t.convertedAmount !== undefined ? t.convertedAmount : t.amount), 0);
      
    return { income, expenses };
  };
  
  // Compute expense stats with proper currency conversion
  const { income: totalIncome, expenses: totalExpenses } = computeExpenseStats();
  
  // Get spending by time of day
  const getSpendingByTimeOfDay = () => {
    const timeGroups = {
      morning: { count: 0, amount: 0 }, // 6am-12pm
      afternoon: { count: 0, amount: 0 }, // 12pm-5pm
      evening: { count: 0, amount: 0 }, // 5pm-9pm
      night: { count: 0, amount: 0 }, // 9pm-6am
    };
    
    convertedTransactions.forEach(transaction => {
      // Use convertedAmount if available, otherwise use amount
      const transactionAmount = transaction.convertedAmount !== undefined ? transaction.convertedAmount : transaction.amount;
      
      if (transactionAmount < 0) {
        const date = new Date(transaction.date);
        const hour = date.getHours();
        const amount = Math.abs(transactionAmount);
        
        if (hour >= 6 && hour < 12) {
          timeGroups.morning.count++;
          timeGroups.morning.amount += amount;
        } else if (hour >= 12 && hour < 17) {
          timeGroups.afternoon.count++;
          timeGroups.afternoon.amount += amount;
        } else if (hour >= 17 && hour < 21) {
          timeGroups.evening.count++;
          timeGroups.evening.amount += amount;
        } else {
          timeGroups.night.count++;
          timeGroups.night.amount += amount;
        }
      }
    });
    
    return timeGroups;
  };
  
  const timeOfDaySpending = getSpendingByTimeOfDay();
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    console.log("Manual refresh triggered");
    fetchTransactionData()
      .then(() => {
        // Exchange rates will be fetched by the useEffect that watches transactions
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  // Fetch transaction data with selected date range
  const fetchTransactionData = async () => {
    if (!user) return;
    
    try {
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
        userId: user.uid,
        includeStats: true // Add this to get category stats
      });
      
      // Fetch transactions from the hook
      await fetchTransactions();
      console.log("Fetched transactions count:", transactions.length);
      
      // Currency conversion will be triggered by the useEffect watching transactions
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-4 md:p-6">
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Analytics</h1>
          <p className="text-muted-foreground">Deep insights into your spending patterns</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm"
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{baseCurrency}</span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Debug button - only show in non-production */}
          {process.env.NODE_ENV !== 'production' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Compute stats directly for debugging
                const stats = computeExpenseStats();
                
                // Get category counts
                const categoryNames = categoryData.map(c => c.name);
                const uniqueCategories = new Set(convertedTransactions.map(t => t.category));
                
                console.log({
                  transactions: transactions.length,
                  convertedTransactions: convertedTransactions.length,
                  stats,
                  uniqueCategories: Array.from(uniqueCategories),
                  displayedCategories: categoryNames,
                  exchangeRates,
                  timeSeriesData: timeSeriesData.length,
                  categoryData: categoryData.length,
                  baseCurrency,
                  settings
                });
                
                // Force refresh all data
                fetchTransactionData();
              }}
            >
              Debug
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="overview" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-7 w-24" /> : formatCurrency(totalExpenses, baseCurrency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  in the last {dateRange} days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-7 w-24" /> : categoryData.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  unique spending categories
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <div className="text-2xl font-bold">
                  {loading ? 
                    <Skeleton className="h-7 w-24" /> : 
                    formatCurrency(totalExpenses / parseInt(dateRange), baseCurrency)
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  average daily spending
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <div className="text-2xl font-bold">
                  {loading ? 
                    <Skeleton className="h-7 w-24" /> : 
                    totalIncome > 0 ? `${((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1)}%` : "0%"
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of income saved
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Spending Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                Spending Trends
              </CardTitle>
              <CardDescription>Your expense patterns over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : timeSeriesData.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center">
                    <CircleSlash className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No transaction data available</p>
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
          
          {/* Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-4 w-4" />
                  Category Breakdown
                </CardTitle>
                <CardDescription>Where your money is going</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : categoryData.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-center">
                      <CircleSlash className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No category data available</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full">
                    <CategoryPieChart 
                      data={categoryData.map(c => ({ 
                        name: c.name, 
                        value: c.value,
                        currency: baseCurrency
                      }))} 
                      colors={categoryData.map(c => c.color)}
                      baseCurrency={baseCurrency}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GanttChartSquare className="mr-2 h-4 w-4" />
                  Top Spending Categories
                </CardTitle>
                <CardDescription>Your biggest expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-h-[500px] overflow-auto pr-2">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-[50px] w-full" />
                    ))
                  ) : categoryData.length === 0 ? (
                    <div className="h-[400px] flex items-center justify-center">
                      <p className="text-muted-foreground">No category data available</p>
                    </div>
                  ) : (
                    // Show all categories instead of just top 5
                    categoryData.map((category, index) => {
                      const CategoryIcon = getCategoryIcon(category.name);
                      const percentage = (category.value / totalExpenses) * 100;
                      
                      // Debug - log each category
                      console.log(`Category ${index}: ${category.name}, Amount: ${category.value}`);
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: category.color }}>
                                <CategoryIcon className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium">{category.name}</div>
                                <div className="text-xs text-muted-foreground">{category.count} transactions</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatCurrency(category.value, baseCurrency)}</div>
                              <Badge variant="outline" className="ml-2">{percentage.toFixed(1)}%</Badge>
                            </div>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-6">
          {/* Category List */}
          <Card>
            <CardHeader>
              <CardTitle>All Spending Categories</CardTitle>
              <CardDescription>Detailed breakdown of your expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-[50px] w-full" />
                  ))
                ) : categoryData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-muted-foreground">No category data available</p>
                  </div>
                ) : (
                  categoryData.map((category, index) => {
                    const CategoryIcon = getCategoryIcon(category.name);
                    const percentage = (category.value / totalExpenses) * 100;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: category.color }}>
                              <CategoryIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="text-xs text-muted-foreground">{category.count} transactions</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(category.value, baseCurrency)}</div>
                            <Badge variant="outline" className="ml-2">{percentage.toFixed(1)}%</Badge>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Spending Patterns</CardTitle>
              <CardDescription>How your spending has changed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-[80px] w-full" />
                  ))
                ) : monthlyData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-muted-foreground">No monthly data available</p>
                  </div>
                ) : (
                  monthlyData.map((month, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-lg">{month.month}</div>
                        <div className="flex items-center gap-2">
                          {month.savingsRate > 0 ? (
                            <Badge className="bg-green-500">{month.savingsRate.toFixed(1)}% saved</Badge>
                          ) : (
                            <Badge variant="destructive">No savings</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div className="flex items-center">
                          <ArrowRightIcon className="text-green-500 h-5 w-5 mr-2" />
                          <div>
                            <div className="text-sm font-medium">Income</div>
                            <div className="text-lg">{formatCurrency(month.income, baseCurrency)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <TrendingDown className="text-red-500 h-5 w-5 mr-2" />
                          <div>
                            <div className="text-sm font-medium">Expenses</div>
                            <div className="text-lg">{formatCurrency(month.expenses, baseCurrency)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <DollarSign className={`${month.savings >= 0 ? 'text-green-500' : 'text-red-500'} h-5 w-5 mr-2`} />
                          <div>
                            <div className="text-sm font-medium">Net</div>
                            <div className="text-lg">{formatCurrency(month.savings, baseCurrency)}</div>
                          </div>
                        </div>
                      </div>
                      
                      <Progress 
                        value={(month.expenses / month.income) * 100} 
                        className={`h-2 ${month.savingsRate > 20 ? 'bg-green-100' : month.savingsRate > 0 ? 'bg-amber-100' : 'bg-red-100'}`} 
                      />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Spending by Time of Day</CardTitle>
              <CardDescription>When you spend the most money</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-[80px] w-full" />
                  ))
                ) : (
                  Object.entries(timeOfDaySpending).map(([timeOfDay, data], index) => {
                    const percentage = totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="font-medium capitalize">{timeOfDay}</div>
                        <div className="text-2xl font-bold">{formatCurrency(data.amount, baseCurrency)}</div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{data.count} transactions</span>
                          <span>{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
          
          <LocationAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
} 