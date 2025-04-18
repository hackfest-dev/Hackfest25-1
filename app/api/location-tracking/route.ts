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

// POST /api/location-tracking
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const { userId, country, countryCode, city, entryDate, exitDate = null } = body;
    
    if (!userId || !country || !countryCode || !entryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const db = await getDatabase();
    
    // Create a document to store in the database
    const locationEntry = {
      userId,
      country,
      countryCode,
      city,
      entryDate: new Date(entryDate),
      exitDate: exitDate ? new Date(exitDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isCurrentLocation: !exitDate,
      daysSpent: calculateDaysSpent(entryDate, exitDate),
    };
    
    // Insert into the database
    await db.collection('locationHistory').insertOne(locationEntry);
    
    return NextResponse.json({
      message: 'Location entry saved successfully',
      status: 'success',
      locationEntry,
    });
  } catch (error) {
    console.error('Error saving location entry:', error);
    return NextResponse.json(
      { error: 'Failed to save location entry', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/location-tracking
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const db = await getDatabase();
    
    // Build query filters
    const filters: any = { userId };
    
    // Add year filter if provided
    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`);
      
      filters.$or = [
        // Entries that start within the year
        { entryDate: { $gte: startOfYear, $lt: endOfYear } },
        // Entries that end within the year
        { exitDate: { $gte: startOfYear, $lt: endOfYear } },
        // Entries that span the year (start before, end after)
        { entryDate: { $lt: startOfYear }, exitDate: { $gte: endOfYear } }
      ];
    }
    
    // Get location history for the user
    const locationHistory = await db.collection('locationHistory')
      .find(filters)
      .sort({ entryDate: -1 })
      .toArray();
    
    // Calculate summary statistics
    const summary = calculateLocationSummary(locationHistory, Number(year));
    
    return NextResponse.json({ 
      locationHistory,
      summary
    });
  } catch (error) {
    console.error('Error fetching location history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location history', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PATCH /api/location-tracking
export async function PATCH(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const { userId, locationId, updates } = body;
    
    if (!userId || !locationId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const db = await getDatabase();
    
    // Ensure updates object doesn't contain any unauthorized fields
    const allowedFields = ['country', 'countryCode', 'city', 'entryDate', 'exitDate'];
    const sanitizedUpdates: any = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        // Convert date strings to Date objects
        if (key === 'entryDate' || key === 'exitDate') {
          sanitizedUpdates[key] = updates[key] ? new Date(updates[key]) : null;
        } else {
          sanitizedUpdates[key] = updates[key];
        }
      }
    });
    
    // Add updatedAt timestamp
    sanitizedUpdates.updatedAt = new Date();
    
    // Calculate days spent if dates were updated
    if (sanitizedUpdates.entryDate || sanitizedUpdates.exitDate) {
      // First get the current entry
      const currentEntry = await db.collection('locationHistory').findOne({ 
        _id: new mongoose.Types.ObjectId(locationId),
        userId 
      });
      
      if (currentEntry) {
        const entryDate = sanitizedUpdates.entryDate || currentEntry.entryDate;
        const exitDate = sanitizedUpdates.exitDate || currentEntry.exitDate;
        sanitizedUpdates.daysSpent = calculateDaysSpent(entryDate, exitDate);
        sanitizedUpdates.isCurrentLocation = !exitDate;
      }
    }
    
    // Update the location entry
    const result = await db.collection('locationHistory').updateOne(
      { 
        _id: new mongoose.Types.ObjectId(locationId),
        userId 
      },
      { $set: sanitizedUpdates }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Location entry not found or not authorized' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Location entry updated successfully',
      status: 'success',
      updated: sanitizedUpdates
    });
  } catch (error) {
    console.error('Error updating location entry:', error);
    return NextResponse.json(
      { error: 'Failed to update location entry', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/location-tracking
export async function DELETE(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const locationId = searchParams.get('locationId');
    
    if (!userId || !locationId) {
      return NextResponse.json(
        { error: 'User ID and Location ID are required' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const db = await getDatabase();
    
    // Delete the location entry
    const result = await db.collection('locationHistory').deleteOne({
      _id: new mongoose.Types.ObjectId(locationId),
      userId
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Location entry not found or not authorized' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Location entry deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting location entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete location entry', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to calculate days spent between two dates
function calculateDaysSpent(entryDate: string | Date, exitDate: string | Date | null): number {
  const entry = new Date(entryDate);
  
  if (!exitDate) {
    // If still at this location, calculate days until now
    const now = new Date();
    return Math.floor((now.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  
  const exit = new Date(exitDate);
  return Math.floor((exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// Helper function to calculate location summary statistics
function calculateLocationSummary(locationHistory: any[], year: number = new Date().getFullYear()) {
  // Filter entries relevant to the specified year
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  
  // Days per country in the specified year
  const daysPerCountry: Record<string, number> = {};
  let totalDays = 0;
  
  locationHistory.forEach(entry => {
    const entryDate = new Date(entry.entryDate);
    const exitDate = entry.exitDate ? new Date(entry.exitDate) : new Date();
    
    // Skip entries completely outside the year
    if (exitDate < startOfYear || entryDate >= endOfYear) {
      return;
    }
    
    // Adjust dates to be within the year
    const effectiveStart = entryDate < startOfYear ? startOfYear : entryDate;
    const effectiveEnd = exitDate > endOfYear ? endOfYear : exitDate;
    
    // Calculate days in this year
    const daysInYear = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 
                                   (1000 * 60 * 60 * 24)) + 1;
    
    // Add to country total
    daysPerCountry[entry.country] = (daysPerCountry[entry.country] || 0) + daysInYear;
    totalDays += daysInYear;
  });
  
  // Find primary residence (country with most days)
  let primaryResidence = '';
  let primaryResidenceDays = 0;
  
  Object.entries(daysPerCountry).forEach(([country, days]) => {
    if (days > primaryResidenceDays) {
      primaryResidence = country;
      primaryResidenceDays = days;
    }
  });
  
  // Calculate percentage in primary residence
  const primaryResidencePercentage = totalDays > 0 ? 
    Math.round((primaryResidenceDays / totalDays) * 100) : 0;
  
  return {
    year,
    totalDays,
    countriesVisited: Object.keys(daysPerCountry).length,
    daysPerCountry,
    primaryResidence,
    primaryResidenceDays,
    primaryResidencePercentage
  };
} 