import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

// POST a new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, email, displayName, photoURL } = body;
    
    // Validate required fields
    if (!uid || !email) {
      return NextResponse.json(
        { error: "Missing required fields (uid and email)" },
        { status: 400 }
      );
    }
    
    try {
      await connectToDatabase();
      
      // Check if user already exists
      const existingUser = await User.findOne({ uid });
      if (existingUser) {
        console.log(`User already exists: ${uid}`);
        return NextResponse.json(
          { message: "User already exists", user: existingUser },
          { status: 200 }
        );
      }
      
      console.log(`Creating new user in MongoDB: ${email} (${uid})`);
      // Create new user
      const user = new User({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL,
        dateCreated: new Date(),
        lastLogin: new Date()
      });
      
      const savedUser = await user.save();
      console.log(`User created successfully: ${savedUser._id}`);
      
      return NextResponse.json(savedUser, { status: 201 });
    } catch (dbError: any) {
      console.error("Database error creating user:", dbError);
      
      // In development mode, create a mock response
      if (process.env.NODE_ENV === 'development') {
        console.log("Using mock user response in development mode");
        const mockUser = {
          _id: `mock-${Date.now()}`,
          uid,
          email,
          displayName: displayName || email.split('@')[0],
          photoURL,
          baseCurrency: "USD",
          dateCreated: new Date(),
          lastLogin: new Date(),
          taxResidency: "United States",
          nationality: "United States"
        };
        
        return NextResponse.json(mockUser, { status: 201 });
      }
      
      // In production, return error
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { 
        error: "Failed to create user",
        details: error.message,
        code: error.code || "unknown"
      },
      { status: 500 }
    );
  }
}

// GET user by Firebase UID
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const uid = searchParams.get("uid");
    
    if (!uid) {
      return NextResponse.json(
        { error: "User ID (uid) is required" }, 
        { status: 400 }
      );
    }

    try {
      await connectToDatabase();
      
      const user = await User.findOne({ uid });
      
      if (!user) {
        // In development, provide mock data if DB connection fails
        if (process.env.NODE_ENV === 'development') {
          console.log("Returning mock user in development mode");
          const mockUser = {
            _id: `mock-${Date.now()}`,
            uid,
            email: "mock@example.com",
            displayName: "Mock User",
            baseCurrency: "USD",
            dateCreated: new Date(),
            lastLogin: new Date(),
            taxResidency: "United States",
            nationality: "United States"
          };
          
          return NextResponse.json(mockUser);
        }
        
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(user);
    } catch (dbError) {
      console.error("Database error fetching user:", dbError);
      
      // In development, create mock response
      if (process.env.NODE_ENV === 'development') {
        console.log("Using mock user response in development mode");
        const mockUser = {
          _id: `mock-${Date.now()}`,
          uid,
          email: "mock@example.com",
          displayName: "Mock User",
          baseCurrency: "USD",
          dateCreated: new Date(),
          lastLogin: new Date(),
          taxResidency: "United States",
          nationality: "United States"
        };
        
        return NextResponse.json(mockUser);
      }
      
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch user",
        details: error.message
      }, 
      { status: 500 }
    );
  }
} 