"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock, Loader2 } from "lucide-react"
import useTransactions from "@/hooks/use-transactions"
import { useAuth } from "@/context/AuthContext"
import { formatCurrency } from "@/lib/currency"

interface UpcomingPayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  date: Date;
  daysLeft: number;
  category: string;
}

export function UpcomingPayments() {
  const { user } = useAuth();
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get transaction data - we'll look at the past 90 days to identify recurring payments
  const { transactions, loading: transactionsLoading } = useTransactions({
    userId: user?.uid,
    limit: 1000,
    startDate: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)).toISOString(), // 90 days ago
    endDate: new Date().toISOString(),
    categoryType: 'expense',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Detect recurring transactions and predict upcoming payments
  useEffect(() => {
    if (transactionsLoading || !transactions?.length) return;
    
    setLoading(true);
    
    try {
      // Group transactions by description to find recurring ones
      const txByDescription: Record<string, any[]> = {};
      
      transactions.forEach(tx => {
        if (tx.amount >= 0) return; // Skip income
        
        const key = tx.description.toLowerCase().trim();
        if (!txByDescription[key]) {
          txByDescription[key] = [];
        }
        txByDescription[key].push(tx);
      });
      
      const recurring: UpcomingPayment[] = [];
      const today = new Date();
      
      // Look for transactions that appear multiple times with similar amounts
      Object.entries(txByDescription).forEach(([description, txs]) => {
        // Need at least 2 transactions to consider it recurring
        if (txs.length < 2) return;
        
        // Sort by date (newest first)
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Check for monthly pattern (roughly 30 days apart, similar amounts)
        const latestTx = txs[0];
        const latestDate = new Date(latestTx.date);
        
        // Predict next payment date (add a month to the most recent one)
        const nextDate = new Date(latestDate.getTime());
        nextDate.setMonth(nextDate.getMonth() + 1);
        
        // Calculate days left
        const daysLeft = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Only include if it's upcoming (positive days left) and less than 31 days away
        if (daysLeft >= 0 && daysLeft <= 31) {
          recurring.push({
            id: latestTx._id,
            name: latestTx.description,
            amount: Math.abs(latestTx.amount),
            currency: latestTx.currency,
            date: nextDate,
            daysLeft,
            category: latestTx.category
          });
        }
      });
      
      // Sort by days left (ascending)
      recurring.sort((a, b) => a.daysLeft - b.daysLeft);
      
      // Take top 5
      setUpcomingPayments(recurring.slice(0, 5));
    } catch (error) {
      console.error("Error predicting upcoming payments:", error);
    } finally {
      setLoading(false);
    }
  }, [transactions, transactionsLoading]);

  if (loading || transactionsLoading) {
    return (
      <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle>Upcoming Payments</CardTitle>
          <CardDescription>Scheduled payments for this month</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-36">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Format date in MMM d, yyyy format
  const formatDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle>Upcoming Payments</CardTitle>
        <CardDescription>Predicted recurring payments</CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingPayments.length === 0 ? (
          <div className="flex justify-center items-center h-36 text-center">
            <div>
              <p className="text-sm text-muted-foreground">No upcoming payments detected</p>
              <p className="text-xs text-muted-foreground mt-1">We'll predict payments based on your recurring expenses</p>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          {upcomingPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <CalendarClock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{payment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.date)}
                    </p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(payment.amount, payment.currency)}</p>
                <p className="text-xs text-muted-foreground">
                  {payment.daysLeft === 0
                    ? "Due today"
                    : payment.daysLeft === 1
                      ? "Due tomorrow"
                      : `${payment.daysLeft} days left`}
                </p>
              </div>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
