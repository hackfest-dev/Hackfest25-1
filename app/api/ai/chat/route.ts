import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import connectToDatabase from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { getExchangeRate, FALLBACK_RATES, CURRENCY_SYMBOLS, CURRENCIES } from '@/lib/currency';
import UserSettings from '@/models/UserSettings';

// Define types for user data
interface UserData {
  baseCurrency?: string;
  totalIncome?: number;
  totalExpenses?: number;
  savingsRate?: number;
  totalTransactions?: number;
  period?: {
    start: string;
    end: string;
  };
  topCategories?: Array<{
    category: string;
    percentage: number;
    total: number;
  }>;
  recurringPayments?: Array<{
    description: string;
    amount: number;
    currency: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userId } = await req.json();

    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
      throw new Error('Cloudflare credentials not configured');
    }

    // Get the last user message for RAG search
    const lastUserMessage = messages
      .filter((msg: any) => msg.role === 'user')
      .pop()?.content || '';

    // First, get relevant context from Auto RAG
    let ragContext = '';
    try {
      const ragResponse = await fetch(
        'https://api.cloudflare.com/client/v4/accounts/b24e2ba64a61f064e0c2e4e02f757593/autorag/rags/airug/ai-search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer jbm2KCChBVLAlTVJ07WJpWrWO4mGQwsobGdw3S5V',
          },
          body: JSON.stringify({
            query: lastUserMessage,
            auto_rag: {
              use_reference: true,
              include_citations: true,
              system_prompt: "You are a helpful financial assistant. Use the provided documentation to help users understand how to use the website. If the query is about website usage, prioritize the documentation. For financial analysis, use the real-time data provided."
            }
          })
        }
      );

      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        console.log('RAG Response:', ragData); // Debug log
        if (ragData.result && ragData.result.context) {
          ragContext = ragData.result.context;
        } else if (ragData.success === false) {
          console.error('RAG Error:', ragData.errors || ragData.messages);
        }
      } else {
        console.error('RAG HTTP Error:', ragResponse.status, await ragResponse.text());
      }
    } catch (error) {
      console.error('Error fetching RAG context:', error);
    }

    // Get user data and process transactions
    let userData: UserData = {};
    if (userId) {
      try {
        // Get user's preferred currency from settings
        const userSettings = await UserSettings.findOne({ userId });
        const baseCurrency = userSettings?.currency || 'USD';  // Default to USD if not set

        // Get transactions from the last 3 months
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        
        const transactions = await Transaction.find({
          userId,
          date: {
            $gte: startDate,
            $lte: new Date()
          }
        }).sort({ date: -1 });

        if (transactions.length > 0) {
          // Convert all transactions to user's preferred currency
          const convertedTransactions = await Promise.all(transactions.map(async (t) => {
            if (t.currency === baseCurrency) {
              return { ...t.toObject(), convertedAmount: t.amount };
            }
            try {
              const rate = await getExchangeRate(t.currency, baseCurrency);
              return {
                ...t.toObject(),
                convertedAmount: t.amount * rate,
                exchangeRate: rate
              };
            } catch (error) {
              console.error(`Error converting ${t.currency} to ${baseCurrency}:`, error);
              // Use fallback rates if API fails
              let fallbackRate;
              if (t.currency === 'USD') {
                fallbackRate = FALLBACK_RATES[baseCurrency];
              } else if (baseCurrency === 'USD') {
                fallbackRate = 1 / FALLBACK_RATES[t.currency];
              } else {
                // Convert through USD as intermediary
                fallbackRate = FALLBACK_RATES[baseCurrency] / FALLBACK_RATES[t.currency];
              }
              return {
                ...t.toObject(),
                convertedAmount: t.amount * fallbackRate,
                exchangeRate: fallbackRate
              };
            }
          }));

          // Calculate basic stats using converted amounts
          const totalIncome = convertedTransactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => {
              const amount = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
              return sum + amount;
            }, 0);
          
          const totalExpenses = convertedTransactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => {
              const amount = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
              return sum + Math.abs(amount);
            }, 0);
          
          const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
          
          // Group transactions by category using converted amounts
          const categoryGroups: Record<string, { total: number, count: number }> = {};
          convertedTransactions.forEach(t => {
            const category = t.category || 'Other';
            const amount = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
            categoryGroups[category] = categoryGroups[category] || { total: 0, count: 0 };
            categoryGroups[category].total += Math.abs(amount);
            categoryGroups[category].count++;
          });

          // Get top categories
          const topCategories = Object.entries(categoryGroups)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([category, data]) => ({
              category,
              total: data.total,
              percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
            }));

          // Get recurring payments
          const recurringPayments = convertedTransactions
            .filter(t => t.isRecurring)
            .map(t => ({
              description: t.description,
              amount: Math.abs(t.convertedAmount || t.amount),
              category: t.category,
              currency: baseCurrency
            }));

          userData = {
            baseCurrency,
            totalIncome,
            totalExpenses,
            savingsRate,
            topCategories,
            recurringPayments,
            totalTransactions: transactions.length,
            period: {
              start: startDate.toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0]
            }
          };
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Continue without user data if there's an error
      }
    }

    // Updated system prompt
    const systemPrompt = `You are a friendly and helpful AI assistant for personal finance and website usage. Have a conversation with the user while providing accurate guidance.

Key guidelines:
- Be conversational and encouraging
- Guide users step by step
- Ask if they need clarification on any steps
- Use the user's preferred currency (${userData.baseCurrency || 'USD'})
- Provide relevant tips from the documentation
- Reference real financial data when relevant
- Offer to help with related features

${Object.keys(userData).length > 0 ? `
Financial Context (in ${userData.baseCurrency}):
- Income: ${userData.totalIncome} ${userData.baseCurrency}
- Expenses: ${userData.totalExpenses} ${userData.baseCurrency}
- Savings Rate: ${userData.savingsRate}%
- Transactions: ${userData.totalTransactions}
- Period: ${userData.period?.start} to ${userData.period?.end}

Top Categories:
${userData.topCategories?.map(cat => `- ${cat.category}: ${cat.percentage}% (${cat.total} ${userData.baseCurrency})`).join('\n')}

Recurring:
${userData.recurringPayments?.map(p => `- ${p.description}: ${p.amount} ${userData.baseCurrency}`).join('\n')}
` : ''}

${ragContext ? `\nRelevant Documentation:\n${ragContext}` : ''}`;

    // Format messages for the API
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: formattedMessages,
          max_tokens: 1000,
          temperature: 0.7
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the response text
    let responseText = '';
    if (data.result && data.result.response) {
      responseText = data.result.response;
    } else if (data.result && data.result.choices && data.result.choices[0] && data.result.choices[0].message) {
      responseText = data.result.choices[0].message.content;
    } else {
      throw new Error('Unexpected response format from Cloudflare AI');
    }

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 