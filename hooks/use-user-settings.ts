import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export interface UserSettings {
  userId: string;
  baseCurrency: string;
  displayName: string;
  avatar: string;
  location: string;
  locationCode: string;
  residencyLocation: string;
  residencyLocationCode: string;
  residencyStartDate?: Date;
  notificationSettings: {
    email: boolean;
    budget: boolean;
    tax: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

interface UseUserSettingsReturn {
  settings: UserSettings | null;
  loading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>;
  refreshSettings: () => Promise<void>;
}

export default function useUserSettings(): UseUserSettingsReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`/api/users/${user.uid}/settings`);
      setSettings(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching user settings:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>): Promise<UserSettings> => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await axios.patch(`/api/users/${user.uid}/settings`, updates);
      setSettings(response.data);
      return response.data;
    } catch (err: any) {
      console.error('Error updating user settings:', err);
      setError(err);
      throw err;
    }
  };

  const refreshSettings = async (): Promise<void> => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, [user?.uid]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings,
  };
} 