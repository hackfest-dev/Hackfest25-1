"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

export interface Transaction {
  _id: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: Date;
  location?: {
    country: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    }
  };
  convertedAmount?: number;
  baseCurrency?: string;
  exchangeRate?: number;
  paymentMethod?: string;
  isRecurring?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryStats {
  category: string;
  amount: number;
  color: string;
}

export interface TransactionFilters {
  userId?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  categories?: string[];
  categoryType?: 'income' | 'expense';
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeStats?: boolean;
}

export interface TransactionStats {
  total: number;
  average: number;
  categoryStats?: CategoryStats[];
}

export default function useTransactions(initialFilters: TransactionFilters = {}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });

  // Fetch transactions with current filters
  const fetchTransactions = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      // Always add userId - this is critical
      params.append('userId', user.uid);
      
      // Add all other filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'userId') {
          if (key === 'categories' && Array.isArray(value)) {
            params.append('categories', value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
      
      console.log('API Request URL:', `/api/transactions?${params.toString()}`);
      
      const response = await axios.get(`/api/transactions?${params.toString()}`);
      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
      
      // Set category stats if included in response
      if (response.data.categoryStats) {
        setCategoryStats(response.data.categoryStats);
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, filters]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 when changing filters (except when explicitly changing page)
      page: newFilters.page || 1
    }));
  }, []);

  // Handle pagination
  const goToPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  // Create a new transaction
  const createTransaction = useCallback(async (transaction: Omit<Transaction, '_id' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/transactions', {
        ...transaction,
        userId: user.uid,
      });
      // Update local state with new transaction
      setTransactions(prev => [response.data, ...prev]);
      // Refetch to update pagination and potentially stats
      fetchTransactions();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create transaction');
      console.error('Error creating transaction:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, fetchTransactions]);

  // Update a transaction
  const updateTransaction = useCallback(async (
    id: string, 
    updates: Partial<Omit<Transaction, '_id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.patch(`/api/transactions/${id}`, updates);
      // Update local state
      setTransactions(prev => 
        prev.map(t => t._id === id ? { ...t, ...updates } : t)
      );
      // Refetch to update stats if needed
      if (filters.includeStats) {
        fetchTransactions();
      }
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update transaction');
      console.error('Error updating transaction:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, fetchTransactions, filters.includeStats]);

  // Delete a transaction
  const deleteTransaction = useCallback(async (id: string) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    
    try {
      await axios.delete(`/api/transactions/${id}`);
      // Update local state
      setTransactions(prev => prev.filter(t => t._id !== id));
      // Refetch to update pagination and potentially stats
      fetchTransactions();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete transaction');
      console.error('Error deleting transaction:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, fetchTransactions]);

  // Bulk create transactions
  const bulkCreateTransactions = useCallback(async (
    transactions: Array<Omit<Transaction, '_id' | 'createdAt' | 'updatedAt'>>
  ) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/transactions/bulk', {
        transactions: transactions.map(t => ({
          ...t,
          userId: user.uid,
        })),
      });
      // Refetch to update state with new transactions
      fetchTransactions();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create transactions');
      console.error('Error creating transactions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, fetchTransactions]);

  // Bulk delete transactions
  const bulkDeleteTransactions = useCallback(async (ids: string[]) => {
    if (!user?.uid) return;

    if (!ids.length) return { success: true, deletedCount: 0 };
    
    setLoading(true);
    setError(null);
    
    try {
      const idsString = ids.join(',');
      const response = await axios.delete('/api/transactions/bulk', {
        data: {
          ids,
          userId: user.uid,
        },
      });
      // Update local state
      setTransactions(prev => prev.filter(t => !ids.includes(t._id)));
      // Refetch to update pagination and potentially stats
      fetchTransactions();
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete transactions');
      console.error('Error deleting transactions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, fetchTransactions]);

  // Categorize transactions
  const categorizeTransactions = useCallback(async (
    transactionIds: string[],
    category: string
  ) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.patch('/api/transactions', {
        ids: transactionIds,
        userId: user.uid,
        updates: { category }
      });
      
      // Update local state
      setTransactions(prev => 
        prev.map((t) => 
          transactionIds.includes(t._id) ? { ...t, category } : t
        )
      );
      
      // Refetch to update stats if needed
      if (filters.includeStats) {
        fetchTransactions();
      }
      
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to categorize transactions');
      console.error('Error categorizing transactions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, fetchTransactions, filters.includeStats]);

  // Auto-categorize transactions
  const autoCategorizeTransactions = useCallback(async (
    transactionIds: string[]
  ) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/transactions/auto-categorize', {
        transactionIds
      });
      
      // Refetch to get updated categories
      fetchTransactions();
      
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to auto-categorize transactions');
      console.error('Error auto-categorizing transactions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid, fetchTransactions]);

  // Fetch categories with colors
  const fetchCategories = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const response = await axios.get('/api/transactions/categories');
      return response.data.categories;
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      throw err;
    }
  }, [user?.uid]);

  // Calculate stats from transactions
  const calculateStats = useCallback((): TransactionStats => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const average = transactions.length ? total / transactions.length : 0;
    
    return {
      total,
      average,
      categoryStats: categoryStats.length > 0 ? categoryStats : undefined
    };
  }, [transactions, categoryStats]);

  // Effect to fetch transactions when filters change
  useEffect(() => {
    if (user?.uid) {
      fetchTransactions();
    }
  }, [user?.uid, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    filters,
    pagination,
    stats: calculateStats(),
    updateFilters,
    goToPage,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    bulkCreateTransactions,
    bulkDeleteTransactions,
    categorizeTransactions,
    autoCategorizeTransactions,
    fetchCategories,
    fetchTransactions,
  };
} 