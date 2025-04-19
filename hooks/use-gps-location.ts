import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface LocationData {
  city: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;
  currency_symbol: string;
}

export function useGPSLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Fetch location data from API
  const fetchLocationData = useCallback(async (latitude: number, longitude: number) => {
    try {
      // Get timezone from the client
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Check if we have cached location data
      const cachedData = localStorage.getItem('gps_location_cache');
      const cachedTimestamp = localStorage.getItem('gps_location_timestamp');
      
      // Use cached data if it's less than 1 hour old and coordinates are close
      if (cachedData && cachedTimestamp) {
        const parsedCache = JSON.parse(cachedData);
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        const cacheAge = now - timestamp;
        
        // Check if cache is less than 1 hour old (3600000 ms = 1 hour)
        if (cacheAge < 3600000) {
          // Calculate distance between current position and cached position
          const distance = calculateDistance(
            latitude, longitude,
            parsedCache.latitude, parsedCache.longitude
          );
          
          // If we haven't moved more than 5km, use the cached data
          if (distance < 5) {
            setLocation(parsedCache);
            setError(null);
            setLoading(false);
            return;
          }
        }
      }

      // Send GPS coordinates to our API
      const response = await axios.post('/api/gps-location', {
        latitude,
        longitude
      });

      // Update location with timezone from client
      const locationData = {
        ...response.data,
        timezone
      };

      // Cache the location data
      localStorage.setItem('gps_location_cache', JSON.stringify(locationData));
      localStorage.setItem('gps_location_timestamp', Date.now().toString());

      setLocation(locationData);
      setError(null);
    } catch (err) {
      console.error('Error getting location details:', err);
      
      // Try to use cached data as fallback
      const cachedData = localStorage.getItem('gps_location_cache');
      if (cachedData) {
        setLocation(JSON.parse(cachedData));
      } else {
        setError('Failed to get location details');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };

  // Manual trigger for location detection
  const detectLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchLocationData(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === 1) { // PERMISSION_DENIED
          setPermissionDenied(true);
          setError('Location permission denied. Please enable location services.');
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          setError('Location information is unavailable.');
        } else if (error.code === 3) { // TIMEOUT
          setError('The request to get location timed out.');
        } else {
          setError('An unknown error occurred while getting location.');
        }
        setLoading(false);
        
        // Try to use cached data as fallback
        const cachedData = localStorage.getItem('gps_location_cache');
        if (cachedData) {
          setLocation(JSON.parse(cachedData));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Accept positions up to 1 minute old
      }
    );
  }, [fetchLocationData]);

  useEffect(() => {
    let watchId: number | null = null;

    const getLocation = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      fetchLocationData(latitude, longitude);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error);
      if (error.code === 1) { // PERMISSION_DENIED
        setPermissionDenied(true);
        setError('Location permission denied. Please enable location services.');
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        setError('Location information is unavailable.');
      } else if (error.code === 3) { // TIMEOUT
        setError('The request to get location timed out.');
      } else {
        setError('An unknown error occurred while getting location.');
      }
      setLoading(false);
      
      // Try to use cached data as fallback
      const cachedData = localStorage.getItem('gps_location_cache');
      if (cachedData) {
        setLocation(JSON.parse(cachedData));
      }
    };

    // Request GPS location
    if (navigator.geolocation) {
      // First, try to get a single accurate position
      navigator.geolocation.getCurrentPosition(
        getLocation,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
      
      // Then set up watching for position changes
      watchId = navigator.geolocation.watchPosition(
        getLocation,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Accept positions up to 1 minute old
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [fetchLocationData]);

  return { 
    location, 
    error, 
    loading, 
    permissionDenied,
    detectLocation // Expose manual trigger function
  };
} 