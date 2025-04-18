import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import UserTaxProfile from '@/models/UserTaxProfile';

// MongoDB connection
let clientPromise: Promise<MongoClient>;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;

// Initialize the MongoDB connection
async function initMongoDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/spendx';
  
  if (isConnected && clientPromise) {
    console.log('MongoDB is already connected');
    return clientPromise;
  }
  
  if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
    console.error(`Failed to connect to MongoDB after ${MAX_RETRY_ATTEMPTS} attempts. Resetting connection state.`);
    isConnected = false;
    connectionAttempts = 0;
  }
  
  connectionAttempts++;
  
  try {
    console.log(`MongoDB connection attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS} at URI:`, uri);
    // Create a new MongoClient with improved connection settings
    const client = new MongoClient(uri, {
      // Add some options to make connection more reliable
      connectTimeoutMS: 15000, // 15 seconds
      socketTimeoutMS: 60000,  // 60 seconds
      serverSelectionTimeoutMS: 10000, // 10 seconds
    });
    
    // Connect to the MongoDB server
    clientPromise = client.connect();
    
    // Test the connection
    const connectedClient = await clientPromise;
    const db = connectedClient.db(process.env.MONGODB_DB || 'spendx');
    await db.command({ ping: 1 });
    
    console.log('Successfully connected to MongoDB');
    isConnected = true;
    connectionAttempts = 0; // Reset counter on successful connection
    
    return clientPromise;
  } catch (error) {
    console.error(`Failed to connect to MongoDB (attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}):`, error);
    isConnected = false;
    
    // If we've reached max attempts, throw the error
    if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
      throw error;
    }
    
    // Otherwise, retry with exponential backoff
    const backoff = Math.min(1000 * Math.pow(2, connectionAttempts), 10000);
    console.log(`Retrying connection in ${backoff}ms...`);
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    // Recursive retry
    return initMongoDB();
  }
}

// Get MongoDB database with error handling
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
    // Reset connection state for future attempts
    isConnected = false;
    throw error;
  }
}

// Function to validate tax profile data with improved error handling
function validateTaxProfile(data: any): { isValid: boolean; errors: string[]; validatedData: any } {
  const errors: string[] = [];
  const validatedData = { ...data }; // Clone data to avoid modifying the original
  
  // Check required fields
  if (!validatedData.userId) {
    errors.push('userId is required');
  }
  
  if (!validatedData.taxHome) {
    errors.push('taxHome is required');
  }
  
  if (!validatedData.taxHomeCode) {
    errors.push('taxHomeCode is required');
  }
  
  // Check citizenship array
  if (!validatedData.citizenship || !Array.isArray(validatedData.citizenship)) {
    errors.push('citizenship must be an array');
    validatedData.citizenship = [];
  } else if (validatedData.citizenship.length === 0) {
    errors.push('citizenship must contain at least one country');
  }
  
  // Check additionalTaxObligations array
  if (!validatedData.additionalTaxObligations) {
    validatedData.additionalTaxObligations = [];
  } else if (!Array.isArray(validatedData.additionalTaxObligations)) {
    errors.push('additionalTaxObligations must be an array');
    validatedData.additionalTaxObligations = [];
  }
  
  // Check declareTaxIn array
  if (!validatedData.declareTaxIn) {
    validatedData.declareTaxIn = validatedData.taxHomeCode ? [validatedData.taxHomeCode] : [];
  } else if (!Array.isArray(validatedData.declareTaxIn)) {
    errors.push('declareTaxIn must be an array');
    validatedData.declareTaxIn = validatedData.taxHomeCode ? [validatedData.taxHomeCode] : [];
  }
  
  // Check userSettings
  if (!validatedData.userSettings) {
    errors.push('userSettings is required');
    // Set default values
    validatedData.userSettings = {
      baseYear: new Date().getFullYear(),
      preferredCurrency: 'USD',
      trackIncome: true
    };
  } else {
    // Check userSettings fields
    if (typeof validatedData.userSettings.baseYear !== 'number') {
      validatedData.userSettings.baseYear = new Date().getFullYear();
    }
    if (!validatedData.userSettings.preferredCurrency) {
      validatedData.userSettings.preferredCurrency = 'USD';
    }
    if (typeof validatedData.userSettings.trackIncome !== 'boolean') {
      validatedData.userSettings.trackIncome = true;
    }
  }
  
  return { 
    isValid: errors.length === 0, 
    errors,
    validatedData
  };
}

// GET /api/user-tax-profile
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
    const collection = db.collection('usertaxprofiles');
    
    // Get the user's tax profile
    const taxProfile = await collection.findOne({ userId });
    
    if (!taxProfile) {
      return NextResponse.json(
        { error: 'Tax profile not found for this user' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(taxProfile);
  } catch (error) {
    console.error('Error fetching user tax profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user tax profile', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/user-tax-profile - Create or update profile
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { userId } = body;
    
    console.log('POST /api/user-tax-profile - Request body:', JSON.stringify(body, null, 2));
    
    if (!userId) {
      console.error('POST /api/user-tax-profile - Missing userId in request body');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Validate the tax profile data
    const { isValid, errors, validatedData } = validateTaxProfile(body);
    
    if (!isValid) {
      console.error('POST /api/user-tax-profile - Validation errors:', errors);
      return NextResponse.json(
        { error: 'Invalid tax profile data', details: errors },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const db = await getDatabase();
    const collection = db.collection('usertaxprofiles');
    
    // Check if profile already exists
    const existingProfile = await collection.findOne({ userId });
    
    if (existingProfile) {
      console.log('POST /api/user-tax-profile - Updating existing profile for userId:', userId);
      // Update existing profile
      try {
        const result = await collection.updateOne(
          { userId },
          { 
            $set: {
              ...validatedData,
              updatedAt: new Date()
            }
          }
        );
        
        console.log('POST /api/user-tax-profile - Update result:', result);
        
        return NextResponse.json({
          message: 'Tax profile updated successfully',
          status: 'success',
          updated: result.modifiedCount > 0
        });
      } catch (updateError) {
        console.error('POST /api/user-tax-profile - Error during update operation:', updateError);
        throw updateError;
      }
    } else {
      console.log('POST /api/user-tax-profile - Creating new profile for userId:', userId);
      // Create new profile
      const newProfile = {
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      try {
        const result = await collection.insertOne(newProfile);
        
        console.log('POST /api/user-tax-profile - Insert result:', result);
        
        return NextResponse.json({
          message: 'Tax profile created successfully',
          status: 'success',
          id: result.insertedId
        });
      } catch (insertError) {
        console.error('POST /api/user-tax-profile - Error during insert operation:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error saving user tax profile:', error);
    
    // More detailed error information
    const errorDetail = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
      
    console.error('Error details:', JSON.stringify(errorDetail, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Failed to save user tax profile', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PATCH /api/user-tax-profile - Update specific fields
export async function PATCH(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { userId, updates } = body;
    
    if (!userId || !updates) {
      return NextResponse.json(
        { error: 'User ID and updates are required' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const db = await getDatabase();
    const collection = db.collection('usertaxprofiles');
    
    // Update the user's tax profile
    const result = await collection.updateOne(
      { userId },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Tax profile not found for this user' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Tax profile updated successfully',
      status: 'success',
      updated: result.modifiedCount > 0
    });
  } catch (error) {
    console.error('Error updating user tax profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user tax profile', details: (error as Error).message },
      { status: 500 }
    );
  }
} 