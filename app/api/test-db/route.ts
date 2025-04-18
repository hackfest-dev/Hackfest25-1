import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

interface MongoDBSuccessResult {
  success: true;
  connection: string;
  database: string;
  collections: string[];
  stats: {
    collections: number;
    objects: number;
    avgObjSize: number;
    dataSize: number;
    storageSize: number;
    indexes: number;
    indexSize: number;
  };
  client: MongoClient;
  taxProfiles?: number;
  transactions?: number;
  countError?: string;
}

interface MongoDBErrorResult {
  success: false;
  connection: string;
  error: string;
  stack: string | null;
}

type MongoDBResult = MongoDBSuccessResult | MongoDBErrorResult;

// Initialize MongoDB connection
async function connectToMongoDB(): Promise<MongoDBResult> {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/spendx';
    console.log('Test endpoint: Connecting to MongoDB at URI:', uri);
    
    const client = new MongoClient(uri, {
      connectTimeoutMS: 15000,
      socketTimeoutMS: 60000,
    });
    
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'spendx');
    await db.command({ ping: 1 });
    
    console.log('Test endpoint: Successfully connected to MongoDB');
    
    // Get list of collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(collection => collection.name);
    
    // Get DB stats
    const stats = await db.stats();
    
    return {
      success: true,
      connection: 'Connected successfully',
      database: db.databaseName,
      collections: collectionNames,
      stats: {
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      },
      client
    };
  } catch (error) {
    console.error('Test endpoint: Failed to connect to MongoDB:', error);
    return {
      success: false,
      connection: 'Failed to connect',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    };
  }
}

// GET /api/test-db
export async function GET(request: NextRequest) {
  let client: MongoClient | null = null;
  try {
    const result = await connectToMongoDB();
    
    if (result.success) {
      client = result.client;
      // Create a copy of the result without the client for the response
      const responseResult = { ...result };
      delete (responseResult as any).client;
      
      // If connection successful, try to get count from the usertaxprofiles collection
      try {
        const db = client.db();
        if (responseResult.collections.includes('usertaxprofiles')) {
          const count = await db.collection('usertaxprofiles').countDocuments();
          responseResult.taxProfiles = count;
        }
        
        // Also check transactions collection if it exists
        if (responseResult.collections.includes('transactions')) {
          const count = await db.collection('transactions').countDocuments();
          responseResult.transactions = count;
        }
      } catch (countError) {
        responseResult.countError = countError instanceof Error ? countError.message : 'Unknown error';
      }
      
      return NextResponse.json(responseResult);
    } else {
      // Error result doesn't have a client to remove
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Test endpoint: Error in test-db route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  } finally {
    // Close MongoDB connection
    if (client) {
      try {
        await client.close();
        console.log('Test endpoint: Closed MongoDB connection');
      } catch (closeError) {
        console.error('Test endpoint: Error closing MongoDB connection:', closeError);
      }
    }
  }
} 