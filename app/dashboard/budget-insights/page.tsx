"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, RefreshCw, Sparkles, Activity, CheckCircle2, AlertCircle, Lightbulb, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import useTransactions from "@/hooks/use-transactions";
import { formatCurrency, convertCurrency, getCurrencySymbol, CURRENCIES, getAttributionLink } from "@/lib/currency";
import { CATEGORIES, getCategoryColor, getCategoryIcon } from "@/lib/transactionCategories";
import useUserSettings from "@/hooks/use-user-settings";
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
  lastUpdated?: number; // Timestamp for cache invalidation
}

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export default function BudgetInsightsPage() {
  const { settings } = useUserSettings();
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
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, number>>({});

  // Get user's base currency from settings
  const baseCurrency = settings?.baseCurrency || "USD";

  // Get current month's transactions
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { transactions, loading: transactionsLoading } = useTransactions({
    startDate: startOfMonth.toISOString(),
    endDate: endOfMonth.toISOString(),
    includeStats: true
  });

  // Load cached insights on mount
  useEffect(() => {
    const loadCachedInsights = () => {
      try {
        const cached = localStorage.getItem('aiInsights');
        if (cached) {
          const parsedCache = JSON.parse(cached) as AIInsights;
          
          // Check if cache is still valid (within 24 hours)
          if (parsedCache.lastUpdated && 
              Date.now() - parsedCache.lastUpdated < CACHE_DURATION) {
            setAiInsights(parsedCache);
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('Error loading cached insights:', error);
        return false;
      }
    };

    if (!aiInsights) {
      loadCachedInsights();
    }
  }, []);

  // Convert amount to base currency
  const convertToBaseCurrency = async (amount: number, fromCurrency: string) => {
    if (fromCurrency === baseCurrency) return amount;
    
    try {
      const converted = await convertCurrency(amount, fromCurrency, baseCurrency);
      return converted;
    } catch (error) {
      console.error(`Error converting from ${fromCurrency} to ${baseCurrency}:`, error);
      return amount; // Fallback to original amount
    }
  };

  useEffect(() => {
    if (!transactionsLoading && transactions) {
      calculateInsights();
    }
  }, [transactions, transactionsLoading, baseCurrency]);

  const calculateInsights = async () => {
    // Convert all amounts to base currency first
    const convertedTransactions = await Promise.all(
      transactions.map(async (t) => ({
        ...t,
        convertedAmount: await convertToBaseCurrency(t.amount, t.currency || baseCurrency)
      }))
    );

    // Calculate total income and expenses in base currency
    const totalIncome = convertedTransactions
      .filter(t => t.convertedAmount > 0)
      .reduce((sum, t) => sum + t.convertedAmount, 0);

    const totalExpenses = convertedTransactions
      .filter(t => t.convertedAmount < 0)
      .reduce((sum, t) => sum + Math.abs(t.convertedAmount), 0);

    // Calculate category breakdown with converted amounts
    const categoryGroups: Record<string, { amount: number; count: number }> = {};
    
    convertedTransactions.forEach(transaction => {
      if (transaction.convertedAmount < 0) { // Only expenses
        const category = transaction.category || "Other";
        categoryGroups[category] = categoryGroups[category] || { amount: 0, count: 0 };
        categoryGroups[category].amount += Math.abs(transaction.convertedAmount);
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

    // Store converted amounts for reference
    setConvertedAmounts({
      totalIncome,
      totalExpenses
    });

    // Calculate financial health metrics using converted amounts
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

  const generateAIInsights = async (forceRefresh = false) => {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cached = localStorage.getItem('aiInsights');
        if (cached) {
          const parsedCache = JSON.parse(cached) as AIInsights;
          if (parsedCache.lastUpdated && 
              Date.now() - parsedCache.lastUpdated < CACHE_DURATION) {
            setAiInsights(parsedCache);
            return;
          }
        }
      }

      setLoadingAi(true);
      
      // Use converted amounts for AI analysis
      const analysisData = {
        transactions: transactions.map(t => ({
          amount: convertedAmounts[t.id] || t.amount,
          category: t.category,
          description: t.description,
          date: t.date,
          currency: baseCurrency, // Use base currency for analysis
          isRecurring: t.isRecurring
        })),
        categoryStats,
        financialHealth,
        totalTransactions: transactions.length,
        topCategories: categoryStats.slice(0, 3),
        savingsRate: financialHealth.savingsRate,
        debtToIncome: financialHealth.debtToIncome,
        emergencyFundMonths: financialHealth.emergencyFundMonths,
        totalIncome: convertedAmounts.totalIncome,
        totalExpenses: convertedAmounts.totalExpenses,
        baseCurrency // Add base currency info for context
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

      // Ensure the response matches our interface and add timestamp
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
          : [],
        lastUpdated: Date.now()
      };

      // Cache the insights
      localStorage.setItem('aiInsights', JSON.stringify(insights));
      setAiInsights(insights);

    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Fallback to basic insights if AI fails
      const fallbackInsights: AIInsights = {
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
        ],
        lastUpdated: Date.now()
      };
      
      localStorage.setItem('aiInsights', JSON.stringify(fallbackInsights));
      setAiInsights(fallbackInsights);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (!loading && transactions.length > 0) {
      generateAIInsights(false); // Don't force refresh on initial load
    }
  }, [loading, transactions]);

  // Get attribution link
  const attribution = getAttributionLink();

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
            <h2 className="text-3xl font-bold tracking-tight">Budget Insights</h2>
            <p className="text-muted-foreground">
              Detailed analysis of your spending patterns and financial health
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm text-muted-foreground">
              All amounts in {getCurrencySymbol(baseCurrency)}{baseCurrency}
            </span>
            <a 
              href={attribution.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:underline"
            >
              {attribution.text}
            </a>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Health Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <Progress value={financialHealth.score} className="h-4 w-32" />
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
                  <CardTitle>Top Spending Categories</CardTitle>
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
                              <span>{stat.category}</span>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrency(stat.amount, baseCurrency)}
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
                  <CardTitle>Spending Distribution</CardTitle>
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
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Category Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryStats.map((stat) => (
                      <div key={stat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>{stat.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {stat.count} transactions
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>{formatCurrency(stat.amount, baseCurrency)}</span>
                          <span>{stat.percentage.toFixed(1)}% of total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Health Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Savings Rate</h4>
                      <p className="text-sm text-muted-foreground">
                        {financialHealth.savingsRate >= 20 
                          ? "Excellent! You're saving more than the recommended 20%."
                          : financialHealth.savingsRate >= 10
                          ? "Good progress. Consider increasing your savings rate to 20%."
                          : "Consider increasing your savings rate. Aim for at least 10%."}
                      </p>
                      </div>
                    <div>
                      <h4 className="font-medium">Debt-to-Income Ratio</h4>
                      <p className="text-sm text-muted-foreground">
                        {financialHealth.debtToIncome <= 30
                          ? "Excellent! Your debt-to-income ratio is healthy."
                          : financialHealth.debtToIncome <= 50
                          ? "Manageable. Consider reducing your debt load."
                          : "High debt-to-income ratio. Focus on debt reduction."}
                      </p>
                      </div>
                    <div>
                      <h4 className="font-medium">Emergency Fund</h4>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Spending Patterns Card */}
              <Card className="col-span-full lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <CardTitle>Spending Patterns Analysis</CardTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => generateAIInsights(true)}
                      disabled={loadingAi}
                    >
                      {loadingAi ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <CardDescription>
                    Detailed analysis of your spending habits and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAi ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Analyzing your spending patterns...</p>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-6">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="text-lg">{aiInsights.spendingPatterns.analysis}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <h4 className="font-medium">Top Spending Categories</h4>
                          <ul className="space-y-2">
                            {aiInsights.spendingPatterns.topCategories.map((category, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Badge variant="outline" className="w-full justify-between">
                                  <span>{category}</span>
                                  <ArrowUpRight className="h-3 w-3" />
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Monthly Trend</h4>
                          <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm">{aiInsights.spendingPatterns.monthlyTrend}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No spending analysis available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Savings Opportunities Card */}
              <Card className="col-span-full lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>Savings Opportunities</CardTitle>
                  </div>
                  <CardDescription>
                    Potential areas to optimize your spending
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAi ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-muted-foreground">Calculating savings...</p>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm">{aiInsights.savingsOpportunities.analysis}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Target Categories</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {aiInsights.savingsOpportunities.categories.map((category, index) => (
                            <Badge key={index} variant="secondary" className="justify-center">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Potential Monthly Savings:</span>
                          <Badge variant="outline" className="font-mono">
                            {aiInsights.savingsOpportunities.potentialSavings}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No savings opportunities found
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Health Card */}
              <Card className="col-span-full lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle>Financial Health Assessment</CardTitle>
                  </div>
                  <CardDescription>
                    Comprehensive evaluation of your financial status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAi ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-muted-foreground">Assessing financial health...</p>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <div className="flex items-center gap-4">
                            <div className="text-4xl font-bold text-primary">
                              {aiInsights.financialHealth.score}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Financial Health Score
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <h4 className="font-medium">Strengths</h4>
                          <ul className="space-y-2">
                            {aiInsights.financialHealth.strengths.map((strength, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Areas for Improvement</h4>
                          <ul className="space-y-2">
                            {aiInsights.financialHealth.areasForImprovement.map((area, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">{area}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No financial health data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Personalized Recommendations Card */}
              <Card className="col-span-full lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <CardTitle>Smart Recommendations</CardTitle>
                  </div>
                  <CardDescription>
                    Tailored suggestions for your financial goals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAi ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-muted-foreground">Generating recommendations...</p>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-4">
                      {aiInsights.personalizedRecommendations.map((rec, index) => (
                        <div key={index} className="p-3 rounded-lg border">
                          <div className="flex items-start gap-3">
                            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                              <Zap className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{rec.recommendation}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {rec.feature}
                                </Badge>
                                <span>•</span>
                                <span>{rec.impact}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No recommendations available
                    </div>
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

// Add TypeScript interface for Transaction
interface Transaction {
  id?: string;
  amount: number;
  category?: string;
  description?: string;
  date: string;
  currency?: string;
  isRecurring?: boolean;
} 