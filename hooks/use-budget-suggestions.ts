import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export interface BudgetSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  category: string;
}

export default function useBudgetSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);

  const fetchSuggestions = async (startDate?: string, endDate?: string) => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        userId: user.uid,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await axios.get(`/api/ai/budget-suggestions?${queryParams}`);
      setSuggestions(response.data.suggestions);
    } catch (err: any) {
      console.error('Error fetching budget suggestions:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Function to dismiss a suggestion
  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  // Function to apply a suggestion
  const applySuggestion = async (suggestionId: string) => {
    try {
      const suggestion = suggestions.find((s) => s.id === suggestionId);
      if (!suggestion || !user?.uid) return;

      // Mark suggestion as applied locally
      setAppliedSuggestions((prev) => [...prev, suggestionId]);

      // Optional: Send to backend to track applied suggestions
      await axios.post('/api/user/applied-suggestions', {
        userId: user.uid,
        suggestionId,
        suggestionData: suggestion,
        appliedAt: new Date().toISOString(),
      });

      // Update the suggestion in the list to show it's been applied
      setSuggestions((prev) => 
        prev.map((s) => 
          s.id === suggestionId 
            ? { ...s, isApplied: true } 
            : s
        )
      );

      return true;
    } catch (err) {
      console.error('Error applying suggestion:', err);
      // Remove from applied if there was an error
      setAppliedSuggestions((prev) => prev.filter(id => id !== suggestionId));
      return false;
    }
  };

  return {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    dismissSuggestion,
    applySuggestion,
    appliedSuggestions,
  };
} 