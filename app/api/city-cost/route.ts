import { NextResponse } from "next/server";
import axios from "axios";

// Cache for storing city data to avoid too many API calls
const cityDataCache = new Map();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const country = searchParams.get('country');
    
    if (!city || !country) {
      return NextResponse.json(
        { error: "City and country are required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `${city.toLowerCase()}-${country.toLowerCase()}`;
    if (cityDataCache.has(cacheKey)) {
      return NextResponse.json(cityDataCache.get(cacheKey));
    }

    // Fetch data from Numbeo API (you'll need to sign up for an API key)
    const apiKey = process.env.NUMBEO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Numbeo API key not configured" },
        { status: 500 }
      );
    }

    const response = await axios.get(`https://www.numbeo.com/api/city_cost?api_key=${apiKey}&city=${city}&country=${country}`);
    
    // Process and structure the data
    const costData = {
      city: city,
      country: country,
      categories: {
        housing: {
          monthlyRent: response.data.monthlyRent,
          utilities: response.data.utilities,
          internet: response.data.internet
        },
        food: {
          groceries: response.data.groceries,
          restaurants: response.data.restaurants
        },
        transportation: {
          publicTransport: response.data.publicTransport,
          taxi: response.data.taxi
        },
        lifestyle: {
          fitness: response.data.fitness,
          entertainment: response.data.entertainment
        },
        healthcare: {
          doctor: response.data.doctor,
          dentist: response.data.dentist
        }
      },
      qualityOfLife: {
        safety: response.data.safety,
        healthcare: response.data.healthcare,
        climate: response.data.climate,
        pollution: response.data.pollution
      },
      lastUpdated: new Date().toISOString()
    };

    // Cache the data for 24 hours
    cityDataCache.set(cacheKey, costData);
    setTimeout(() => cityDataCache.delete(cacheKey), 24 * 60 * 60 * 1000);

    return NextResponse.json(costData);
  } catch (error) {
    console.error("Error fetching city cost data:", error);
    return NextResponse.json(
      { error: "Failed to fetch city cost data" },
      { status: 500 }
    );
  }
} 