import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import mongoose from "mongoose";

// Define a schema for relocation preferences
const RelocationPreferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  baseCurrency: { type: String, required: true },
  budgetMin: { type: Number, required: true },
  budgetMax: { type: Number, required: true },
  mustHaveFeatures: { type: [String], default: [] },
  preferredRegions: { type: [String], default: [] },
  internetMinSpeed: { type: Number, default: 20 },
  lifestyle: { type: [String], default: [] },
  savedCities: [{
    city: String,
    country: String,
    monthlyEstimate: Number,
    savingsEstimate: Number,
    notes: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Get or create the model
const getRelocationModel = () => {
  const conn = mongoose.connection;
  return conn.models.RelocationPreference || 
    mongoose.model('RelocationPreference', RelocationPreferenceSchema);
};

// GET - Fetch user's saved relocation preferences
export async function GET(request: Request) {
  try {
    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await connectToDatabase();
    const RelocationPreference = getRelocationModel();
    
    // Find preferences for the user
    const preferences = await RelocationPreference.findOne({ userId });

    // Return found preferences or null if not found
    return NextResponse.json(preferences || null);
  } catch (error) {
    console.error("Error fetching relocation preferences:", error);
    return NextResponse.json(
      { error: "Error fetching preferences" },
      { status: 500 }
    );
  }
}

// POST - Save user's relocation preferences
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.userId) {
      return NextResponse.json(
        { error: "User ID is required" }, 
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    const RelocationPreference = getRelocationModel();
    
    // Check if preferences already exist for this user
    const existingPreferences = await RelocationPreference.findOne({ userId: data.userId });
    
    let result;
    
    if (existingPreferences) {
      // Update existing preferences
      result = await RelocationPreference.updateOne(
        { userId: data.userId },
        { 
          $set: {
            ...data,
            updatedAt: new Date()
          } 
        }
      );
    } else {
      // Insert new preferences
      result = await RelocationPreference.create({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: existingPreferences ? "Preferences updated" : "Preferences saved",
      data: result
    });
    
  } catch (error) {
    console.error("Error saving relocation preferences:", error);
    return NextResponse.json(
      { error: "Error saving preferences" },
      { status: 500 }
    );
  }
}

// DELETE - Remove user's saved preferences
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await connectToDatabase();
    const RelocationPreference = getRelocationModel();
    
    // Delete the preferences
    const result = await RelocationPreference.deleteOne({ userId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "No preferences found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Preferences deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting relocation preferences:", error);
    return NextResponse.json(
      { error: "Error deleting preferences" },
      { status: 500 }
    );
  }
} 