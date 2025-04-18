import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

// MongoDB connection
let clientPromise: Promise<MongoClient>;

// Initialize the MongoDB connection
async function initMongoDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/spendx';
  
  try {
    // Create a new MongoClient
    const client = new MongoClient(uri);
    
    // Connect to the MongoDB server
    clientPromise = client.connect();
    
    return clientPromise;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Get MongoDB database
async function getDatabase() {
  if (!clientPromise) {
    await initMongoDB();
  }
  
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || 'spendx';
  return client.db(dbName);
}

// POST /api/user/applied-suggestions
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const { userId, suggestionId, suggestionData, appliedAt } = body;
    
    if (!userId || !suggestionId || !suggestionData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const db = await getDatabase();
    
    // Check if this suggestion was already applied
    const existingEntry = await db.collection('appliedSuggestions').findOne({
      userId,
      suggestionId
    });
    
    if (existingEntry) {
      return NextResponse.json(
        { message: 'Suggestion already applied', status: 'already_applied' },
        { status: 200 }
      );
    }
    
    // Create a document to store in the database
    const appliedSuggestion = {
      userId,
      suggestionId,
      suggestionData,
      appliedAt: appliedAt || new Date().toISOString(),
      status: 'applied',
    };
    
    // Insert into the database
    await db.collection('appliedSuggestions').insertOne(appliedSuggestion);
    
    return NextResponse.json({
      message: 'Suggestion applied successfully',
      status: 'success',
    });
  } catch (error) {
    console.error('Error applying suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to apply suggestion', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/user/applied-suggestions
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const db = await getDatabase();
    
    // Get applied suggestions for the user
    const appliedSuggestions = await db.collection('appliedSuggestions')
      .find({ userId })
      .sort({ appliedAt: -1 })
      .toArray();
    
    return NextResponse.json({ appliedSuggestions });
  } catch (error) {
    console.error('Error fetching applied suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applied suggestions', details: (error as Error).message },
      { status: 500 }
    );
  }
} 