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

// Direct Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPYtwrJCx5_1NcqFZjy2bYN_sWeF05xLA",
  authDomain: "spendx-dev.firebaseapp.com",
  projectId: "spendx-dev",
  storageBucket: "spendx-dev.firebasestorage.app",
  messagingSenderId: "720137835192",
  appId: "1:720137835192:web:120a2eefc77cda5e571a4d",
  measurementId: "G-NDKTV2LPWS"
};

console.log("Initializing Firebase with project:", firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure the auth instance
auth.useDeviceLanguage();

// IMPORTANT: Firebase Auth Emulator is disabled
// We are NOT connecting to the emulator to ensure proper Google authentication flow
// DO NOT uncomment the following block unless you specifically need the emulator
// if (process.env.NODE_ENV === 'development') {
//   connectAuthEmulator(auth, 'http://localhost:9099');
//   console.log('Using Firebase Auth Emulator');
// }

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