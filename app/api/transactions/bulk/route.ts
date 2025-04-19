import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { transactions } = await request.json();
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No valid transactions provided' },
        { status: 400 }
      );
    }

    // Insert all transactions
    const result = await Transaction.insertMany(transactions);

    return NextResponse.json({
      success: true,
      message: `Successfully created ${result.length} transactions`,
      transactionIds: result.map(t => t._id)
    });
  } catch (error: any) {
    console.error('Error creating transactions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create transactions',
        details: error.message 
      },
      { status: 500 }
    );
  }
}