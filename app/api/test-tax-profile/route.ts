import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// MongoDB connection
let clientPromise: Promise<MongoClient>;
let isConnected = false;

// Initialize the MongoDB connection
async function initMongoDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/spendx';
  
  if (isConnected && clientPromise) {
    console.log('MongoDB is already connected');
    return clientPromise;
  }
  
  try {
    console.log('Connecting to MongoDB at URI:', uri);
    const client = new MongoClient(uri, {
      connectTimeoutMS: 15000,
      socketTimeoutMS: 60000,
    });
    
    clientPromise = client.connect();
    
    const connectedClient = await clientPromise;
    const db = connectedClient.db(process.env.MONGODB_DB || 'spendx');
    await db.command({ ping: 1 });
    
    console.log('Successfully connected to MongoDB');
    isConnected = true;
    
    return clientPromise;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    isConnected = false;
    throw error;
  }
}

// Get MongoDB database
async function getDatabase() {
  try {
    if (!clientPromise || !isConnected) {
      await initMongoDB();
    }
    
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB || 'spendx';
    return client.db(dbName);
  } catch (error) {
    console.error('Error getting database:', error);
    throw error;
  }
}

// GET /api/test-tax-profile
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required as a query parameter' },
        { status: 400 }
      );
    }
    
    // Create a sample tax profile for testing
    const testProfile = {
      userId: userId,
      taxHome: "United States",
      taxHomeCode: "US",
      citizenship: ["US"],
      additionalTaxObligations: [
        {
          country: "United States",
          countryCode: "US",
          reason: "Citizenship"
        }
      ],
      declareTaxIn: ["US"],
      userSettings: {
        baseYear: new Date().getFullYear(),
        preferredCurrency: "USD",
        trackIncome: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Connect to the database
    const db = await getDatabase();
    const collection = db.collection('usertaxprofiles');
    
    // Check if profile already exists
    const existingProfile = await collection.findOne({ userId });
    
    let result;
    if (existingProfile) {
      // Update existing profile
      result = await collection.updateOne(
        { userId },
        { $set: { ...testProfile, updatedAt: new Date() } }
      );
      
      return NextResponse.json({
        message: 'Test tax profile updated successfully',
        status: 'success',
        updated: true,
        profile: testProfile
      });
    } else {
      // Create new profile
      result = await collection.insertOne(testProfile);
      
      return NextResponse.json({
        message: 'Test tax profile created successfully',
        status: 'success',
        id: result.insertedId,
        profile: testProfile
      });
    }
  } catch (error) {
    console.error('Error creating test tax profile:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create test tax profile', 
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 