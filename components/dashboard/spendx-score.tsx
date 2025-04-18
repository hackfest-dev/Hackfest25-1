"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Brain, Info } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ScoreCategory = "Poor" | "Fair" | "Good" | "Excellent";

type ScoreMetric = {
  name: string;
  value: ScoreCategory;
  color: string;
  percentage: number;
};

type SpendXScoreProps = {
  overallScore: number;
  scoreDelta: number;
  metrics: ScoreMetric[];
  feedback: string;
  lastUpdated?: string;
};

const getCategoryColor = (category: ScoreCategory) => {
  switch (category) {
    case "Poor":
      return "text-red-500";
    case "Fair":
      return "text-amber-500";
    case "Good":
      return "text-green-500";
    case "Excellent":
      return "text-blue-500";
    default:
      return "text-slate-500";
  }
};

export function SpendXScore({
  overallScore = 87,
  scoreDelta = 5,
  metrics = [
    { name: "Spending", value: "Good", color: "green", percentage: 75 },
    { name: "Savings", value: "Excellent", color: "blue", percentage: 90 },
    { name: "Budget Adherence", value: "Fair", color: "amber", percentage: 65 },
  ],
  feedback = "Keep up the good work with your savings rate!",
  lastUpdated = "Today"
}: SpendXScoreProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-2 right-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-primary/10 flex items-center gap-1 hover:bg-primary/20 cursor-help">
                <Brain className="h-3 w-3" />
                <span>X-Enhanced</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">This score is calculated by our AI based on your spending patterns, savings rate, and budget adherence across multiple currencies and locations.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <CardHeader>
        <CardTitle className="flex items-center">
          SpendX Score
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Your SpendX Score is a measure of overall financial health based on multiple factors analyzed by our AI system.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>Your financial health score</CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                className="text-primary"
                strokeWidth="10"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * overallScore) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-4xl font-bold">{overallScore}</span>
              <div className="flex items-center text-xs text-green-500 font-semibold mt-1">
                <ArrowUp className="h-3 w-3 mr-1" /> 
                {scoreDelta} points
              </div>
            </div>
          </div>
          
          <div className="w-full space-y-4">
            {metrics.map((metric, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <span className={`text-sm font-semibold ${getCategoryColor(metric.value)}`}>
                    {metric.value}
                  </span>
                </div>
                <Progress value={metric.percentage} className={`h-2 ${metric.color === "green" ? "bg-green-100" : metric.color === "blue" ? "bg-blue-100" : "bg-amber-100"}`} />
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <p className="text-sm italic">"{feedback}"</p>
        </div>
      </CardContent>
      
      <CardFooter className="pt-1 text-xs text-muted-foreground">
        Last analyzed {lastUpdated} • Updates daily
      </CardFooter>
    </Card>
  );
}
