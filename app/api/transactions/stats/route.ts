import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

// GET /api/transactions/stats
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
    
    // Date range
    const startDate = searchParams.get('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    
    // Base filter used in all queries
    const baseFilter = {
      userId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Get totals
    const [
      totalStats,
      categoryBreakdown,
      timeSeriesData,
      currencyBreakdown
    ] = await Promise.all([
      // 1. Get totals (income, expenses, balance)
      Transaction.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: {
                $cond: [{ $gt: ["$amount", 0] }, "$amount", 0]
              }
            },
            totalExpenses: {
              $sum: {
                $cond: [{ $lt: ["$amount", 0] }, "$amount", 0]
              }
            },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // 2. Get category breakdown
      Transaction.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),
      
      // 3. Get time series data (daily)
      Transaction.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              day: { $dayOfMonth: "$date" }
            },
            total: { $sum: "$amount" },
            income: {
              $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] }
            },
            expenses: {
              $sum: { $cond: [{ $lt: ["$amount", 0] }, "$amount", 0] }
            },
            count: { $sum: 1 }
          }
        },
        { 
          $project: {
            _id: 0,
            date: {
              $dateFromParts: {
                year: "$_id.year",
                month: "$_id.month",
                day: "$_id.day"
              }
            },
            total: 1,
            income: 1,
            expenses: 1,
            count: 1
          }
        },
        { $sort: { date: 1 } }
      ]),
      
      // 4. Get currency breakdown
      Transaction.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: "$currency",
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    // Prepare response
    const stats = {
      total: totalStats[0] || { totalIncome: 0, totalExpenses: 0, count: 0 },
      categories: categoryBreakdown.map(cat => ({
        category: cat._id,
        total: cat.total,
        count: cat.count
      })),
      timeSeries: timeSeriesData,
      currencies: currencyBreakdown.map(curr => ({
        currency: curr._id,
        total: curr.total,
        count: curr.count
      }))
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching transaction stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction statistics', details: error.message },
      { status: 500 }
    );
  }
} 