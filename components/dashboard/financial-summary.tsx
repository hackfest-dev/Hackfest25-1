"use client";

import { useState, useEffect } from "react";
import { ArrowUpCircle, ArrowDownCircle, DollarSign, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, CURRENCIES } from "@/lib/currency";
import useTransactions from "@/hooks/use-transactions";
import useUserSettings from "@/hooks/use-user-settings";
import { Skeleton } from "@/components/ui/skeleton";

interface PeriodOption {
  label: string;
  value: string;
  days: number;
}

const periodOptions: PeriodOption[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "This year", value: "ytd", days: 365 },
];

export function FinancialSummary() {
  const { settings } = useUserSettings();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(periodOptions[1]); // Default to 30 days
  const [activeCurrency, setActiveCurrency] = useState(settings?.baseCurrency || "USD");
  
  // Calculate date range based on selected period
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - selectedPeriod.days);
  
  // Fetch transactions with filters
  const { 
    transactions, 
    stats,
    isLoading,
    error 
  } = useTransactions({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    pageSize: 1000, // We need all transactions for accurate stats
  });
  
  // Update currency when settings change
  useEffect(() => {
    if (settings?.baseCurrency) {
      setActiveCurrency(settings.baseCurrency);
    }
  }, [settings]);
  
  // Calculate summary statistics
  const calculateStats = () => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        biggestExpense: { amount: 0, category: "", date: new Date() },
        biggestIncome: { amount: 0, category: "", date: new Date() },
        avgDailyExpense: 0,
        recentTrend: 0 // Percentage change
      };
    }
    
    // Filter transactions for current period
    const periodTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= startDate && txDate <= endDate;
    });
    
    // Calculate basic metrics
    const incomeTransactions = periodTransactions.filter(t => !t.isExpense);
    const expenseTransactions = periodTransactions.filter(t => t.isExpense);
    
    // Get total amounts
    const totalIncome = stats?.incomeAmount || 
      incomeTransactions.reduce((sum, t) => {
        // Convert all to active currency if needed
        // For simplicity, we're using 1:1 conversion here
        // In a real app, you'd use actual exchange rates
        return sum + (t.currency === activeCurrency ? t.amount : t.amount);
      }, 0);
    
    const totalExpenses = stats?.expenseAmount || 
      expenseTransactions.reduce((sum, t) => {
        return sum + (t.currency === activeCurrency ? t.amount : t.amount);
      }, 0);
    
    // Find biggest transactions
    const biggestExpense = expenseTransactions.length > 0
      ? expenseTransactions.reduce((prev, current) => {
          const prevAmount = prev.currency === activeCurrency ? prev.amount : prev.amount;
          const currentAmount = current.currency === activeCurrency ? current.amount : current.amount;
          return prevAmount > currentAmount ? prev : current;
        })
      : { amount: 0, category: "None", date: new Date() };
      
    const biggestIncome = incomeTransactions.length > 0
      ? incomeTransactions.reduce((prev, current) => {
          const prevAmount = prev.currency === activeCurrency ? prev.amount : prev.amount;
          const currentAmount = current.currency === activeCurrency ? current.amount : current.amount;
          return prevAmount > currentAmount ? prev : current;
        })
      : { amount: 0, category: "None", date: new Date() };
    
    // Average daily expense
    const avgDailyExpense = totalExpenses / selectedPeriod.days;
    
    // Calculate trend (comparing to previous period)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - selectedPeriod.days);
    
    const previousPeriodTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= previousStartDate && txDate < startDate;
    });
    
    const previousExpenses = previousPeriodTransactions
      .filter(t => t.isExpense)
      .reduce((sum, t) => sum + (t.currency === activeCurrency ? t.amount : t.amount), 0);
    
    // Calculate percentage change (prevent divide by zero)
    const recentTrend = previousExpenses > 0
      ? ((totalExpenses - previousExpenses) / previousExpenses) * 100
      : 0;
    
    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      biggestExpense,
      biggestIncome,
      avgDailyExpense,
      recentTrend
    };
  };
  
  const {
    totalIncome,
    totalExpenses,
    balance,
    biggestExpense,
    biggestIncome,
    avgDailyExpense,
    recentTrend
  } = calculateStats();

  if (isLoading) {
    return <SummarySkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Financial Summary</CardTitle>
          <CardDescription>There was a problem loading your financial data.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please try again later or contact support if the problem persists.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>
            {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod.value} onValueChange={(value) => {
            const newPeriod = periodOptions.find(p => p.value === value);
            if (newPeriod) setSelectedPeriod(newPeriod);
          }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={activeCurrency} onValueChange={setActiveCurrency}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} ({currency.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalIncome, activeCurrency)}</div>
              <p className="text-xs text-muted-foreground">
                {transactions?.filter(t => !t.isExpense && new Date(t.date) >= startDate).length || 0} transactions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses, activeCurrency)}</div>
              <p className="text-xs text-muted-foreground">
                {transactions?.filter(t => t.isExpense && new Date(t.date) >= startDate).length || 0} transactions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(balance, activeCurrency)}
              </div>
              <p className="text-xs text-muted-foreground">
                {balance >= 0 ? 'Surplus' : 'Deficit'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Spending Trend</CardTitle>
              {recentTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${recentTrend <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {recentTrend.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                compared to previous {selectedPeriod.label.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Biggest Expense</CardTitle>
            </CardHeader>
            <CardContent>
              {biggestExpense.amount > 0 ? (
                <>
                  <div className="text-xl font-bold">
                    {formatCurrency(biggestExpense.amount, biggestExpense.currency || activeCurrency)}
                  </div>
                  <p className="text-sm">Category: {biggestExpense.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {biggestExpense.date instanceof Date 
                      ? format(biggestExpense.date, "MMMM d, yyyy") 
                      : format(new Date(biggestExpense.date), "MMMM d, yyyy")}
                  </p>
                </>
              ) : (
                <p className="text-sm">No expenses recorded</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Daily Average Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {formatCurrency(avgDailyExpense, activeCurrency)}
              </div>
              <p className="text-xs text-muted-foreground">
                per day over the last {selectedPeriod.days} days
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function SummarySkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <Skeleton className="h-6 w-[150px] mb-2" />
          <Skeleton className="h-4 w-[180px]" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-[80px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array(2).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-[120px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-[100px] mb-2" />
                <Skeleton className="h-4 w-[150px] mb-2" />
                <Skeleton className="h-3 w-[180px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 