import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const { analysisData } = await req.json();

    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
      throw new Error('Cloudflare credentials not configured');
    }

    // Prepare the prompt with detailed transaction analysis
    const prompt = `You are an advanced financial advisor AI assistant specializing in personal finance and budgeting. 
    Your task is to analyze financial data and provide comprehensive insights in a specific JSON format.

    Transaction Data:
    ${JSON.stringify(analysisData, null, 2)}

    Based on this data, provide detailed insights in the following format:
    {
      "spendingPatterns": {
        "analysis": "Detailed analysis of spending patterns with specific numbers and trends",
        "topCategories": ["Category 1", "Category 2", "Category 3"],
        "monthlyTrend": "Analysis of monthly spending trends",
        "featureRecommendation": "Specific feature to use for better tracking"
      },
      "savingsOpportunities": {
        "analysis": "Detailed analysis of potential savings with specific amounts",
        "categories": ["Category 1", "Category 2"],
        "potentialSavings": "Estimated monthly savings amount",
        "featureRecommendation": "Specific feature to use for savings tracking"
      },
      "financialHealth": {
        "score": "Current financial health score",
        "strengths": ["Strength 1", "Strength 2"],
        "areasForImprovement": ["Area 1", "Area 2"],
        "featureRecommendation": "Specific feature to use for improvement"
      },
      "personalizedRecommendations": [
        {
          "recommendation": "Specific actionable recommendation",
          "feature": "Related feature to use",
          "impact": "Expected impact of following the recommendation"
        }
      ]
    }

    Focus on:
    1. Actual transaction data and patterns
    2. Specific amounts and percentages
    3. Realistic savings opportunities
    4. Actionable recommendations
    5. Feature suggestions based on the data

    Be specific and data-driven in your analysis.`;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.5
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

    // Clean the response text to ensure it's valid JSON
    responseText = responseText.trim();
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON object found in AI response');
    }
    responseText = responseText.slice(jsonStart, jsonEnd);

    // Parse the JSON
    let insights;
    try {
      insights = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the insights structure
    if (!insights.spendingPatterns || !insights.savingsOpportunities || 
        !insights.financialHealth || !Array.isArray(insights.personalizedRecommendations)) {
      throw new Error('Invalid insights structure received from AI');
    }

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 