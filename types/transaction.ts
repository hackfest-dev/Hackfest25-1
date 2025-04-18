import { ObjectId } from 'mongodb';

export interface Transaction {
  _id: ObjectId;
  userId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  location?: {
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  convertedAmount?: number;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionCreateInput {
  userId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  location?: {
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  tags?: string[];
  notes?: string;
}

export interface TransactionUpdateInput {
  description?: string;
  amount?: number;
  currency?: string;
  category?: string;
  date?: string;
  location?: {
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  tags?: string[];
  notes?: string;
} 