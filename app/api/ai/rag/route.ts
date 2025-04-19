import { NextResponse } from 'next/server';

const CLOUDFLARE_ACCOUNT_ID = 'b24e2ba64a61f064e0c2e4e02f757593';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const RAG_ID = 'airug';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!CLOUDFLARE_API_TOKEN) {
      console.error('Cloudflare API token is missing');
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/autorag/rags/${RAG_ID}/ai-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
        body: JSON.stringify({
          query,
          max_results: 5,
          include_metadata: true
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudflare API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to process AutoRAG request', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Add context about the application
    const enhancedResponse = {
      ...data,
      context: {
        application: 'SpendX',
        features: [
          'Transaction Management',
          'Budgeting',
          'Currency Conversion',
          'Dashboard Analytics'
        ],
        limitations: [
          'No recurring transactions',
          'No split transactions',
          'No receipt scanning'
        ]
      }
    };

    return NextResponse.json(enhancedResponse);
  } catch (error) {
    console.error('AutoRAG API error:', error);
    return NextResponse.json(
      { error: 'Failed to process AutoRAG request' },
      { status: 500 }
    );
  }
} 