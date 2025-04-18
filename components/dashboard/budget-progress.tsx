"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import useTransactions from "@/hooks/use-transactions"
import useUserSettings from "@/hooks/use-user-settings"
import { formatCurrency } from "@/lib/currency"
import axios from "axios"

interface Budget {
  category: string;
  amount: number;
}

interface BudgetProgress {
  name: string;
  spent: number;
  budget: number;
  currency: string;
  percentage: number;
}

export function BudgetProgress() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetCategories, setBudgetCategories] = useState<BudgetProgress[]>([]);
  
  // Get current month's date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Fetch transactions for the current month
  const { transactions, isLoading: transactionsLoading } = useTransactions({
    userId: user?.uid,
    startDate: startOfMonth.toISOString(),
    endDate: endOfMonth.toISOString(),
    includeStats: true,
    categoryType: 'expense',
    sortBy: 'category',
    limit: 1000, // Get all for this month
  });
  
  // Fetch budget settings
  useEffect(() => {
    const fetchBudgets = async () => {
      if (!user?.uid) return;
      
      try {
        // This would normally be an API call to get user budgets
        // For this example, we'll set some default budgets if none exist
        const response = await axios.get(`/api/users/${user.uid}/budgets`);
        return response.data;
      } catch (error) {
        console.error("Error fetching budgets:", error);
        // Return some default budgets for demo purposes
        return [
          { category: "Housing", amount: 1000 },
          { category: "Food", amount: 500 },
          { category: "Transportation", amount: 300 },
          { category: "Entertainment", amount: 200 },
          { category: "Shopping", amount: 400 }
        ];
      }
    };
    
    const calculateBudgetProgress = async () => {
      try {
        setLoading(true);
        // Get budgets (or default ones if API fails)
        const budgets = await fetchBudgets();
        
        if (!transactions?.length) {
          // If no transactions, just show budgets with 0 spent
          const defaultProgress = budgets.map((budget: Budget) => ({
            name: budget.category,
            spent: 0,
            budget: budget.amount,
            currency: settings?.baseCurrency || "USD",
            percentage: 0
          }));
          
          setBudgetCategories(defaultProgress);
          return;
        }
        
        // Group transactions by category and calculate total spent
        const spentByCategory: Record<string, number> = {};
        
        transactions.forEach(transaction => {
          if (transaction.amount >= 0) return; // Skip income
          
          const category = transaction.category;
          const amount = Math.abs(transaction.amount);
          
          // Convert to base currency if needed
          // In a real app, you'd use proper exchange rates
          const convertedAmount = transaction.currency === settings?.baseCurrency
            ? amount
            : amount; // For simplicity, no conversion here
          
          spentByCategory[category] = (spentByCategory[category] || 0) + convertedAmount;
        });
        
        // Calculate budget progress for each budget category
        const progress = budgets.map((budget: Budget) => {
          const spent = spentByCategory[budget.category] || 0;
          const percentage = Math.min(Math.round((spent / budget.amount) * 100), 100);
          
          return {
            name: budget.category,
            spent,
            budget: budget.amount,
            currency: settings?.baseCurrency || "USD",
            percentage
          };
        });
        
        // Sort by percentage used (descending)
        progress.sort((a, b) => b.percentage - a.percentage);
        
        setBudgetCategories(progress);
      } catch (err) {
        console.error("Error calculating budget progress:", err);
        setError("Failed to load budget data");
      } finally {
        setLoading(false);
      }
    };
    
    // Only calculate once we have transactions data
    if (!transactionsLoading) {
      calculateBudgetProgress();
    }
  }, [user?.uid, transactions, transactionsLoading, settings?.baseCurrency]);
  
  if (loading || transactionsLoading) {
    return (
      <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle>Budget Progress</CardTitle>
          <CardDescription>Your spending against monthly budgets</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle>Budget Progress</CardTitle>
          <CardDescription>Your spending against monthly budgets</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle>Budget Progress</CardTitle>
        <CardDescription>Your spending against monthly budgets</CardDescription>
      </CardHeader>
      <CardContent>
        {budgetCategories.length === 0 ? (
          <div className="flex justify-center items-center h-48 text-center">
            <div>
              <p className="text-sm text-muted-foreground">No budget categories available</p>
              <p className="text-xs text-muted-foreground mt-1">Set up budgets in your settings</p>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          {budgetCategories.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{category.name}</span>
                <span className="text-sm text-muted-foreground">
                    {formatCurrency(category.spent, category.currency)} / {formatCurrency(category.budget, category.currency)}
                </span>
              </div>
              <Progress value={category.percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{category.percentage}% used</span>
                <span>
                    {formatCurrency(category.budget - category.spent, category.currency)} remaining
                </span>
              </div>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
