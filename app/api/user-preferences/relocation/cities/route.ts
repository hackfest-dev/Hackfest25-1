import { NextResponse } from "next/server";

// Mock data for city suggestions
const CITIES = [
  {
    id: "nyc",
    name: "New York City",
    country: "United States",
    costOfLivingIndex: 100,
    averageRent: 3500,
    averageSalary: 85000,
    climate: "Four seasons",
    jobMarketStrength: 8.5,
    techIndustryPresence: 9,
    publicTransportQuality: 8,
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  {
    id: "sf",
    name: "San Francisco",
    country: "United States",
    costOfLivingIndex: 110,
    averageRent: 3800,
    averageSalary: 120000,
    climate: "Mild, foggy",
    jobMarketStrength: 9.5,
    techIndustryPresence: 10,
    publicTransportQuality: 7,
    coordinates: { lat: 37.7749, lng: -122.4194 }
  },
  {
    id: "aus",
    name: "Austin",
    country: "United States",
    costOfLivingIndex: 70,
    averageRent: 1800,
    averageSalary: 90000,
    climate: "Hot summers, mild winters",
    jobMarketStrength: 8.7,
    techIndustryPresence: 8.5,
    publicTransportQuality: 5,
    coordinates: { lat: 30.2672, lng: -97.7431 }
  },
  {
    id: "lon",
    name: "London",
    country: "United Kingdom",
    costOfLivingIndex: 95,
    averageRent: 2800,
    averageSalary: 70000,
    climate: "Mild, rainy",
    jobMarketStrength: 8.3,
    techIndustryPresence: 8,
    publicTransportQuality: 9,
    coordinates: { lat: 51.5074, lng: -0.1278 }
  },
  {
    id: "ber",
    name: "Berlin",
    country: "Germany",
    costOfLivingIndex: 65,
    averageRent: 1200,
    averageSalary: 60000,
    climate: "Four seasons, cold winters",
    jobMarketStrength: 7.5,
    techIndustryPresence: 7.8,
    publicTransportQuality: 9.5,
    coordinates: { lat: 52.5200, lng: 13.4050 }
  },
  {
    id: "tor",
    name: "Toronto",
    country: "Canada",
    costOfLivingIndex: 80,
    averageRent: 2200,
    averageSalary: 75000,
    climate: "Four seasons, cold winters",
    jobMarketStrength: 8.2,
    techIndustryPresence: 7.5,
    publicTransportQuality: 8.5,
    coordinates: { lat: 43.6532, lng: -79.3832 }
  },
  {
    id: "syd",
    name: "Sydney",
    country: "Australia",
    costOfLivingIndex: 85,
    averageRent: 2400,
    averageSalary: 80000,
    climate: "Warm, coastal",
    jobMarketStrength: 7.8,
    techIndustryPresence: 7,
    publicTransportQuality: 7.5,
    coordinates: { lat: -33.8688, lng: 151.2093 }
  },
  {
    id: "sin",
    name: "Singapore",
    country: "Singapore",
    costOfLivingIndex: 90,
    averageRent: 2600,
    averageSalary: 85000,
    climate: "Tropical, humid",
    jobMarketStrength: 8.0,
    techIndustryPresence: 8.2,
    publicTransportQuality: 9.8,
    coordinates: { lat: 1.3521, lng: 103.8198 }
  },
  {
    id: "tok",
    name: "Tokyo",
    country: "Japan",
    costOfLivingIndex: 88,
    averageRent: 1800,
    averageSalary: 70000,
    climate: "Four seasons",
    jobMarketStrength: 7.5,
    techIndustryPresence: 8,
    publicTransportQuality: 10,
    coordinates: { lat: 35.6762, lng: 139.6503 }
  },
  {
    id: "bar",
    name: "Barcelona",
    country: "Spain",
    costOfLivingIndex: 60,
    averageRent: 1100,
    averageSalary: 50000,
    climate: "Mediterranean, warm",
    jobMarketStrength: 6.5,
    techIndustryPresence: 6.8,
    publicTransportQuality: 8.5,
    coordinates: { lat: 41.3851, lng: 2.1734 }
  }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    const maxCost = searchParams.get('maxCost') ? Number(searchParams.get('maxCost')) : null;
    const jobSector = searchParams.get('jobSector') || null;
    const climate = searchParams.get('climate') || null;
    
    // Filter cities based on query parameters
    let filteredCities = [...CITIES];
    
    if (query) {
      filteredCities = filteredCities.filter(city => 
        city.name.toLowerCase().includes(query) || 
        city.country.toLowerCase().includes(query)
      );
    }
    
    if (maxCost) {
      filteredCities = filteredCities.filter(city => 
        city.costOfLivingIndex <= maxCost
      );
    }
    
    if (climate) {
      filteredCities = filteredCities.filter(city => 
        city.climate.toLowerCase().includes(climate.toLowerCase())
      );
    }
    
    // Additional filtering based on job sector could be added here
    // This would require extending the city data model
    
    return NextResponse.json({
      cities: filteredCities,
      total: filteredCities.length
    });
    
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Error fetching cities" },
      { status: 500 }
    );
  }
} 