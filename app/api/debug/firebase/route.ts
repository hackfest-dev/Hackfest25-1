import { NextRequest, NextResponse } from "next/server";
import { app, auth } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  try {
    // Collect Firebase initialization info
    const firebaseInfo = {
      appInitialized: !!app,
      authInitialized: !!auth,
      currentUser: auth?.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified,
      } : null,
      appConfig: {
        name: app?.name,
        options: app?.options,
      },
      authConfig: {
        appName: auth?.app?.name,
        currentLanguageCode: auth?.languageCode,
        settings: {
          appVerificationDisabledForTesting: auth?.settings?.appVerificationDisabledForTesting,
        }
      }
    };

    return NextResponse.json({ 
      success: true, 
      message: "Firebase debug info retrieved successfully",
      firebaseInfo
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: "Failed to retrieve Firebase debug info",
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
      }
    }, { status: 500 });
  }
} 