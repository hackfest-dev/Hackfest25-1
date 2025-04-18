import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export interface LocationEntry {
  _id?: string;
  userId: string;
  country: string;
  countryCode: string;
  city: string;
  entryDate: Date | string;
  exitDate: Date | string | null;
  isCurrentLocation?: boolean;
  createdAt?: string;
  updatedAt?: string;
  daysSpent: number;
}

export interface LocationSummary {
  year: number;
  totalDays: number;
  countriesVisited: number;
  daysPerCountry: Record<string, number>;
  primaryResidence: string;
  primaryResidenceDays: number;
  primaryResidencePercentage: number;
}

interface UseLocationTrackingProps {
  year?: number;
}

export default function useLocationTracking({ year }: UseLocationTrackingProps = {}) {
  const { user } = useAuth();
  const [locationHistory, setLocationHistory] = useState<LocationEntry[]>([]);
  const [locationSummary, setLocationSummary] = useState<LocationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch location data
  const fetchLocationData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        userId: user.uid,
        ...(year && { year: year.toString() }),
      });

      const response = await axios.get(`/api/location-tracking?${queryParams}`);
      setLocationHistory(response.data.locationHistory);
      setLocationSummary(response.data.summary);
    } catch (err: any) {
      console.error('Error fetching location data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new location entry
  const addLocationEntry = async (locationData: Omit<LocationEntry, '_id' | 'createdAt' | 'updatedAt' | 'daysSpent'>) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      const response = await axios.post('/api/location-tracking', {
        ...locationData,
        userId: user.uid,
      });

      if (response.data.status === 'success') {
        // Refresh data after adding
        await fetchLocationData();
        return response.data.locationEntry;
      } else {
        throw new Error(response.data.error || 'Failed to add location entry');
      }
    } catch (error) {
      console.error('Error adding location entry:', error);
      throw error;
    }
  };

  // Update an existing location entry
  const updateLocationEntry = async (locationId: string, updates: Partial<LocationEntry>) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      const response = await axios.patch('/api/location-tracking', {
        userId: user.uid,
        locationId,
        updates,
      });

      if (response.data.status === 'success') {
        // Refresh data after updating
        await fetchLocationData();
        return response.data.updated;
      } else {
        throw new Error(response.data.error || 'Failed to update location entry');
      }
    } catch (error) {
      console.error('Error updating location entry:', error);
      throw error;
    }
  };

  // Delete a location entry
  const deleteLocationEntry = async (locationId: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      const queryParams = new URLSearchParams({
        userId: user.uid,
        locationId,
      });

      const response = await axios.delete(`/api/location-tracking?${queryParams}`);

      if (response.data.status === 'success') {
        // Refresh data after deleting
        await fetchLocationData();
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to delete location entry');
      }
    } catch (error) {
      console.error('Error deleting location entry:', error);
      throw error;
    }
  };

  // Check if two dates are in different years
  const isYearChanged = (oldYear: number | undefined, newYear: number | undefined) => {
    return oldYear !== newYear && (oldYear !== undefined || newYear !== undefined);
  };

  // Fetch location data on mount and when year changes
  useEffect(() => {
    if (user?.uid) {
      fetchLocationData();
    }
  }, [user?.uid, year]);

  // Get current location entry if any
  const getCurrentLocation = () => {
    return locationHistory.find(entry => entry.isCurrentLocation) || null;
  };

  return {
    locationHistory,
    locationSummary,
    loading,
    error,
    fetchLocationData,
    addLocationEntry,
    updateLocationEntry,
    deleteLocationEntry,
    getCurrentLocation,
  };
} 