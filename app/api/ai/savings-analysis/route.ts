import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

interface SavingsOpportunity {
  id: string;
  category: string;
  title: string;
  description: string;
  potentialSavings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeframe: 'Immediate' | 'Short-term' | 'Long-term';
}

// GET /api/ai/savings-analysis
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
    
    // Date range for analysis
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
        opportunities: [],
        message: 'Not enough transaction data to generate savings analysis'
      });
    }

    // Generate savings analysis using AI
    let savingsAnalysis;
    
    try {
      savingsAnalysis = await generateAISavingsAnalysis(transactions);
    } catch (aiError) {
      console.error('Error generating AI savings analysis:', aiError);
      // Fall back to rule-based analysis if AI fails
      savingsAnalysis = generateBasicSavingsAnalysis(transactions);
    }

    // Calculate totals for the response
    const totalPotentialSavings = savingsAnalysis.opportunities.reduce(
      (sum: number, opp: SavingsOpportunity): number => sum + opp.potentialSavings, 
      0
    );

    return NextResponse.json({
      opportunities: savingsAnalysis.opportunities,
      totalPotentialSavings,
      currency: savingsAnalysis.baseCurrency,
      summary: savingsAnalysis.summary
    });
  } catch (error: any) {
    console.error('Error generating savings analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate savings analysis', details: error.message },
      { status: 500 }
    );
  }
}

// Function to generate AI-powered savings analysis
async function generateAISavingsAnalysis(transactions: any[]) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Missing Gemini API key");
    // Fall back to basic analysis
    return generateBasicSavingsAnalysis(transactions);
  }

  // Determine the user's base currency (most frequently used or with highest volume)
  const currencyCounts: Record<string, { count: number, volume: number }> = {};
  let totalSpending = 0;
  let totalIncome = 0;
  
  for (const transaction of transactions) {
    const currency = transaction.currency || 'USD';
    currencyCounts[currency] = currencyCounts[currency] || { count: 0, volume: 0 };
    currencyCounts[currency].count++;
    currencyCounts[currency].volume += Math.abs(transaction.amount);
    
    if (transaction.amount < 0) {
      totalSpending += Math.abs(transaction.amount);
    } else {
      totalIncome += transaction.amount;
    }
  }
  
  // Get base currency (most commonly used)
  const baseCurrency = Object.entries(currencyCounts)
    .sort((a, b) => b[1].count - a[1].count)[0][0];
  
  // Group transactions by category to reduce token usage
  const categoryGroups: Record<string, any> = {};
  
  for (const transaction of transactions) {
    if (transaction.amount >= 0) continue; // Skip income transactions
    
    const category = transaction.category || 'Other';
    categoryGroups[category] = categoryGroups[category] || { 
      total: 0, 
      count: 0,
      transactions: []
    };
    
    categoryGroups[category].total += Math.abs(transaction.amount);
    categoryGroups[category].count++;
    
    // Store a sample of transactions for this category (keep the list short for token efficiency)
    if (categoryGroups[category].transactions.length < 5) {
      categoryGroups[category].transactions.push({
        description: transaction.description,
        amount: Math.abs(transaction.amount),
        date: transaction.date
      });
    }
  }
  
  // Get recurring payments that might be optimized
  const recurringTransactions = transactions
    .filter(t => t.isRecurring && t.amount < 0)
    .slice(0, 10)
    .map(t => ({
      description: t.description,
      amount: Math.abs(t.amount),
      category: t.category,
      currency: t.currency
    }));
  
  // Prepare data for AI analysis
  const spendingData = {
    baseCurrency,
    period: {
      start: new Date(transactions[transactions.length - 1].date).toISOString().split('T')[0],
      end: new Date(transactions[0].date).toISOString().split('T')[0]
    },
    totalTransactions: transactions.length,
    totalSpending,
    totalIncome,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0,
    categories: Object.entries(categoryGroups)
      .sort((a, b) => (b[1] as any).total - (a[1] as any).total)
      .map(([category, data]) => ({
        category,
        total: (data as any).total,
        count: (data as any).count,
        percentage: totalSpending > 0 ? ((data as any).total / totalSpending) * 100 : 0,
        sampleTransactions: (data as any).transactions
      })),
    recurringExpenses: recurringTransactions
  };
  
  // Prepare AI prompt
  const prompt = `
    You are a financial advisor specializing in finding cost-saving opportunities for digital nomads. Analyze this spending data and identify specific savings opportunities.

    Spending Data:
    ${JSON.stringify(spendingData, null, 2)}

    Based on this data, identify 4-6 concrete savings opportunities. For each opportunity:
    1. Create a specific title
    2. Write a detailed description of how to realize the savings
    3. Estimate the potential monthly savings in ${baseCurrency}
    4. Rate the difficulty as "Easy", "Medium", or "Hard"
    5. Indicate the timeframe as "Immediate", "Short-term", or "Long-term"

    Format your response as valid JSON in this exact structure:
    {
      "opportunities": [
        {
          "id": "generate-a-unique-id",
          "category": "Category from the data",
          "title": "Specific opportunity title",
          "description": "Detailed description with actionable advice",
          "potentialSavings": number (estimated monthly savings in ${baseCurrency}),
          "difficulty": "Easy|Medium|Hard",
          "timeframe": "Immediate|Short-term|Long-term"
        }
      ],
      "baseCurrency": "${baseCurrency}",
      "summary": "A 1-2 sentence overall summary of the savings potential"
    }

    Focus on:
    - Categories with the highest spending percentage
    - Recurring expenses that could be optimized
    - Typical travel/nomad expenses that can be reduced
    - Specific transaction patterns that suggest overspending

    Be realistic in your savings estimates and specific in your recommendations.
    Only return the JSON object, nothing else.
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
    console.error("Error getting savings analysis from AI:", error);
    // Fall back to basic analysis
    return generateBasicSavingsAnalysis(transactions);
  }
}

// Basic rule-based savings analysis as fallback
function generateBasicSavingsAnalysis(transactions: any[]) {
  const opportunities: SavingsOpportunity[] = [];
  
  // Determine the user's base currency (most frequently used)
  const currencyCounts: Record<string, number> = {};
  for (const t of transactions) {
    currencyCounts[t.currency] = (currencyCounts[t.currency] || 0) + 1;
  }
  const baseCurrency = Object.entries(currencyCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Group transactions by category
  const categoryGroups: Record<string, any[]> = {};
  for (const transaction of transactions) {
    if (transaction.amount >= 0) continue; // Skip income
    
    const category = transaction.category || 'Other';
    categoryGroups[category] = categoryGroups[category] || [];
    categoryGroups[category].push(transaction);
  }
  
  // Get total spending
  const totalSpending = transactions
    .filter(t => t.amount < 0)
    .reduce((sum: number, t: any): number => sum + Math.abs(t.amount), 0);
  
  // Analyze food expenses
  if (categoryGroups['Food'] && categoryGroups['Food'].length > 0) {
    const foodTotal = categoryGroups['Food']
      .reduce((sum: number, t: any): number => sum + Math.abs(t.amount), 0);
    const foodPercentage = (foodTotal / totalSpending) * 100;
    
    if (foodPercentage > 25) {
      opportunities.push({
        id: `food-${Date.now()}`,
        category: 'Food',
        title: 'Reduce dining out expenses',
        description: `You're spending ${foodPercentage.toFixed(1)}% of your budget on food. Consider meal planning, cooking more at home, and limiting restaurant visits to special occasions.`,
        potentialSavings: Math.round(foodTotal * 0.3), // 30% potential savings
        difficulty: 'Medium',
        timeframe: 'Immediate'
      });
    }
  }
  
  // Analyze accommodation expenses
  if (categoryGroups['Housing'] && categoryGroups['Housing'].length > 0) {
    const housingTotal = categoryGroups['Housing']
      .reduce((sum: number, t: any): number => sum + Math.abs(t.amount), 0);
    const housingPercentage = (housingTotal / totalSpending) * 100;
    
    if (housingPercentage > 30) {
      opportunities.push({
        id: `housing-${Date.now()}`,
        category: 'Housing',
        title: 'Optimize accommodation costs',
        description: `Housing accounts for ${housingPercentage.toFixed(1)}% of your spending. Consider longer-term stays for better rates, using platforms like Airbnb for monthly discounts, or co-living spaces.`,
        potentialSavings: Math.round(housingTotal * 0.15), // 15% potential savings
        difficulty: 'Hard',
        timeframe: 'Short-term'
      });
    }
  }
  
  // Analyze subscription services
  const subscriptionKeywords = ['subscription', 'netflix', 'spotify', 'amazon', 'membership', 'monthly'];
  const subscriptions = transactions.filter(t => 
    t.amount < 0 && 
    (t.isRecurring || subscriptionKeywords.some(kw => 
      t.description.toLowerCase().includes(kw)
    ))
  );
  
  if (subscriptions.length > 3) {
    const subscriptionTotal = subscriptions
      .reduce((sum: number, t: any): number => sum + Math.abs(t.amount), 0);
    
    opportunities.push({
      id: `subscriptions-${Date.now()}`,
      category: 'Subscriptions',
      title: 'Audit and reduce subscription services',
      description: `You have ${subscriptions.length} recurring subscriptions totaling ${baseCurrency} ${subscriptionTotal.toFixed(2)} per month. Consider reviewing each service, canceling unused ones, and sharing accounts where possible.`,
      potentialSavings: Math.round(subscriptionTotal * 0.4), // 40% potential savings
      difficulty: 'Easy',
      timeframe: 'Immediate'
    });
  }
  
  // Analyze transport costs
  if (categoryGroups['Transport'] && categoryGroups['Transport'].length > 0) {
    const transportTotal = categoryGroups['Transport']
      .reduce((sum: number, t: any): number => sum + Math.abs(t.amount), 0);
    
    opportunities.push({
      id: `transport-${Date.now()}`,
      category: 'Transport',
      title: 'Optimize transportation expenses',
      description: `You're spending significantly on transportation. Consider using public transit more, walking for short distances, or weekly/monthly transit passes instead of single tickets.`,
      potentialSavings: Math.round(transportTotal * 0.25), // 25% potential savings
      difficulty: 'Medium',
      timeframe: 'Immediate'
    });
  }
  
  // Add a general suggestion about currency exchange
  const currencies = new Set(transactions.map(t => t.currency));
  if (currencies.size > 1) {
    opportunities.push({
      id: `currency-${Date.now()}`,
      category: 'Currency',
      title: 'Optimize currency conversion',
      description: `You're using ${currencies.size} different currencies. Consider using multi-currency cards like Wise or Revolut to avoid excessive conversion fees and get better exchange rates.`,
      potentialSavings: Math.round(totalSpending * 0.03), // 3% potential savings
      difficulty: 'Easy',
      timeframe: 'Immediate'
    });
  }
  
  return {
    opportunities,
    baseCurrency,
    summary: `You could potentially save ${baseCurrency} ${opportunities.reduce((sum: number, o: SavingsOpportunity): number => sum + o.potentialSavings, 0)} per month by implementing these changes.`
  };
} 