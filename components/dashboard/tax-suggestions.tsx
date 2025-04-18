"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw, Lightbulb, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCountryNameByCode } from "@/lib/countries";
import { TaxProfileData } from "@/hooks/use-tax-profile";

interface TaxSuggestionsProps {
  taxProfile: TaxProfileData | null;
  taxStatus: Array<{
    countryCode: string;
    daysPresent: number;
    threshold: number;
    status: "safe" | "warning" | "exceeded";
    notes?: string;
  }>;
  stayRecords: Array<{
    id: string;
    countryCode: string;
    startDate: string;
    endDate: string;
    numberOfDays: number;
    source: "manual" | "automatic";
  }>;
  isLoading?: boolean;
}

export function TaxSuggestions({ taxProfile, taxStatus, stayRecords, isLoading = false }: TaxSuggestionsProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateSuggestions = useCallback(async () => {
    if (!user?.uid || isLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real app with Gemini integration, we would make an API call here
      // For now, we're simulating with generated suggestions based on the data
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate suggestions based on the data
      const newSuggestions: string[] = [];
      
      // Check for approaching tax residency thresholds
      const warningStatuses = taxStatus.filter(status => status.status === "warning");
      if (warningStatuses.length > 0) {
        warningStatuses.forEach(status => {
          const countryName = getCountryNameByCode(status.countryCode);
          const daysLeft = status.threshold - status.daysPresent;
          newSuggestions.push(
            `You're approaching the tax residency threshold in ${countryName}. Consider limiting your stay to ${daysLeft} more days this year to avoid becoming a tax resident.`
          );
        });
      }
      
      // Check for exceeded tax residency thresholds
      const exceededStatuses = taxStatus.filter(status => status.status === "exceeded");
      if (exceededStatuses.length > 0) {
        exceededStatuses.forEach(status => {
          const countryName = getCountryNameByCode(status.countryCode);
          newSuggestions.push(
            `You have exceeded the tax residency threshold in ${countryName}. You may need to file taxes as a resident. Consider consulting with a tax professional.`
          );
        });
      }
      
      // Check for recent travel patterns
      if (stayRecords.length > 2) {
        const recentCountries = new Set(stayRecords.slice(0, 3).map(r => r.countryCode));
        if (recentCountries.size === 3) {
          newSuggestions.push(
            "You've recently traveled to multiple countries in a short period. Consider the implications on tax residency and ensure you're tracking your days carefully."
          );
        }
      }
      
      // Add tax profile specific suggestions
      if (taxProfile) {
        if (taxProfile.citizenship.includes("US")) {
          newSuggestions.push(
            "As a US citizen, you're subject to worldwide income reporting regardless of your residency status. Don't forget to file your FBAR if you have foreign financial accounts exceeding $10,000."
          );
        }
        
        // Check if they have additional tax obligations
        if (taxProfile.additionalTaxObligations && taxProfile.additionalTaxObligations.length > 0) {
          newSuggestions.push(
            "You have additional tax obligations in multiple countries. Consider working with a tax professional who specializes in international taxation."
          );
        }
      }
      
      // Add default suggestions if we don't have enough
      if (newSuggestions.length < 3) {
        newSuggestions.push(
          "Consider keeping a detailed travel calendar with entry and exit stamps as evidence for tax authorities.",
          "Tax treaties between countries may help you avoid double taxation. Research if there are applicable treaties for your situation.",
          "Remote workers should be aware that some countries are implementing specific tax regimes for digital nomads."
        );
      }
      
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Error generating tax suggestions:", error);
      setError("Failed to generate tax suggestions. Please try again.");
      setSuggestions([
        "Unable to generate tax suggestions. Please try again later.",
        "Consider consulting with a tax professional for personalized advice."
      ]);
    } finally {
      setLoading(false);
    }
  }, [taxStatus, stayRecords, taxProfile, user?.uid, isLoading]);
  
  // Generate suggestions on mount and when data changes
  useEffect(() => {
    if (taxStatus.length > 0 && !loading) {
      generateSuggestions();
    }
  }, [taxStatus, generateSuggestions]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted rounded-md">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading tax data...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (suggestions.length === 0 && !loading) {
    return null;
  }
  
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-500" />
            Tax Suggestions
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateSuggestions}
            disabled={loading}
            className="h-8"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            <span>Refresh</span>
          </Button>
        </div>
        <CardDescription>
          AI-generated suggestions based on your travel patterns and tax profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Generating tax suggestions...</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
} 