import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  Auth,
  connectAuthEmulator
} from "firebase/auth";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if config is available
let app;
let auth: Auth;

if (typeof window !== 'undefined' && 
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId) {
  try {
    console.log("Initializing Firebase with project:", firebaseConfig.projectId);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.useDeviceLanguage();
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.warn("Firebase configuration is incomplete. Some features may not work.");
  // Initialize auth with a mock implementation for SSR
  auth = {
    currentUser: null,
    // Add other required properties/methods
  } as Auth;
}

// Create the Google provider instance
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Development-only mock user for testing without Firebase connectivity
const createMockUser = (email: string) => {
  return {
    uid: `mock-${Date.now()}`,
    email,
    emailVerified: false,
    displayName: email.split('@')[0],
    isAnonymous: false,
    providerData: [],
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    }
  } as unknown as User;
};

// Auth functions with fallback for development
export const signUp = async (email: string, password: string) => {
  console.log(`Attempting to create user with email: ${email}`);
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User created successfully:", result.user.uid);
    return result;
  } catch (error: any) {
    console.error("Error in signUp function:", error);
    
    // In development, provide a mock success response for easier testing
    if (process.env.NODE_ENV === 'development' && error.code === 'auth/network-request-failed') {
      console.warn("Using mock registration due to network error");
      const mockUser = createMockUser(email);
      return { user: mockUser } as any;
    }
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  console.log(`Attempting to sign in user with email: ${email}`);
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("User signed in successfully:", result.user.uid);
    return result;
  } catch (error: any) {
    console.error("Error in signIn function:", error);
    
    // In development, provide a mock success response for easier testing
    if (process.env.NODE_ENV === 'development' && error.code === 'auth/network-request-failed') {
      console.warn("Using mock login due to network error");
      const mockUser = createMockUser(email);
      return { user: mockUser } as any;
    }
    throw error;
  }
};

export const signInWithGoogle = async () => {
  console.log("Attempting to sign in with Google");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google sign in successful:", result.user.uid);
    return result;
  } catch (error: any) {
    console.error("Error in signInWithGoogle function:", error);
    
    // In development, provide a mock success response for easier testing
    if (process.env.NODE_ENV === 'development' && error.code === 'auth/network-request-failed') {
      console.warn("Using mock Google login due to network error");
      const mockUser = createMockUser("google-user@example.com");
      return { user: mockUser } as any;
    }
    throw error;
  }
};

export const signOut = async () => {
  console.log("Attempting to sign out user");
  try {
    await firebaseSignOut(auth);
    console.log("User signed out successfully");
  } catch (error: any) {
    console.error("Error in signOut function:", error);
    
    // In development, don't throw on network errors
    if (process.env.NODE_ENV !== 'development' || error.code !== 'auth/network-request-failed') {
      throw error;
    }
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { auth, app }; 