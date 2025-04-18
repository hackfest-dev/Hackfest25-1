"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Coffee, Home, ShoppingBag, Train, CreditCard, FilmIcon, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import useTransactions from "@/hooks/use-transactions"
import { useAuth } from "@/context/AuthContext"
import { formatCurrency } from "@/lib/currency"
import format from "date-fns/format"

// Map categories to appropriate icons
const categoryIcons: Record<string, {
  icon: any,
  color: string,
  background: string
}> = {
  "housing": { icon: Home, color: "text-blue-500", background: "bg-blue-100" },
  "rent": { icon: Home, color: "text-blue-500", background: "bg-blue-100" },
  "food": { icon: Coffee, color: "text-amber-500", background: "bg-amber-100" },
  "groceries": { icon: ShoppingBag, color: "text-green-500", background: "bg-green-100" },
  "shopping": { icon: ShoppingBag, color: "text-purple-500", background: "bg-purple-100" },
  "transportation": { icon: Train, color: "text-orange-500", background: "bg-orange-100" },
  "travel": { icon: Train, color: "text-orange-500", background: "bg-orange-100" },
  "entertainment": { icon: FilmIcon, color: "text-pink-500", background: "bg-pink-100" },
};

// Default icon for unknown categories
const defaultIcon = { icon: CreditCard, color: "text-slate-500", background: "bg-slate-100" };

export function RecentTransactions() {
  const { user } = useAuth();
  const [limit, setLimit] = useState(4); // Number of transactions to show
  const [filter, setFilter] = useState("all")
  
  // Fetch recent transactions
  const { transactions, loading, error } = useTransactions({
    userId: user?.uid,
    limit,
    sortBy: "date",
    sortOrder: "desc",
  });

  // Helper function to get the icon based on category
  const getIconForCategory = (category: string) => {
    const lowerCategory = category.toLowerCase();
    
    // Find the first matching category
    for (const [key, value] of Object.entries(categoryIcons)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }
    
    return defaultIcon;
  };

  return (
    <Card className="col-span-1 bg-white border shadow-sm hover:shadow-md transition-all">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest spending activity</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Error loading transactions</p>
          </div>
        ) : transactions?.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center">
              <CreditCard className="h-8 w-8 text-primary/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent transactions</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first transaction to see it here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const { icon: Icon, color, background } = getIconForCategory(transaction.category);
              const isExpense = transaction.amount < 0;
              const formattedAmount = formatCurrency(Math.abs(transaction.amount), transaction.currency);
              
              return (
                <div
                  key={transaction._id}
                  className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${background}`}>
                      {isExpense ? 
                        <Icon className={`h-4 w-4 ${color}`} /> :
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{transaction.category}</p>
                        {transaction.location && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {transaction.location.city}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${isExpense ? 'text-red-500' : 'text-green-500'}`}>
                      {isExpense ? '-' : '+'}{formattedAmount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {transactions.length === limit && (
              <button 
                className="w-full text-xs text-primary hover:text-primary/80 py-2"
                onClick={() => setLimit(prev => prev + 4)}
              >
                Show more transactions
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
