import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, LightbulbIcon, XIcon } from 'lucide-react';
import useBudgetSuggestions, { BudgetSuggestion } from '@/hooks/use-budget-suggestions';
import { getCategoryIcon } from '@/lib/transactionCategories';
import { toast } from '@/components/ui/use-toast';

interface BudgetSuggestionsProps {
  startDate?: string;
  endDate?: string;
}

export default function BudgetSuggestions({ startDate, endDate }: BudgetSuggestionsProps) {
  const { suggestions, loading, error, fetchSuggestions, dismissSuggestion, applySuggestion, appliedSuggestions } = useBudgetSuggestions();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions(startDate, endDate);
  }, [startDate, endDate]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <LightbulbIcon className="mr-2 h-5 w-5 text-yellow-500" />
            Smart Budget Insights
          </CardTitle>
          <CardDescription>Loading personalized suggestions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-500">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Error Loading Suggestions
          </CardTitle>
          <CardDescription>We couldn't load your personalized suggestions. Please try again later.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <LightbulbIcon className="mr-2 h-5 w-5 text-yellow-500" />
            Smart Budget Insights
          </CardTitle>
          <CardDescription>No budget suggestions available for the selected period.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDismiss = (id: string) => {
    dismissSuggestion(id);
  };

  const handleApply = async (id: string) => {
    setApplyingId(id);
    try {
      const success = await applySuggestion(id);
      if (success) {
        toast({
          title: "Suggestion applied",
          description: "The budget suggestion has been applied to your account.",
          variant: "default",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to apply the suggestion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplyingId(null);
    }
  };

  const isApplied = (id: string) => appliedSuggestions.includes(id);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <LightbulbIcon className="mr-2 h-5 w-5 text-yellow-500" />
          Smart Budget Insights
        </CardTitle>
        <CardDescription>Personalized suggestions based on your spending patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => {
          const CategoryIcon = getCategoryIcon(suggestion.category);
          const appliedStatus = isApplied(suggestion.id);
          
          return (
            <Card key={suggestion.id} className={`overflow-hidden border-l-4 ${appliedStatus ? 'border-l-green-500' : 'border-l-blue-500'}`}>
              <CardHeader className="p-4 pb-0 flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center">
                    {CategoryIcon && <CategoryIcon className="mr-2 h-4 w-4" />}
                    {suggestion.title}
                  </CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge className={getImpactColor(suggestion.impact)}>
                      {suggestion.impact} Impact
                    </Badge>
                    {appliedStatus && (
                      <Badge className="bg-green-100 text-green-800">
                        Applied
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDismiss(suggestion.id)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <p className="text-sm text-gray-700">{suggestion.description}</p>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  variant={appliedStatus ? "ghost" : "outline"}
                  size="sm"
                  className="ml-auto"
                  onClick={() => handleApply(suggestion.id)}
                  disabled={appliedStatus || applyingId === suggestion.id}
                >
                  {applyingId === suggestion.id ? (
                    <>Applying...</>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {appliedStatus ? 'Applied' : 'Apply Suggestion'}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}