"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Calendar, Globe, MapPin, PieChart, Calculator, Brain } from "lucide-react";

// Sample destinations with estimated costs
const destinations = [
  { id: "bali", name: "Bali, Indonesia", code: "id", monthlyTotal: 1450, housing: 600, food: 350, transport: 150, entertainment: 200, workspace: 120, other: 30 },
  { id: "cdmx", name: "Mexico City, Mexico", code: "mx", monthlyTotal: 1350, housing: 650, food: 300, transport: 100, entertainment: 150, workspace: 100, other: 50 },
  { id: "lisbon", name: "Lisbon, Portugal", code: "pt", monthlyTotal: 2175, housing: 900, food: 450, transport: 200, entertainment: 300, workspace: 250, other: 75 },
  { id: "chiang-mai", name: "Chiang Mai, Thailand", code: "th", monthlyTotal: 1020, housing: 400, food: 300, transport: 80, entertainment: 120, workspace: 100, other: 20 },
  { id: "tbilisi", name: "Tbilisi, Georgia", code: "ge", monthlyTotal: 1100, housing: 450, food: 250, transport: 80, entertainment: 150, workspace: 100, other: 70 },
];

type CategoryBreakdown = {
  [key: string]: number;
};

export function TravelBudgetForecaster() {
  const [selectedDestination, setSelectedDestination] = useState("bali");
  const [stayDuration, setStayDuration] = useState("30");
  const [currentLocation, setCurrentLocation] = useState("lisbon");
  
  const destination = destinations.find(d => d.id === selectedDestination) || destinations[0];
  const current = destinations.find(d => d.id === currentLocation) || destinations[2];
  
  const costDifference = {
    total: destination.monthlyTotal - current.monthlyTotal,
    percentage: ((destination.monthlyTotal - current.monthlyTotal) / current.monthlyTotal * 100).toFixed(1),
  };
  
  const calculateDailyAverage = (monthly: number) => {
    return (monthly / 30).toFixed(0);
  };
  
  const calculateTotalForStay = (monthly: number, days: number) => {
    return ((monthly / 30) * days).toFixed(0);
  };
  
  const formatCurrency = (amount: number | string) => {
    if (typeof amount === 'string') amount = parseFloat(amount);
    return `$${amount.toLocaleString()}`;
  };
  
  const getCategoryData = (dest: typeof destination): CategoryBreakdown => {
    return {
      Housing: dest.housing,
      Food: dest.food,
      Transport: dest.transport,
      Entertainment: dest.entertainment,
      Workspace: dest.workspace,
      Other: dest.other,
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              Travel Budget Forecaster
              <Badge className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1">
                <Brain className="h-3 w-3" />
                <span>AI Powered</span>
              </Badge>
            </CardTitle>
            <CardDescription>
              Plan your budget for your next destination
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Current Location
            </label>
            <Select value={currentLocation} onValueChange={setCurrentLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select current location" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((dest) => (
                  <SelectItem key={dest.id} value={dest.id}>
                    <div className="flex items-center">
                      <span className={`fi fi-${dest.code} mr-2`}></span>
                      {dest.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Destination
            </label>
            <Select value={selectedDestination} onValueChange={setSelectedDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((dest) => (
                  <SelectItem key={dest.id} value={dest.id}>
                    <div className="flex items-center">
                      <span className={`fi fi-${dest.code} mr-2`}></span>
                      {dest.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Stay Duration (days)
            </label>
            <Input
              type="number"
              value={stayDuration}
              onChange={(e) => setStayDuration(e.target.value)}
              min="1"
              max="365"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center">
                <span className={`fi fi-${destination.code} mr-2`}></span>
                Budget for {destination.name}
              </h3>
              <Badge className={costDifference.total < 0 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                {costDifference.total < 0 ? "Cheaper" : "More Expensive"} ({costDifference.percentage}%)
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Monthly</p>
                  <p className="text-lg font-bold">{formatCurrency(destination.monthlyTotal)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Daily Avg.</p>
                  <p className="text-lg font-bold">{formatCurrency(calculateDailyAverage(destination.monthlyTotal))}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Your Stay</p>
                  <p className="text-lg font-bold">{formatCurrency(calculateTotalForStay(destination.monthlyTotal, parseInt(stayDuration)))}</p>
                </Card>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Cost Breakdown</h4>
              <div className="space-y-2">
                {Object.entries(getCategoryData(destination)).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                      <span className="text-sm">{category}</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(amount)}
                      <span className="text-xs text-muted-foreground ml-1">/ mo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <Tabs defaultValue="comparison">
              <TabsList className="w-full">
                <TabsTrigger value="comparison" className="flex items-center">
                  <BarChart className="h-3.5 w-3.5 mr-1.5" />
                  <span>Comparison</span>
                </TabsTrigger>
                <TabsTrigger value="savings" className="flex items-center">
                  <Calculator className="h-3.5 w-3.5 mr-1.5" />
                  <span>Savings</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="comparison" className="flex-1">
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Monthly Expenses</p>
                      <div className="flex items-center">
                        <span className={`fi fi-${current.code} mr-2`}></span>
                        <span className="font-semibold">{current.name}:</span>
                        <span className="ml-1">{formatCurrency(current.monthlyTotal)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Destination Monthly Expenses</p>
                      <div className="flex items-center">
                        <span className={`fi fi-${destination.code} mr-2`}></span>
                        <span className="font-semibold">{destination.name}:</span>
                        <span className="ml-1">{formatCurrency(destination.monthlyTotal)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border p-3 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Monthly Cost Comparison</h4>
                    <div className="space-y-2">
                      {Object.entries(getCategoryData(destination)).map(([category, amount]) => {
                        const currentAmount = getCategoryData(current)[category];
                        const diff = amount - currentAmount;
                        const percentage = ((diff / currentAmount) * 100).toFixed(0);
                        
                        return (
                          <div key={category} className="flex justify-between items-center text-sm">
                            <span>{category}</span>
                            <div className="flex items-center">
                              <span className={diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : ""}>
                                {diff === 0 ? "Same" : `${diff < 0 ? "-" : "+"}${formatCurrency(Math.abs(diff))}`}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({diff === 0 ? "0" : diff < 0 ? "" : "+"}
                                {percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="savings" className="flex-1">
                <div className="space-y-4 pt-4">
                  <div className="border p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <h4 className="font-medium mb-2 text-green-800 dark:text-green-300">
                      {costDifference.total < 0 ? "Potential Monthly Savings" : "Additional Monthly Cost"}
                    </h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Monthly Difference:</span>
                      <span className={`font-bold text-xl ${costDifference.total < 0 ? "text-green-600" : "text-red-600"}`}>
                        {costDifference.total < 0 ? "-" : "+"}{formatCurrency(Math.abs(costDifference.total))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm">For your {stayDuration}-day stay:</span>
                      <span className={`font-medium ${costDifference.total < 0 ? "text-green-600" : "text-red-600"}`}>
                        {costDifference.total < 0 ? "-" : "+"}{formatCurrency(Math.abs(calculateTotalForStay(costDifference.total, parseInt(stayDuration))))}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">AI Insights</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Based on your spending patterns and the cost of living in {destination.name}:
                    </p>
                    <ul className="space-y-2">
                      <li className="text-sm flex items-start">
                        <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2 mt-0.5">•</span>
                        {costDifference.total < 0 ? 
                          `Moving to ${destination.name} could help you save ${formatCurrency(Math.abs(costDifference.total))} monthly while maintaining your lifestyle.` :
                          `Expect to spend ${formatCurrency(Math.abs(costDifference.total))} more monthly in ${destination.name} compared to your current location.`
                        }
                      </li>
                      <li className="text-sm flex items-start">
                        <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2 mt-0.5">•</span>
                        {destination.id === "bali" ? 
                          "Housing costs in Bali are typically lower, but imported goods can be more expensive." :
                          destination.id === "chiang-mai" ?
                          "Chiang Mai offers the best value for food and transportation among your options." :
                          `${destination.name} has ${destination.id === "lisbon" ? "higher" : "moderate"} accommodation costs compared to Southeast Asian destinations.`
                        }
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">Estimates based on solo digital nomad lifestyle</p>
        <Button>View Detailed Cost Breakdown</Button>
      </CardFooter>
    </Card>
  );
} 