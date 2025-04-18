import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import TaxRules from '@/models/TaxRules';

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

// GET /api/tax-rules
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const countryCode = searchParams.get('countryCode');
    
    // Connect to the database
    const db = await getDatabase();
    const collection = db.collection('taxrules');
    
    if (countryCode) {
      // Get tax rules for a specific country
      const taxRules = await collection.findOne({ countryCode: countryCode.toUpperCase() });
      
      if (!taxRules) {
        return NextResponse.json(
          { error: 'Tax rules not found for this country' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(taxRules);
    } else {
      // Get all tax rules
      const taxRules = await collection.find({}).toArray();
      
      return NextResponse.json({ taxRules });
    }
  } catch (error) {
    console.error('Error fetching tax rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rules', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/tax-rules - Admin only in a real app
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // In a real app, verify admin permissions here
    
    // Connect to the database
    const db = await getDatabase();
    const collection = db.collection('taxrules');
    
    // Check if country already exists
    const existing = await collection.findOne({ 
      $or: [
        { country: body.country },
        { countryCode: body.countryCode }
      ]
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Tax rules already exist for this country' },
        { status: 400 }
      );
    }
    
    // Insert new tax rules
    const result = await collection.insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return NextResponse.json({
      message: 'Tax rules added successfully',
      id: result.insertedId
    });
  } catch (error) {
    console.error('Error adding tax rules:', error);
    return NextResponse.json(
      { error: 'Failed to add tax rules', details: (error as Error).message },
      { status: 500 }
    );
  }
} 