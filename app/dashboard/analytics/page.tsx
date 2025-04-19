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
  ArrowRight,
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
import { LocationTransactionList } from "@/components/dashboard/location-transaction-list";
import useTransactions, { Transaction, TransactionStats as ApiTransactionStats } from "@/hooks/use-transactions";
import { useAuth } from "@/context/AuthContext";
import useUserSettings, { UserSettings } from "@/hooks/use-user-settings";
import { getCategoryIcon } from "@/lib/transactionCategories";
import { getExchangeRate, FALLBACK_RATES, getCurrencySymbol } from "@/lib/currency";

// Add TransactionStats type
interface ExtendedTransactionStats extends ApiTransactionStats {
  previousIncome: number;
  previousExpenses: number;
  previousSavingsRate: number;
}

// Add CategoryData type
interface CategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
}

// Add TimeSpending type
interface TimeSpending {
  count: number;
  amount: number;
}

// Add MonthlyData type
interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  date: Date;
}

// Add PreviousStats type
interface PreviousStats {
  income: number;
  expenses: number;
  savingsRate: number;
}

// Currency formatter function
const formatCurrency = (amount: number, currency: string): string => {
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
    loading: transactionsLoading,
    updateFilters,
    fetchTransactions,
    stats: apiStats,
    error: transactionsError
  } = useTransactions();
  
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30");
  const [refreshing, setRefreshing] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [convertedTransactions, setConvertedTransactions] = useState<Transaction[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [stats, setStats] = useState<ExtendedTransactionStats>({
    total: 0,
    average: 0,
    previousIncome: 0,
    previousExpenses: 0,
    previousSavingsRate: 0,
    categoryStats: []
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
    if (apiStats?.categoryStats && apiStats.categoryStats.length > 0) {
      console.log("Using category stats from API:", apiStats.categoryStats.length);
      
      // Convert stats to the format needed for charts - using exchange rates if needed
      const processedCategoryData = apiStats.categoryStats
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
        color: apiStats?.categoryStats?.find(c => c.category === category)?.color || "#6E56CF"
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
    <div className="space-y-8 p-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Track your financial performance and insights</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={dateRange} onValueChange={setDateRange} className="hidden sm:block">
            <TabsList className="bg-slate-50 dark:bg-slate-900">
              {[
                { value: "7", label: "7D" },
                { value: "30", label: "30D" },
                { value: "90", label: "90D" },
                { value: "365", label: "1Y" }
              ].map((period) => (
                <TabsTrigger
                  key={period.value}
                  value={period.value}
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                >
                  {period.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || transactionsLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Income",
            value: formatCurrency(totalIncome, baseCurrency),
            icon: DollarSign,
            change: percentChange(totalIncome, stats.previousIncome),
            trend: totalIncome > stats.previousIncome ? TrendingUp : TrendingDown,
            description: "vs. previous period"
          },
          {
            title: "Total Expenses",
            value: formatCurrency(totalExpenses, baseCurrency),
            icon: BarChart3,
            change: percentChange(totalExpenses, stats.previousExpenses),
            trend: totalExpenses < stats.previousExpenses ? TrendingUp : TrendingDown,
            description: "vs. previous period"
          },
          {
            title: "Savings Rate",
            value: totalIncome > 0 ? `${((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1)}%` : "0%",
            icon: PieChart,
            change: `${((totalIncome - totalExpenses) / totalIncome * 100 - stats.previousSavingsRate).toFixed(1)}%`,
            trend: ((totalIncome - totalExpenses) / totalIncome) > stats.previousSavingsRate ? TrendingUp : TrendingDown,
            description: "of total income"
          },
          {
            title: "Active Currencies",
            value: Object.keys(exchangeRates).length + 1,
            icon: Globe,
            description: "tracked currencies"
          }
        ].map((card, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {card.title}
              </CardTitle>
              <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-full">
                <card.icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{card.value}</div>
              {card.change && (
                <div className="flex items-center text-sm">
                  <card.trend className={`h-4 w-4 mr-1 ${
                    card.trend === TrendingUp ? "text-green-500" : "text-red-500"
                  }`} />
                  <span className={card.trend === TrendingUp ? "text-green-500" : "text-red-500"}>
                    {card.change}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                    {card.description}
                  </span>
                </div>
              )}
              {!card.change && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {card.description}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Spending Chart - Spans 4 columns */}
        <Card className="lg:col-span-4">
              <CardHeader>
            <CardTitle>Spending Overview</CardTitle>
            <CardDescription>Your income and expenses over time</CardDescription>
              </CardHeader>
          <CardContent>
            {transactionsLoading || loadingRates ? (
              <div className="space-y-3">
                <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : (
              <SpendingChart data={timeSeriesData} />
                )}
              </CardContent>
            </Card>
            
        {/* Category Distribution - Spans 3 columns */}
        <Card className="lg:col-span-3">
              <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Distribution of your spending</CardDescription>
              </CardHeader>
              <CardContent>
            {transactionsLoading || loadingRates ? (
              <div className="space-y-3">
                <Skeleton className="h-[300px] w-full" />
                    </div>
                  ) : (
              <CategoryPieChart data={categoryData.map(c => ({ 
                name: c.name, 
                value: c.value,
                color: c.color
              }))} />
            )}
              </CardContent>
            </Card>
        
        {/* Time of Day Analysis - Spans 3 columns */}
        <Card className="lg:col-span-3">
            <CardHeader>
            <CardTitle>Spending Patterns</CardTitle>
            <CardDescription>When you tend to spend</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              {Object.entries(timeOfDaySpending).map(([timeOfDay, data]) => {
                const totalSpending = Object.values(timeOfDaySpending).reduce((sum, period) => sum + period.amount, 0);
                const percentage = totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0;
                    
                    return (
                  <div key={timeOfDay} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{timeOfDay}</span>
                      <span className="font-medium">{formatCurrency(data.amount, baseCurrency)}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{data.count} transactions</span>
                      <span>{percentage.toFixed(1)}% of total</span>
                    </div>
                      </div>
                    );
              })}
              </div>
            </CardContent>
          </Card>
        
        {/* Monthly Trends - Spans 4 columns */}
        <Card className="lg:col-span-4">
            <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Your financial progress over months</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              {monthlyData.slice(-6).map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{month.month}</span>
                    <div className="flex items-center gap-4">
                      <Badge variant={month.savingsRate >= 20 ? "outline" : "default"}>
                        {month.savingsRate.toFixed(1)}% saved
                      </Badge>
                      <span className="font-medium">
                        {formatCurrency(month.savings, baseCurrency)}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={month.savingsRate} 
                    className={`h-2 ${month.savingsRate >= 20 ? "bg-green-500" : ""}`}
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Income: {formatCurrency(month.income, baseCurrency)}</span>
                    <span>Expenses: {formatCurrency(month.expenses, baseCurrency)}</span>
                        </div>
                      </div>
              ))}
              </div>
            </CardContent>
          </Card>
      </div>
          
      {/* Location Analytics */}
          <Card>
            <CardHeader>
          <CardTitle>Geographic Distribution</CardTitle>
          <CardDescription>Where you spend your money around the world</CardDescription>
            </CardHeader>
            <CardContent>
          <LocationTransactionList
            transactions={convertedTransactions}
            baseCurrency={baseCurrency}
            loading={transactionsLoading || loadingRates}
            error={transactionsError}
            showFilters={true}
            limit={5}
          />
            </CardContent>
          </Card>
    </div>
  );
} 