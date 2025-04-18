"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDateRangePicker } from "@/components/DateRangePicker";
import BudgetSuggestions from "@/components/BudgetSuggestions";
import { useAuth } from "@/context/AuthContext";
import { Loader2, TrendingUp, PiggyBank, LineChart, DollarSign, Info, Plus, Target, Check, PieChart as PieChartIcon } from "lucide-react";
import useTransactions from "@/hooks/use-transactions";
import useUserSettings from "@/hooks/use-user-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { SpendingChart, CategoryPieChart } from "@/components/dashboard/charts";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/currency";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import axios from "axios";

export default function BudgetInsightsPage() {
  const { user } = useAuth();
  const { settings, loading: loadingSettings } = useUserSettings();
  const { fetchTransactions, stats, loading } = useTransactions();
  
  // Create a date 3 months in the past
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: threeMonthsAgo,
    to: new Date(),
  });

  // Budget goals state
  const [budgetGoals, setBudgetGoals] = useState<{
    [category: string]: number
  }>({
    "Food & Dining": 500,
    "Housing": 1200,
    "Transportation": 300,
    "Entertainment": 200,
    "Shopping": 150
  });
  
  const [budgetModal, setBudgetModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("");
  const [currentBudget, setCurrentBudget] = useState(0);
  const [autoAdjust, setAutoAdjust] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState(20); // Percentage
  const [savingsAmount, setSavingsAmount] = useState(0);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [customStats, setCustomStats] = useState<any>({
    timeSeries: [],
    categoryStats: []
  });

  // Format the date range for API calls
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };
  
  const formattedDateRange = {
    startDate: dateRange.from ? formatDate(dateRange.from) : undefined,
    endDate: dateRange.to ? formatDate(dateRange.to) : undefined,
  };

  const handleDateChange = (date: { from: Date | undefined; to?: Date | undefined }) => {
    setDateRange({
      from: date.from || new Date(),
      to: date.to || new Date()
    });
  };
  
  // Get user's base currency
  const baseCurrency = settings?.baseCurrency || "USD";
  
  // Fetch transaction stats manually 
  const fetchTransactionStats = async () => {
    if (!user?.uid) return;
    
    setStatsLoading(true);
    try {
      const response = await axios.get('/api/transactions', {
        params: {
          userId: user.uid,
          startDate: formattedDateRange.startDate,
          endDate: formattedDateRange.endDate,
          includeStats: true,
          groupBy: "day"
        }
      });
      
      setCustomStats(response.data);
    } catch (error) {
      console.error("Error fetching transaction stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };
  
  // Prepare data for visualizations
  useEffect(() => {
    if (user?.uid && formattedDateRange.startDate && formattedDateRange.endDate) {
      // Fetch transaction data
      fetchTransactionStats();
    }
  }, [user, formattedDateRange.startDate, formattedDateRange.endDate]);
  
  // Process data for visualizations once stats are loaded
  useEffect(() => {
    if (!statsLoading && customStats) {
      // Process time series data for spending chart
      if (customStats.timeSeries && customStats.timeSeries.length > 0) {
        const chartData = customStats.timeSeries.map((item: any) => ({
          date: item.date,
          income: item.income || 0,
          expenses: item.expenses || 0,
          total: (item.income || 0) + (item.expenses || 0)
        }));
        setTimeSeriesData(chartData);
      }
      
      // Process category data for pie chart
      if (customStats.categoryStats && customStats.categoryStats.length > 0) {
        const catData = customStats.categoryStats
          .filter((cat: any) => cat.amount < 0) // Only show expenses
          .map((cat: any) => ({
            name: cat.category,
            value: Math.abs(cat.amount),
            color: cat.color || "#0088FE"
          }));
        setCategoryData(catData);
        
        // Calculate savings goal amount based on total income
        const totalIncome = customStats.timeSeries?.reduce((sum: number, item: any) => sum + (item.income || 0), 0) || 0;
        setSavingsAmount(totalIncome * (savingsGoal / 100));
      }
    }
  }, [customStats, statsLoading, savingsGoal]);
  
  // Handle budget goal update
  const handleUpdateBudget = () => {
    if (currentCategory && currentBudget >= 0) {
      setBudgetGoals({
        ...budgetGoals,
        [currentCategory]: currentBudget
      });
      
      if (autoAdjust) {
        // Auto-adjust other categories to maintain total budget
        const totalBudget = Object.values(budgetGoals).reduce((sum, val) => sum + val, 0);
        const otherCategories = Object.keys(budgetGoals).filter(cat => cat !== currentCategory);
        const oldCategoryValue = budgetGoals[currentCategory] || 0;
        const difference = currentBudget - oldCategoryValue;
        
        if (difference !== 0 && otherCategories.length > 0) {
          const adjustmentPerCategory = difference / otherCategories.length;
          const newBudgetGoals = { ...budgetGoals, [currentCategory]: currentBudget };
          
          otherCategories.forEach(cat => {
            newBudgetGoals[cat] = Math.max(0, newBudgetGoals[cat] - adjustmentPerCategory);
          });
          
          setBudgetGoals(newBudgetGoals);
        }
      }
      
      setBudgetModal(false);
    }
  };
  
  // Add new category
  const handleAddCategory = (categoryName: string) => {
    if (categoryName && !budgetGoals[categoryName]) {
      setBudgetGoals({
        ...budgetGoals,
        [categoryName]: 0
      });
      setCurrentCategory(categoryName);
      setCurrentBudget(0);
      setBudgetModal(true);
    }
  };
  
  // Calculate budget usage
  const calculateBudgetUsage = (category: string) => {
    if (!customStats?.categoryStats) return 0;
    
    const categorySpending = customStats.categoryStats.find((cat: any) => cat.category === category);
    if (!categorySpending) return 0;
    
    const spent = Math.abs(categorySpending.amount);
    const budget = budgetGoals[category] || 0;
    
    return budget > 0 ? (spent / budget) * 100 : 0;
  };
  
  // Get category spending amount safely
  const getCategorySpending = (category: string) => {
    if (!customStats?.categoryStats) return 0;
    
    const cat = customStats.categoryStats.find((c: any) => c.category === category);
    return cat ? Math.abs(cat.amount) : 0;
  };
  
  // Generate savings recommendations
  const generateSavingsRecommendations = () => {
    if (!customStats?.categoryStats) return [];
    
    const recommendations = [];
    
    // Check categories that are over budget
    for (const category in budgetGoals) {
      const usage = calculateBudgetUsage(category);
      if (usage > 90) {
        recommendations.push({
          category,
          message: `You've spent ${formatCurrency(getCategorySpending(category), baseCurrency)} on ${category}, which is ${usage.toFixed(0)}% of your ${formatCurrency(budgetGoals[category], baseCurrency)} budget.`,
          type: "warning",
        });
      }
    }
    
    // Check for categories with potential savings
    const totalBudget = Object.values(budgetGoals).reduce((sum, val) => sum + val, 0);
    const totalSpent = customStats.categoryStats
      .filter((cat: any) => cat.amount < 0)
      .reduce((sum: number, cat: any) => sum + Math.abs(cat.amount), 0);
    
    if (totalSpent > totalBudget) {
      recommendations.push({
        category: "Overall",
        message: `You're spending ${formatCurrency(totalSpent - totalBudget, baseCurrency)} more than your total budget.`,
        type: "alert",
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        category: "Overall",
        message: "You're staying within your budget! Consider increasing your savings goal.",
        type: "success",
      });
    }
    
    return recommendations;
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Budget Insights</h2>
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker
              date={dateRange}
              onDateChange={handleDateChange}
            />
          </div>
        </div>
        
        <Tabs defaultValue="suggestions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suggestions">Smart Suggestions</TabsTrigger>
            <TabsTrigger value="analysis">Spending Analysis</TabsTrigger>
            <TabsTrigger value="budgets">Budget Goals</TabsTrigger>
            <TabsTrigger value="savings">Savings Potential</TabsTrigger>
          </TabsList>
          
          <TabsContent value="suggestions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
              <BudgetSuggestions 
                startDate={formattedDateRange.startDate} 
                endDate={formattedDateRange.endDate}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Spending Trends
                  </CardTitle>
                  <CardDescription>
                    Your spending patterns over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex h-[300px] w-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : timeSeriesData.length > 0 ? (
                    <div className="h-[300px]">
                      <SpendingChart 
                        data={timeSeriesData} 
                        baseCurrency={baseCurrency} 
                      />
                    </div>
                  ) : (
                    <div className="flex h-[300px] w-full items-center justify-center flex-col">
                      <LineChart className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-center text-muted-foreground">
                        No spending data available for the selected period
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="mr-2 h-4 w-4" />
                    Category Breakdown
                  </CardTitle>
                  <CardDescription>
                    Where your money is going
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex h-[300px] w-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : categoryData.length > 0 ? (
                    <div className="h-[300px]">
                      <CategoryPieChart 
                        data={categoryData} 
                      />
                    </div>
                  ) : (
                    <div className="flex h-[300px] w-full items-center justify-center flex-col">
                      <PieChartIcon className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-center text-muted-foreground">
                        No category data available for the selected period
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="budgets" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-xl">Budget Goals</CardTitle>
                    <CardDescription>
                      Set and track your spending goals by category
                    </CardDescription>
                  </div>
                  <Dialog open={budgetModal} onOpenChange={setBudgetModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => {
                        setCurrentCategory("");
                        setCurrentBudget(0);
                      }}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Budget
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {currentCategory ? `Update ${currentCategory} Budget` : "Add Budget Category"}
                        </DialogTitle>
                        <DialogDescription>
                          {currentCategory ? 
                            `Set your monthly budget goal for ${currentCategory}` : 
                            "Choose a category and set a budget goal"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        {!currentCategory && (
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select onValueChange={setCurrentCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {["Food & Dining", "Housing", "Transportation", "Entertainment", "Shopping", 
                                  "Personal Care", "Health & Fitness", "Travel", "Education", "Gifts & Donations"].map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="amount">Monthly Budget Amount ({baseCurrency})</Label>
                          <Input 
                            id="amount" 
                            type="number" 
                            min="0" 
                            value={currentBudget} 
                            onChange={(e) => setCurrentBudget(Number(e.target.value))} 
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="auto-adjust" 
                            checked={autoAdjust}
                            onCheckedChange={setAutoAdjust}
                          />
                          <Label htmlFor="auto-adjust">Auto-adjust other categories</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setBudgetModal(false)}>Cancel</Button>
                        <Button onClick={handleUpdateBudget}>Save Budget</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(budgetGoals).map(([category, amount]) => {
                      const usage = calculateBudgetUsage(category);
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{category}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {formatCurrency(amount, baseCurrency)}
                              </span>
                              <Button 
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setCurrentCategory(category);
                                  setCurrentBudget(amount);
                                  setBudgetModal(true);
                                }}
                              >
                                <LineChart className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Progress value={usage} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {formatCurrency(getCategorySpending(category), baseCurrency)} spent
                            </span>
                            <span>{usage.toFixed(0)}% used</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="savings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PiggyBank className="mr-2 h-4 w-4" />
                    Savings Goal
                  </CardTitle>
                  <CardDescription>
                    Set your monthly savings target
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Target savings rate</span>
                      <Badge variant="secondary">{savingsGoal}% of income</Badge>
                    </div>
                    <Slider 
                      value={[savingsGoal]} 
                      min={0}
                      max={50}
                      step={1}
                      onValueChange={(values) => setSavingsGoal(values[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Savings amount</div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(savingsAmount, baseCurrency)}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        per month
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Annual savings</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(savingsAmount * 12, baseCurrency)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="mr-2 h-4 w-4" />
                    Savings Recommendations
                  </CardTitle>
                  <CardDescription>
                    Areas where you could save money
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex h-[300px] w-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {generateSavingsRecommendations().map((rec, index) => (
                        <Alert key={index} variant={rec.type === "alert" ? "destructive" : "default"}>
                          {rec.type === "alert" ? (
                            <Info className="h-4 w-4" />
                          ) : rec.type === "warning" ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <AlertTitle>{rec.category}</AlertTitle>
                          <AlertDescription>
                            {rec.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                      
                      {Object.entries(budgetGoals)
                        .filter(([category]) => calculateBudgetUsage(category) > 0 && calculateBudgetUsage(category) < 70)
                        .slice(0, 3)
                        .map(([category, amount]) => {
                          const usage = calculateBudgetUsage(category);
                          const spent = getCategorySpending(category);
                          const potential = amount - spent;
                          
                          return potential > 0 ? (
                            <Alert key={category} variant="default">
                              <PiggyBank className="h-4 w-4" />
                              <AlertTitle>Potential savings in {category}</AlertTitle>
                              <AlertDescription>
                                You've used {usage.toFixed(0)}% of your {category} budget. 
                                You could save up to {formatCurrency(potential, baseCurrency)} this month.
                              </AlertDescription>
                            </Alert>
                          ) : null;
                        })}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    These recommendations are based on your spending patterns and budget goals. 
                    Adjust your budget goals to see how they affect your potential savings.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 