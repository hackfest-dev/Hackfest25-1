"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import useTransactions from "@/hooks/use-transactions";
import { formatCurrency } from "@/lib/currency";
import { CATEGORIES, getCategoryColor, getCategoryIcon } from "@/lib/transactionCategories";
import { env } from "@/lib/env";

interface CategoryStats {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface FinancialHealth {
  savingsRate: number;
  debtToIncome: number;
  emergencyFundMonths: number;
  score: number;
}

interface AIInsights {
  spendingPatterns: {
    analysis: string;
    topCategories: string[];
    monthlyTrend: string;
    featureRecommendation: string;
  };
  savingsOpportunities: {
    analysis: string;
    categories: string[];
    potentialSavings: string;
    featureRecommendation: string;
  };
  financialHealth: {
    score: string;
    strengths: string[];
    areasForImprovement: string[];
    featureRecommendation: string;
  };
  personalizedRecommendations: Array<{
    recommendation: string;
    feature: string;
    impact: string;
  }>;
}

export default function BudgetInsightsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealth>({
    savingsRate: 0,
    debtToIncome: 0,
    emergencyFundMonths: 0,
    score: 0
  });
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Get current month's transactions
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { transactions, loading: transactionsLoading } = useTransactions({
    startDate: startOfMonth.toISOString(),
    endDate: endOfMonth.toISOString(),
    includeStats: true
  });

  useEffect(() => {
    if (!transactionsLoading && transactions) {
      calculateInsights();
    }
  }, [transactions, transactionsLoading]);

  const calculateInsights = () => {
    // Calculate total income and expenses
    const totalIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate category breakdown
    const categoryGroups: Record<string, { amount: number; count: number }> = {};
    
    transactions.forEach(transaction => {
      if (transaction.amount < 0) { // Only expenses
        const category = transaction.category || "Other";
        categoryGroups[category] = categoryGroups[category] || { amount: 0, count: 0 };
        categoryGroups[category].amount += Math.abs(transaction.amount);
        categoryGroups[category].count += 1;
      }
    });

    // Convert to array and calculate percentages
    const stats = Object.entries(categoryGroups).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: (data.amount / totalExpenses) * 100,
      count: data.count
    })).sort((a, b) => b.amount - a.amount);

    setCategoryStats(stats);

    // Calculate financial health metrics
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    const debtToIncome = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    const emergencyFundMonths = totalExpenses > 0 ? (totalIncome - totalExpenses) / (totalExpenses / 12) : 0;
    
    // Calculate financial health score (0-100)
    const score = Math.min(100, Math.max(0, 
      (savingsRate * 0.4) + // 40% weight on savings rate
      ((100 - debtToIncome) * 0.3) + // 30% weight on debt-to-income
      (Math.min(emergencyFundMonths, 6) * 10) // 30% weight on emergency fund (max 6 months)
    ));

    setFinancialHealth({
      savingsRate,
      debtToIncome,
      emergencyFundMonths,
      score
    });

    setLoading(false);
  };

  const generateAIInsights = async () => {
    try {
      setLoadingAi(true);
      
      // Prepare data for AI analysis
      const analysisData = {
        transactions: transactions.map(t => ({
          amount: t.amount,
          category: t.category,
          description: t.description,
          date: t.date,
          currency: t.currency,
          isRecurring: t.isRecurring
        })),
        categoryStats,
        financialHealth,
        totalTransactions: transactions.length,
        topCategories: categoryStats.slice(0, 3),
        savingsRate: financialHealth.savingsRate,
        debtToIncome: financialHealth.debtToIncome,
        emergencyFundMonths: financialHealth.emergencyFundMonths,
        totalIncome: transactions
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: transactions
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      };

      // Call our API route
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || 'Failed to generate AI insights');
      }

      // Ensure the response matches our interface
      const insights: AIInsights = {
        spendingPatterns: {
          analysis: data.spendingPatterns?.analysis || "No spending analysis available",
          topCategories: data.spendingPatterns?.topCategories || [],
          monthlyTrend: data.spendingPatterns?.monthlyTrend || "No monthly trend data available",
          featureRecommendation: data.spendingPatterns?.featureRecommendation || "No feature recommendation available"
        },
        savingsOpportunities: {
          analysis: data.savingsOpportunities?.analysis || "No savings opportunities analysis available",
          categories: data.savingsOpportunities?.categories || [],
          potentialSavings: data.savingsOpportunities?.potentialSavings || "No potential savings calculated",
          featureRecommendation: data.savingsOpportunities?.featureRecommendation || "No feature recommendation available"
        },
        financialHealth: {
          score: data.financialHealth?.score || "No score available",
          strengths: data.financialHealth?.strengths || [],
          areasForImprovement: data.financialHealth?.areasForImprovement || [],
          featureRecommendation: data.financialHealth?.featureRecommendation || "No feature recommendation available"
        },
        personalizedRecommendations: Array.isArray(data.personalizedRecommendations) 
          ? data.personalizedRecommendations.map((rec: any) => ({
              recommendation: rec.recommendation || "No recommendation available",
              feature: rec.feature || "No feature specified",
              impact: rec.impact || "No impact specified"
            }))
          : []
      };

      setAiInsights(insights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Fallback to basic insights if AI fails
      setAiInsights({
        spendingPatterns: {
          analysis: "Unable to generate AI insights at this time. Please try again later.",
          topCategories: [],
          monthlyTrend: "No trend data available",
          featureRecommendation: "Transaction Management"
        },
        savingsOpportunities: {
          analysis: "We're experiencing technical difficulties with our AI service.",
          categories: [],
          potentialSavings: "No savings calculated",
          featureRecommendation: "Budget Analysis"
        },
        financialHealth: {
          score: "No score available",
          strengths: [],
          areasForImprovement: [],
          featureRecommendation: "Financial Health Metrics"
        },
        personalizedRecommendations: [
          {
            recommendation: "Check back later for personalized recommendations.",
            feature: "Transaction Management",
            impact: "Improved financial visibility"
          },
          {
            recommendation: "In the meantime, review your spending patterns manually.",
            feature: "Budget Analysis",
            impact: "Better spending management"
          },
          {
            recommendation: "Consider setting up a basic budget if you haven't already.",
            feature: "Budget Planning",
            impact: "Better financial control"
          }
        ]
      });
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (!loading && transactions.length > 0) {
      generateAIInsights();
    }
  }, [loading, transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Budget Insights</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Detailed analysis of your spending patterns and financial health
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Financial Health Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="relative w-full max-w-xs">
                      <Progress value={financialHealth.score} className="h-4 w-full" />
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                        {Math.round(financialHealth.score)}/100
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Savings Rate</span>
                      <span>{financialHealth.savingsRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Debt-to-Income</span>
                      <span>{financialHealth.debtToIncome.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Emergency Fund</span>
                      <span>{financialHealth.emergencyFundMonths.toFixed(1)} months</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Top Spending Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryStats.slice(0, 5).map((stat) => {
                      const Icon = getCategoryIcon(stat.category);
                      return (
                        <div key={stat.category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" style={{ color: getCategoryColor(stat.category) }} />
                              <span className="text-sm">{stat.category}</span>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrency(stat.amount)}
                            </span>
                          </div>
                          <Progress 
                            value={stat.percentage} 
                            className="h-2"
                            style={{ backgroundColor: getCategoryColor(stat.category) }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Spending Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryStats.map((stat) => (
                      <div key={stat.category} className="flex items-center justify-between">
                        <span className="text-sm">{stat.category}</span>
                        <span className="text-sm font-medium">{stat.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Category Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryStats.map((stat) => (
                      <div key={stat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{stat.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {stat.count} transactions
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>{formatCurrency(stat.amount)}</span>
                          <span>{stat.percentage.toFixed(1)}% of total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Financial Health Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm md:text-base">Savings Rate</h4>
                      <p className="text-sm text-muted-foreground">
                        {financialHealth.savingsRate >= 20 
                          ? "Excellent! You're saving more than the recommended 20%."
                          : financialHealth.savingsRate >= 10
                          ? "Good progress. Consider increasing your savings rate to 20%."
                          : "Consider increasing your savings rate. Aim for at least 10%."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm md:text-base">Debt-to-Income Ratio</h4>
                      <p className="text-sm text-muted-foreground">
                        {financialHealth.debtToIncome <= 30
                          ? "Excellent! Your debt-to-income ratio is healthy."
                          : financialHealth.debtToIncome <= 50
                          ? "Manageable. Consider reducing your debt load."
                          : "High debt-to-income ratio. Focus on debt reduction."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm md:text-base">Emergency Fund</h4>
                      <p className="text-sm text-muted-foreground">
                        {financialHealth.emergencyFundMonths >= 6
                          ? "Great! You have a solid emergency fund."
                          : financialHealth.emergencyFundMonths >= 3
                          ? "Good start. Aim for 6 months of expenses."
                          : "Consider building your emergency fund to cover 3-6 months of expenses."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">AI-Powered Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAi ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-sm md:text-base">Spending Analysis</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          {aiInsights.spendingPatterns.analysis}
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Top Categories:</h5>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {aiInsights.spendingPatterns.topCategories.map((category, index) => (
                              <li key={index}>{category}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Monthly Trend:</h5>
                          <p className="text-sm text-muted-foreground">
                            {aiInsights.spendingPatterns.monthlyTrend}
                          </p>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Feature Recommendation:</h5>
                          <p className="text-sm text-muted-foreground">
                            {aiInsights.spendingPatterns.featureRecommendation}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm md:text-base">Savings Opportunities</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          {aiInsights.savingsOpportunities.analysis}
                        </p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Target Categories:</h5>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {aiInsights.savingsOpportunities.categories.map((category, index) => (
                              <li key={index}>{category}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Potential Monthly Savings:</h5>
                          <p className="text-sm text-muted-foreground">
                            {aiInsights.savingsOpportunities.potentialSavings}
                          </p>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Feature Recommendation:</h5>
                          <p className="text-sm text-muted-foreground">
                            {aiInsights.savingsOpportunities.featureRecommendation}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm md:text-base">Financial Health Assessment</h4>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Current Score:</h5>
                          <p className="text-sm text-muted-foreground">
                            {aiInsights.financialHealth.score}
                          </p>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Strengths:</h5>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {aiInsights.financialHealth.strengths.map((strength, index) => (
                              <li key={index}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Areas for Improvement:</h5>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {aiInsights.financialHealth.areasForImprovement.map((area, index) => (
                              <li key={index}>{area}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Feature Recommendation:</h5>
                          <p className="text-sm text-muted-foreground">
                            {aiInsights.financialHealth.featureRecommendation}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm md:text-base">Personalized Recommendations</h4>
                        <ul className="mt-2 space-y-4">
                          {aiInsights.personalizedRecommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              <div className="font-medium">{rec.recommendation}</div>
                              <div className="mt-1">
                                <span className="text-xs">Feature to use: </span>
                                <span className="text-xs font-medium">{rec.feature}</span>
                              </div>
                              <div className="mt-1">
                                <span className="text-xs">Expected impact: </span>
                                <span className="text-xs">{rec.impact}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Unable to generate insights at this time.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 