"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Lightbulb, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type Suggestion = {
  id: string;
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  category: string;
};

type AIBudgetSuggestionsProps = {
  suggestions: Suggestion[];
};

export function AIBudgetSuggestions({
  suggestions = [
    {
      id: "sug1",
      title: "Reduce workspace costs in Lisbon",
      description: "You're spending 30% more than the average digital nomad on co-working spaces in Lisbon. Consider monthly packages or exploring alternative spaces to save €85/month.",
      impact: "Medium",
      category: "Workspace",
    },
    {
      id: "sug2",
      title: "Opportunity to boost savings rate",
      description: "Allocating just 5% more of your monthly income to savings would improve your long-term financial security significantly based on your current spending patterns.",
      impact: "High",
      category: "Savings",
    },
    {
      id: "sug3",
      title: "Optimize currency exchange timing",
      description: "Based on historical patterns, converting USD to EUR between Monday-Tuesday typically yields better rates than weekend exchanges.",
      impact: "Low",
      category: "Currency",
    },
  ],
}: AIBudgetSuggestionsProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High":
        return "bg-green-100 text-green-800 border-green-200";
      case "Medium":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Low":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center">
            Budget Optimization
            <Badge className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              <span>AI Powered</span>
            </Badge>
          </CardTitle>
          <CardDescription>
            Personalized suggestions based on your spending patterns
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    <Badge className={getImpactColor(suggestion.impact)}>
                      {suggestion.impact} Impact
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  <div className="pt-2 flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      {suggestion.category}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      Apply Suggestion
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            <span>Updated daily based on your latest transactions</span>
          </div>
          <Button variant="outline" size="sm">
            Get More Insights
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 