import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import UserSettings from '@/models/UserSettings.js';

// Define a type for the context parameters
type ContextParams = {
  params: {
    id: string;
  };
};

// GET /api/users/[id]/settings
export async function GET(
  request: NextRequest,
  context: ContextParams
) {
  try {
    await connectToDatabase();
    
    // Properly extract the ID from context params
    const { id: userId } = context.params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Find the user settings or create default settings if none exist
    let userSettings = await UserSettings.findOne({ userId });
    
    if (!userSettings) {
      userSettings = await UserSettings.create({ userId });
    }
    
    return NextResponse.json(userSettings, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id]/settings
export async function PATCH(
  request: NextRequest,
  context: ContextParams
) {
  try {
    await connectToDatabase();
    
    // Properly extract the ID from context params
    const { id: userId } = context.params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const updates = await request.json();
    
    // Find and update the user settings, create if it doesn't exist
    const userSettings = await UserSettings.findOneAndUpdate(
      { userId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, upsert: true }
    );
    
    return NextResponse.json(userSettings, { status: 200 });
  } catch (error: any) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings', details: error.message },
      { status: 500 }
    );
  }
} 