"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Loader2 } from "lucide-react"
import useTransactions from "@/hooks/use-transactions"
import { useAuth } from "@/context/AuthContext"
import { formatCurrency } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { useGPSLocation } from '@/hooks/use-gps-location'
import useUserSettings from '@/hooks/use-user-settings'

interface LocationExpense {
  location: string;
  housing: number;
  food: number;
  transport: number;
  entertainment: number;
  other: number;
}

export function ExpensesByLocation() {
  const { user } = useAuth();
  const { location: gpsLocation } = useGPSLocation();
  const { transactions } = useTransactions();
  const { settings } = useUserSettings();
  const [period, setPeriod] = useState(90); // Last 90 days by default
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - period);
  
  // Fetch transactions for the date range
  const { updateFilters, fetchTransactions } = useTransactions({
    userId: user?.uid,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    categoryType: 'expense',
    includeStats: true,
    limit: 1000, // Get enough transactions to aggregate
  });

  // Group and aggregate transaction data by location
  const [locationStats, setLocationStats] = useState<any[]>([]);

  // Update filters when period changes
  useEffect(() => {
    if (!user?.uid) return;
    
    const newEndDate = new Date();
    const newStartDate = new Date();
    newStartDate.setDate(newEndDate.getDate() - period);
    
    updateFilters({
      startDate: newStartDate.toISOString(),
      endDate: newEndDate.toISOString(),
      categoryType: 'expense'
    });
  }, [period, user?.uid, updateFilters]);

  useEffect(() => {
    if (!transactions || !settings?.baseCurrency) return;

    // Group transactions by location
    const locationMap = new Map();

    transactions.forEach(transaction => {
      if (!transaction.location?.city || !transaction.location?.country) return;

      const locationKey = `${transaction.location.city}, ${transaction.location.country}`;
      const existing = locationMap.get(locationKey) || {
        city: transaction.location.city,
        country: transaction.location.country,
        total: 0,
        count: 0,
        isCurrentLocation: gpsLocation && 
          transaction.location.city === gpsLocation.city && 
          transaction.location.country === gpsLocation.country
      };

      existing.total += transaction.convertedAmount || transaction.amount;
      existing.count += 1;
      locationMap.set(locationKey, existing);
    });

    // Convert map to array and sort by total amount
    const stats = Array.from(locationMap.values())
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .map(stat => ({
        ...stat,
        averagePerTransaction: stat.total / stat.count
      }));

    setLocationStats(stats);
  }, [transactions, settings?.baseCurrency, gpsLocation]);

  // Define period options
  const periodOptions = [
    { label: "Last 30 days", value: 30 },
    { label: "Last 90 days", value: 90 },
    { label: "Last 6 months", value: 180 },
    { label: "Last year", value: 365 },
  ];

  // Function to change period
  const handlePeriodChange = (newPeriod: number) => {
    setPeriod(newPeriod);
  };

  return (
    <Card className="col-span-1 bg-white dark:bg-background border shadow-sm hover:shadow-md transition-all">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle>Expenses by Location</CardTitle>
            <CardDescription>Compare your spending across different cities</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 justify-start sm:justify-end mt-2 sm:mt-0">
            {periodOptions.map((option) => (
              <Button 
                key={option.value}
                variant={period === option.value ? "default" : "outline"} 
                size="sm"
                className="text-xs h-7"
                onClick={() => handlePeriodChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>
          <TabsContent value="chart" className="pt-4">
            {locationStats.length === 0 ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No location data available</p>
                  <p className="text-xs text-muted-foreground mt-1">Add transactions with location information to see your spending patterns</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px] w-full overflow-x-auto">
              <ChartContainer
                config={{
                  housing: {
                    label: "Housing",
                    color: "hsl(var(--chart-1))",
                  },
                  food: {
                    label: "Food",
                    color: "hsl(var(--chart-2))",
                  },
                  transport: {
                    label: "Transport",
                    color: "hsl(var(--chart-3))",
                  },
                  entertainment: {
                    label: "Entertainment",
                    color: "hsl(var(--chart-4))",
                  },
                    other: {
                      label: "Other",
                      color: "hsl(var(--chart-5, 200 70% 50%))",
                  },
                }}
              >
                  <BarChart 
                    accessibilityLayer 
                    data={locationStats} 
                    margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                    layout="vertical"
                    width={locationStats.length > 3 ? 550 : undefined}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="city" 
                      type="category"
                      tickLine={false} 
                      axisLine={false} 
                      width={80}
                      tick={{ fontSize: 12 }}
                    />
                  <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                    <Bar dataKey="total" fill="var(--color-housing)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
            )}
          </TabsContent>
          <TabsContent value="map" className="pt-4">
            <div className="space-y-4">
              {locationStats.map((stat, index) => (
                <div key={`${stat.city}-${stat.country}`} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${stat.isCurrentLocation ? 'bg-blue-500' : 'bg-slate-500'}`}>
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {stat.city}, {stat.country}
                        {stat.isCurrentLocation && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Current Location</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stat.count} transactions
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(stat.total)}</div>
                    <div className="text-sm text-muted-foreground">
                      Avg: {formatCurrency(stat.averagePerTransaction)}
                    </div>
                  </div>
                </div>
              ))}

              {locationStats.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No location data available</p>
                  <p className="text-sm">Add transactions with location information to see your spending patterns</p>
              </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
