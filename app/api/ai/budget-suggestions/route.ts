import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { CATEGORIES } from '@/lib/transactionCategories';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  category: string;
}

// GET /api/ai/budget-suggestions
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Required filter by userId for security
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Date range for analysis (last 3 months by default)
    const startDate = searchParams.get('startDate') || 
      new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    
    // Get user's transactions for analysis
    const transactions = await Transaction.find({
      userId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: -1 });

    if (transactions.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: 'Not enough transaction data to generate suggestions'
      });
    }

    // Analyze transactions using AI to generate suggestions
    let suggestions: Suggestion[];

    try {
      suggestions = await generateAIBudgetSuggestions(transactions);
    } catch (aiError) {
      console.error('Error generating AI suggestions:', aiError);
      // Fall back to rule-based suggestions if AI fails
      suggestions = generateBudgetSuggestions(transactions);
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error generating budget suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate budget suggestions', details: error.message },
      { status: 500 }
    );
  }
}

// Function to generate AI-powered budget suggestions
async function generateAIBudgetSuggestions(transactions: any[]): Promise<Suggestion[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Missing Gemini API key");
    // Fall back to rule-based suggestions
    return generateBudgetSuggestions(transactions);
  }

  // Prepare transaction data for AI analysis
  // Group transactions by category to reduce token usage
  const categoryGroups: Record<string, any> = {};
  const currencyGroups: Record<string, any> = {};
  let totalSpending = 0;
  let totalIncome = 0;
  
  for (const transaction of transactions) {
    const category = transaction.category || 'Other';
    categoryGroups[category] = categoryGroups[category] || { total: 0, count: 0 };
    categoryGroups[category].total += transaction.amount;
    categoryGroups[category].count++;
    
    currencyGroups[transaction.currency] = currencyGroups[transaction.currency] || { total: 0, count: 0 };
    currencyGroups[transaction.currency].total += transaction.amount;
    currencyGroups[transaction.currency].count++;
    
    if (transaction.amount < 0) {
      totalSpending += Math.abs(transaction.amount);
    } else {
      totalIncome += transaction.amount;
    }
  }
  
  // Get the recurring payments
  const recurringTransactions = transactions.filter(t => t.isRecurring).slice(0, 10);
  
  // Get the countries where transactions happened
  const countries = new Set(transactions
    .filter(t => t.location?.country)
    .map(t => t.location.country));
  
  // Prepare data summary for AI
  const transactionSummary = {
    period: {
      start: new Date(transactions[transactions.length - 1].date).toISOString().split('T')[0],
      end: new Date(transactions[0].date).toISOString().split('T')[0]
    },
    totalTransactions: transactions.length,
    totalSpending,
    totalIncome,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0,
    categoryBreakdown: Object.entries(categoryGroups).map(([category, data]) => ({
      category,
      total: (data as any).total,
      count: (data as any).count,
      percentage: totalSpending > 0 ? (Math.abs((data as any).total) / totalSpending) * 100 : 0
    })),
    currencyUsage: Object.keys(currencyGroups),
    countriesVisited: Array.from(countries),
    hasRecurringPayments: recurringTransactions.length > 0,
  };
  
  // Prepare AI prompt
  const prompt = `
    You are a financial advisor for digital nomads. Analyze this spending data and provide 3-5 personalized budget suggestions.

    Transaction Summary:
    ${JSON.stringify(transactionSummary, null, 2)}

    For each suggestion:
    1. Create a specific, actionable title
    2. Write a detailed description with specifics from the data
    3. Rate the impact as "High", "Medium", or "Low"
    4. Assign an appropriate category

    Format your response as valid JSON in this exact structure:
    [
      {
        "id": "generate-a-unique-id",
        "title": "Suggestion Title",
        "description": "Detailed description with specific numbers from the data",
        "impact": "High|Medium|Low",
        "category": "Category Name"
      },
      ...more suggestions
    ]

    Pay special attention to:
    - High spending categories (over 20% of total)
    - Savings rate (should ideally be 20%+)
    - Currency exchange inefficiencies
    - Tax implications for multiple countries
    - Recurring payments that could be optimized

    Only return the JSON array, nothing else.
  `;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
      const jsonText = data.candidates[0].content.parts[0].text.trim();
      try {
        const result = JSON.parse(jsonText);
        return result;
      } catch (parseError) {
        console.error("Error parsing Gemini API response:", parseError);
        throw new Error("Invalid response format from Gemini API");
      }
    } else {
      throw new Error("Unexpected response structure from Gemini API");
    }
  } catch (error) {
    console.error("Error getting budget suggestions from AI:", error);
    // Fall back to rule-based suggestions
    return generateBudgetSuggestions(transactions);
  }
}

// Function to generate budget suggestions based on transaction analysis (fallback)
function generateBudgetSuggestions(transactions: any[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Group transactions by category
  const categoryGroups: Record<string, any[]> = {};
  for (const transaction of transactions) {
    const category = transaction.category || CATEGORIES.OTHER;
    categoryGroups[category] = categoryGroups[category] || [];
    categoryGroups[category].push(transaction);
  }
  
  // Get total spending amount
  const totalSpending = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  // Get total income amount
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Analyze spending patterns
  for (const category in categoryGroups) {
    const catTransactions = categoryGroups[category];
    const categoryTotal = catTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const categoryPercentage = totalSpending > 0 ? (categoryTotal / totalSpending) * 100 : 0;
    
    // Generate category-specific suggestions
    if (category === CATEGORIES.FOOD && categoryPercentage > 30) {
      suggestions.push({
        id: `food-high-${Date.now()}`,
        title: 'Reduce food expenses',
        description: `You're spending ${categoryPercentage.toFixed(1)}% of your budget on food. Consider meal planning and reducing dining out to save money.`,
        impact: 'Medium',
        category: CATEGORIES.FOOD,
      });
    }
    
    if (category === CATEGORIES.ENTERTAINMENT && categoryPercentage > 15) {
      suggestions.push({
        id: `entertainment-high-${Date.now()}`,
        title: 'Entertainment expenses are high',
        description: `Entertainment makes up ${categoryPercentage.toFixed(1)}% of your spending. Consider finding free or lower-cost alternatives.`,
        impact: 'Medium',
        category: CATEGORIES.ENTERTAINMENT,
      });
    }
    
    if (category === CATEGORIES.SHOPPING && categoryPercentage > 20) {
      suggestions.push({
        id: `shopping-high-${Date.now()}`,
        title: 'Reduce discretionary shopping',
        description: `Shopping accounts for ${categoryPercentage.toFixed(1)}% of your expenses. Consider implementing a 48-hour rule before making non-essential purchases.`,
        impact: 'High',
        category: CATEGORIES.SHOPPING,
      });
    }
  }
  
  // Analyze currencies
  const currencyGroups: Record<string, any[]> = {};
  for (const transaction of transactions) {
    currencyGroups[transaction.currency] = currencyGroups[transaction.currency] || [];
    currencyGroups[transaction.currency].push(transaction);
  }
  
  if (Object.keys(currencyGroups).length > 1) {
    suggestions.push({
      id: `multi-currency-${Date.now()}`,
      title: 'Optimize currency exchange',
      description: `You're using ${Object.keys(currencyGroups).length} different currencies. Consider using a multi-currency card or timing exchanges to get better rates.`,
      impact: 'Medium',
      category: 'Currency',
    });
  }
  
  // Analyze savings rate
  const savingsRate = totalIncome > 0 ? (totalIncome - totalSpending) / totalIncome * 100 : 0;
  
  if (savingsRate < 10 && totalIncome > 0) {
    suggestions.push({
      id: `savings-low-${Date.now()}`,
      title: 'Increase your savings rate',
      description: `Your current savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 15-20% of your income.`,
      impact: 'High',
      category: 'Savings',
    });
  } else if (savingsRate >= 10 && savingsRate < 20) {
    suggestions.push({
      id: `savings-medium-${Date.now()}`,
      title: 'Good progress on savings',
      description: `Your savings rate of ${savingsRate.toFixed(1)}% is good. Consider setting up automatic transfers to a high-yield savings account to maximize growth.`,
      impact: 'Medium',
      category: 'Savings',
    });
  }
  
  // Add a suggestion about taxes if there are multiple locations
  const countries = new Set(transactions
    .filter(t => t.location?.country)
    .map(t => t.location.country));
  
  if (countries.size > 1) {
    suggestions.push({
      id: `tax-nomad-${Date.now()}`,
      title: 'Track your tax obligations',
      description: `You have transactions in ${countries.size} different countries. Make sure you're tracking your tax residency status and obligations in each location.`,
      impact: 'High',
      category: 'Taxes',
    });
  }
  
  // Return suggestions, limiting to top 5 for usability
  return suggestions.slice(0, 5);
} 