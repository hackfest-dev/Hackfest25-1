import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { guessCategory, getAllCategories, CATEGORIES } from '@/lib/transactionCategories';

// POST /api/transactions/bulk
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    if (!Array.isArray(data.transactions) || data.transactions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Expected an array of transactions' },
        { status: 400 }
      );
    }

    const validCategories = getAllCategories();

    // Validate and enhance each transaction
    for (const transaction of data.transactions) {
      if (!transaction.userId || transaction.amount === undefined || !transaction.currency || 
          !transaction.description) {
        return NextResponse.json(
          { 
            error: 'Invalid transaction data', 
            details: 'Each transaction must include userId, amount, currency, and description'
          },
          { status: 400 }
        );
      }

      // Ensure date is a Date object
      if (transaction.date) {
        transaction.date = new Date(transaction.date);
      } else {
        transaction.date = new Date();
      }
      
      // Validate category if provided
      if (transaction.category && !validCategories.includes(transaction.category)) {
        // If invalid category is provided, replace it with a guess
        transaction.category = guessCategory(transaction.description);
      }
      
      // Auto-categorize if no category provided
      if (!transaction.category) {
        transaction.category = guessCategory(transaction.description);
      }

      // Ensure location has required fields
      if (!transaction.location) {
        transaction.location = {
          country: "Unknown",
          city: "Unknown"
        };
      } else if (!transaction.location.city) {
        // Ensure city field exists even if it's the same as country
        transaction.location.city = transaction.location.country || "Unknown";
      }

      // Set transaction type based on amount and category
      if (transaction.amount > 0 && transaction.category === CATEGORIES.INCOME) {
        transaction.type = 'income';
      } else {
        transaction.type = 'expense';
        // Ensure expense amounts are stored as negative numbers
        if (transaction.amount > 0) {
          transaction.amount = -Math.abs(transaction.amount);
        }
      }
    }

    // Create all transactions
    const result = await Transaction.insertMany(data.transactions);

    return NextResponse.json(
      { 
        message: `Successfully created ${result.length} transactions`,
        transactions: result 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating bulk transactions:', error);
    return NextResponse.json(
      { error: 'Failed to create transactions', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/bulk
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    if (!Array.isArray(data.ids) || data.ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Expected an array of transaction IDs' },
        { status: 400 }
      );
    }

    // Check if userId is provided for security
    if (!data.userId) {
      return NextResponse.json(
        { error: 'User ID is required for bulk operations' },
        { status: 400 }
      );
    }

    // Delete transactions that match both the IDs and the userId
    const result = await Transaction.deleteMany({
      _id: { $in: data.ids },
      userId: data.userId
    });

    return NextResponse.json(
      { 
        message: `Successfully deleted ${result.deletedCount} transactions`,
        deletedCount: result.deletedCount
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting bulk transactions:', error);
    return NextResponse.json(
      { error: 'Failed to delete transactions', details: error.message },
      { status: 500 }
    );
  }
} 