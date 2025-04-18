"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserCredential } from "firebase/auth";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  signIn, 
  signUp, 
  signInWithGoogle, 
  signOut, 
  onAuthStateChange 
} from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

// Extend UserCredential to include the property returned by Firebase
interface ExtendedUserCredential extends UserCredential {
  _tokenResponse?: {
    isNewUser?: boolean;
  };
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Create MongoDB user record
  const createUserInDatabase = async (user: User) => {
    try {
      await axios.post('/api/users', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
      });
      console.log("User record created in MongoDB");
    } catch (error) {
      console.error("Error creating user in database:", error);
      // We continue even if MongoDB creation fails to not block the user
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const result = await signUp(email, password);
      // After Firebase auth creation, create MongoDB record
      if (result && result.user) {
        await createUserInDatabase(result.user);
      }
      router.push("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithGoogle() as ExtendedUserCredential;
      // Check if this is a new user (no previous login)
      if (result && result.user && result._tokenResponse?.isNewUser) {
        await createUserInDatabase(result.user);
      }
      router.push("/dashboard");
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 