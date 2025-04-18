import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getLatestRates } from "@/lib/currency";
import mongoose from 'mongoose';
import { 
  guessCategory, 
  getAllCategories, 
  CATEGORIES,
  groupTransactionsByCategory,
  getCategoryColor
} from "@/lib/transactionCategories";

// GET /api/transactions
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Required filter by userId for security
    const userId = searchParams.get('userId');
    if (!userId) {
      console.error('Missing userId parameter in transactions API call:', 
        Object.fromEntries(searchParams.entries()));
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query filters
    const filters: any = { userId };
    
    // Date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }
    
    // Category - support multiple categories
    const category = searchParams.get('category');
    const categories = searchParams.get('categories');
    if (category) {
      filters.category = category;
    } else if (categories) {
      // Handle comma-separated list of categories
      const categoryList = categories.split(',');
      filters.category = { $in: categoryList };
    }

    // Enhanced category filtering - by type (income/expense)
    const categoryType = searchParams.get('categoryType');
    if (categoryType) {
      if (categoryType === 'income') {
        filters.category = CATEGORIES.INCOME;
      } else if (categoryType === 'expense') {
        // All categories except INCOME
        const expenseCategories = getAllCategories().filter(cat => cat !== CATEGORIES.INCOME);
        filters.category = { $in: expenseCategories };
      }
    }
    
    // Amount range
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    if (minAmount || maxAmount) {
      filters.amount = {};
      if (minAmount) filters.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filters.amount.$lte = parseFloat(maxAmount);
    }
    
    // Currency
    const currency = searchParams.get('currency');
    if (currency) filters.currency = currency;
    
    // Text search in description
    const search = searchParams.get('search');
    if (search) {
      filters.description = { $regex: search, $options: 'i' };
    }
    
    // Sorting
    const sortField = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const sort: any = {};
    sort[sortField] = sortOrder;
    
    // Check if we need category stats
    const includeStats = searchParams.get('includeStats') === 'true';
    
    // Execute query with pagination
    const transactions = await Transaction.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Transaction.countDocuments(filters);
    
    // Prepare response
    const response: any = {
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };

    // Add category statistics if requested
    if (includeStats) {
      // Get all transactions for stats (without pagination)
      const allTransactions = await Transaction.find(filters);
      
      // Group transactions by category
      const categoryStats = groupTransactionsByCategory(allTransactions);
      
      // Add category colors to stats
      const enhancedStats = Object.entries(categoryStats).map(([category, amount]) => ({
        category,
        amount,
        color: getCategoryColor(category as any)
      }));
      
      response.categoryStats = enhancedStats;
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/transactions
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Handle bulk transaction creation
    if (Array.isArray(data)) {
      const transactions = [];
      const errors = [];
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // Validate required fields
        if (!item.userId || !item.amount || !item.currency || !item.description) {
          errors.push({
            index: i,
            error: 'Invalid transaction data',
            details: 'Transaction must include userId, amount, currency, and description'
          });
          continue;
        }
        
        // Ensure date is a Date object
        if (item.date) {
          item.date = new Date(item.date);
        } else {
          item.date = new Date();
        }
        
        // Auto-categorize transaction if no category is provided
        if (!item.category) {
          item.category = guessCategory(item.description);
        } else if (!getAllCategories().includes(item.category)) {
          // If provided category is invalid, auto-categorize instead
          item.category = guessCategory(item.description);
        }
        
        transactions.push(item);
      }
      
      if (transactions.length === 0) {
        return NextResponse.json(
          { error: 'No valid transactions provided', details: errors },
          { status: 400 }
        );
      }
      
      const createdTransactions = await Transaction.insertMany(transactions);
      
      return NextResponse.json({
        transactions: createdTransactions,
        errors: errors.length > 0 ? errors : undefined
      }, { status: 201 });
    } else {
      // Single transaction creation
      // Validate required fields
      if (!data.userId || !data.amount || !data.currency || !data.description) {
        return NextResponse.json(
          { 
            error: 'Invalid transaction data', 
            details: 'Transaction must include userId, amount, currency, and description' 
          },
          { status: 400 }
        );
      }
      
      // Ensure date is a Date object
      if (data.date) {
        data.date = new Date(data.date);
      } else {
        data.date = new Date();
      }
      
      // Auto-categorize transaction if no category is provided
      if (!data.category) {
        data.category = guessCategory(data.description);
      } else if (!getAllCategories().includes(data.category)) {
        // If provided category is invalid, auto-categorize instead
        data.category = guessCategory(data.description);
      }
      
      // Ensure location has required fields
      if (!data.location) {
        data.location = {
          country: "Unknown",
          city: "Unknown"
        };
      } else if (!data.location.city) {
        // Ensure city field exists even if it's the same as country
        data.location.city = data.location.country || "Unknown";
      }
      
      console.log("Creating transaction with data:", JSON.stringify(data, null, 2));
      
      const transaction = new Transaction(data);
      await transaction.save();
      
      return NextResponse.json(transaction, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    // Log more detailed error information
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
      return NextResponse.json(
        { 
          error: 'Transaction validation failed', 
          details: error.message,
          validationErrors: Object.keys(error.errors).reduce((acc, key) => {
            acc[key] = error.errors[key].message;
            return acc;
          }, {})
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

// DELETE a transaction
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    
    await connectToDatabase();
    
    // Handle bulk delete
    if (ids) {
      const idArray = ids.split(',');
      
      if (idArray.length === 0) {
        return NextResponse.json(
          { error: "No transaction IDs provided" },
          { status: 400 }
        );
      }
      
      const result = await Transaction.deleteMany({ _id: { $in: idArray } });
      
      return NextResponse.json({ 
        success: true,
        deletedCount: result.deletedCount
      });
    }
    
    // Handle single delete
    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }
    
    const deletedTransaction = await Transaction.findByIdAndDelete(id);
    
    if (!deletedTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}

// GET /api/transactions/categories
export function GET_CATEGORIES() {
  try {
    const categories = getAllCategories();
    // Add colors to categories
    const categoriesWithDetails = categories.map(category => ({
      name: category,
      color: getCategoryColor(category as any)
    }));
    
    return NextResponse.json({ categories: categoriesWithDetails });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/transactions/categorize
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Validate input
    if (!data.transactionIds || !Array.isArray(data.transactionIds) || !data.category) {
      return NextResponse.json(
        { error: 'Invalid request data', details: 'Must include transactionIds array and category' },
        { status: 400 }
      );
    }
    
    // Ensure category is valid
    const validCategories = getAllCategories();
    if (!validCategories.includes(data.category)) {
      return NextResponse.json(
        { error: 'Invalid category', details: `Category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Update transactions with new category
    const result = await Transaction.updateMany(
      { _id: { $in: data.transactionIds } },
      { $set: { category: data.category } }
    );
    
    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error('Error updating transaction categories:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction categories', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/transactions/auto-categorize
export async function AUTO_CATEGORIZE(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Validate input
    if (!data.transactionIds || !Array.isArray(data.transactionIds)) {
      return NextResponse.json(
        { error: 'Invalid request data', details: 'Must include transactionIds array' },
        { status: 400 }
      );
    }
    
    // Get transactions to categorize
    const transactions = await Transaction.find({ _id: { $in: data.transactionIds } });
    
    // Apply auto-categorization
    const updates = [];
    for (const transaction of transactions) {
      const suggestedCategory = guessCategory(transaction.description);
      if (suggestedCategory !== transaction.category) {
        updates.push({
          updateOne: {
            filter: { _id: transaction._id },
            update: { $set: { category: suggestedCategory } }
          }
        });
      }
    }
    
    // Apply updates if any
    if (updates.length > 0) {
      const result = await Transaction.bulkWrite(updates);
      return NextResponse.json({
        success: true,
        modifiedCount: result.modifiedCount,
        totalProcessed: transactions.length
      });
    }
    
    return NextResponse.json({
      success: true,
      modifiedCount: 0,
      totalProcessed: transactions.length
    });
  } catch (error: any) {
    console.error('Error auto-categorizing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to auto-categorize transactions', details: error.message },
      { status: 500 }
    );
  }
} 