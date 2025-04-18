import axios from 'axios';

/**
 * Geolocation data interface
 */
export interface GeoLocation {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  country_code: string;
  currency: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Detects the user's location using the application's API endpoint
 * which handles fallbacks between multiple geolocation services
 */
export async function detectUserLocation(): Promise<GeoLocation> {
  try {
    const response = await axios.get<GeoLocation>('/api/geolocation');
    return response.data;
  } catch (error) {
    console.error('Error detecting location:', error);
    // Return a default fallback location
    return {
      ip: 'unknown',
      city: 'Unknown',
      region: 'Unknown',
      country_name: 'United States',
      country_code: 'US',
      currency: 'USD',
      latitude: undefined,
      longitude: undefined
    };
  }
}

/**
 * Formats a location string from geolocation data
 */
export function formatLocation(location: Partial<GeoLocation>): string {
  if (!location.city && !location.country_name) return '';
  
  if (location.city && location.country_name) {
    return `${location.city}, ${location.country_name}`;
  }
  
  return location.city || location.country_name || '';
}

/**
 * Creates a location object suitable for storing in the Transaction model
 */
export function createLocationObject(location: Partial<GeoLocation> | string): {
  country: string;
  city: string;
  coordinates?: { lat: number; lng: number };
} {
  // If string input (likely from a form field), try to parse city and country
  if (typeof location === 'string') {
    const parts = location.split(',').map(part => part.trim());
    return {
      city: parts[0] || 'Unknown',
      country: parts[1] || 'Unknown'
    };
  }
  
  // If GeoLocation object
  return {
    country: location.country_name || location.country_code || 'Unknown',
    city: location.city || 'Unknown',
    coordinates: location.latitude && location.longitude 
      ? { lat: location.latitude, lng: location.longitude }
      : undefined
  };
} 