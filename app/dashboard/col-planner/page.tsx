"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Globe,
  MapPin,
  Wifi,
  Loader2,
  Sparkles,
  Lightbulb,
  Zap,
  ArrowLeftCircle,
  CreditCard,
  BarChart,
  Banknote,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonChart, MonthlyTotalChart, LocationHeatMap } from "@/components/dashboard/col-charts";
import { useAuth } from "@/context/AuthContext";
import useUserSettings from "@/hooks/use-user-settings";
import { formatCurrency } from "@/lib/currency";
import { toast } from "@/components/ui/use-toast";
import { QualityMetrics } from "@/components/dashboard/quality-metrics";

// Type definitions
interface RelocationPreference {
  userId: string;
  baseCurrency: string;
  budgetMin: number;
  budgetMax: number;
  mustHaveFeatures: string[];
  preferredRegions: string[];
  internetMinSpeed: number;
  lifestyle: string[];
  savedCities: SavedCity[];
  createdAt: Date;
  updatedAt: Date;
}

interface SavedCity {
  city: string;
  country: string;
  monthlyEstimate: number;
  savingsEstimate: number;
  notes: string;
}

interface AIRecommendation {
  id: string;
  city: string;
  country: string;
  reason: string;
  savingsEstimate: number;
  lifestyleMatch: number;
  details: string[];
  monthlyEstimate: number;
}

// Add these types before the generateComparisonData function
interface CityData {
  currency: string;
  categories: {
    housing: {
      monthlyRent: number;
      utilities: number;
    };
    food: {
      groceries: number;
      restaurants: number;
    };
    transportation: {
      publicTransport: number;
      taxi: number;
    };
    lifestyle: {
      fitness: number;
      entertainment: number;
    };
    healthcare: {
      doctor: number;
      dentist: number;
    };
  };
  qualityOfLife: {
    safety: number;
    healthcare: number;
    climate: number;
    pollution: number;
  };
}

// Helper function to call Gemini API
const callGeminiApi = async (prompt: string): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Missing Gemini API key. Add NEXT_PUBLIC_GEMINI_API_KEY to your environment variables.");
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
      const rawText = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      // First, try to find JSON within code blocks
      const codeBlockMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return codeBlockMatch[1];
      }
      
      // If no code block, try to find JSON directly
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      
      // If still no JSON found, throw error
      throw new Error("Could not find valid JSON in the response");
    } else {
      throw new Error("Unexpected response structure from Gemini API");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};

// Helper function for random color generation
const getRandomColor = (index: number): string => {
  const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#9966FF"];
  return colors[index % colors.length];
};

// Main component
export default function RelocationPlanner() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  
  // States
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [budget, setBudget] = useState<number>(2000);
  const [activeTab, setActiveTab] = useState<string>("recommendations");
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [mustHaveFeatures, setMustHaveFeatures] = useState<string[]>([]);
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [lifestylePreferences, setLifestylePreferences] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [savedCities, setSavedCities] = useState<SavedCity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [compareData, setCompareData] = useState<any[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<any[]>([]);
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<RelocationPreference | null>(null);
  
  // Helper function to get city coordinates
  const getCityCoordinates = (city: string, country: string): [number, number] => {
    // This is a simplified coordinates database - in a real app, you would use a geo API
    const cityCoordinates: Record<string, [number, number]> = {
      // Major world cities with [longitude, latitude] format for react-simple-maps
      "Bangkok": [100.5018, 13.7563],
      "Chiang Mai": [98.9853, 18.7883],
      "London": [-0.1276, 51.5074],
      "New York": [-74.0059, 40.7128],
      "San Francisco": [-122.4194, 37.7749],
      "Lisbon": [-9.1393, 38.7223],
      "Berlin": [13.4050, 52.5200],
      "Paris": [2.3522, 48.8566],
      "Tokyo": [139.6917, 35.6895],
      "Singapore": [103.8198, 1.3521],
      "Mexico City": [-99.1332, 19.4326],
      "Bali": [115.1889, -8.4095],
      "Buenos Aires": [-58.3816, -34.6037],
      "Rio de Janeiro": [-43.1729, -22.9068],
      "Kuala Lumpur": [101.6869, 3.1390],
      "Ho Chi Minh City": [106.6297, 10.8231],
      "Prague": [14.4378, 50.0755],
      "Barcelona": [2.1734, 41.3851],
      "Istanbul": [28.9784, 41.0082],
      "Dubai": [55.2708, 25.2048],
      "Cape Town": [18.4241, -33.9249],
      "Sydney": [151.2093, -33.8688],
      "Auckland": [174.7633, -36.8485],
      "Toronto": [-79.3832, 43.6532],
      "Vancouver": [-123.1207, 49.2827],
      "Amsterdam": [4.9041, 52.3676],
      "Vienna": [16.3738, 48.2082],
      "Austin": [-97.7431, 30.2672],
      "Boulder": [-105.2705, 40.0150],
      "Miami": [-80.1918, 25.7617],
      "Medellin": [-75.5636, 6.2476],
      "Seoul": [126.9780, 37.5665],
      "Tbilisi": [44.7908, 41.7151],
      "Taipei": [121.5654, 25.0330],
    };
    
    // Return city coordinates if known
    if (cityCoordinates[city]) {
      return cityCoordinates[city];
    }
    
    // Otherwise return approximate coordinates based on country
    const countryCoordinates: Record<string, [number, number]> = {
      "Thailand": [100.9925, 15.8700],
      "United States": [-95.7129, 37.0902],
      "United Kingdom": [-3.4360, 55.3781],
      "Portugal": [-8.2245, 39.3999],
      "Germany": [10.4515, 51.1657],
      "France": [2.2137, 46.2276],
      "Japan": [138.2529, 36.2048],
      "Singapore": [103.8198, 1.3521],
      "Mexico": [-102.5528, 23.6345],
      "Indonesia": [113.9213, -0.7893],
      "Argentina": [-63.6167, -38.4161],
      "Brazil": [-51.9253, -14.2350],
      "Malaysia": [101.9758, 4.2105],
      "Vietnam": [108.2772, 14.0583],
      "Czech Republic": [15.3730, 49.8175],
      "Spain": [-3.7492, 40.4637],
      "Turkey": [35.2433, 38.9637],
      "United Arab Emirates": [53.8478, 23.4241],
      "South Africa": [22.9375, -30.5595],
      "Australia": [133.7751, -25.2744],
      "New Zealand": [172.8860, -40.9006],
      "Canada": [-106.3468, 56.1304],
      "Netherlands": [5.2913, 52.1326],
      "Austria": [14.5501, 47.5162],
      "Colombia": [-74.2973, 4.5709],
      "South Korea": [127.9784, 35.9078],
      "Georgia": [43.3569, 42.3154],
      "Taiwan": [120.9605, 23.6978],
    };
    
    return countryCoordinates[country] || [0, 0]; // Default to [0,0] if not found
  };
  
  // Feature options
  const featureOptions = [
    { value: "beach", label: "Beach Access" },
    { value: "coworking", label: "Coworking Spaces" },
    { value: "internet", label: "Fast Internet" },
    { value: "healthcare", label: "Quality Healthcare" },
    { value: "safety", label: "High Safety" },
    { value: "nomad-community", label: "Nomad Community" },
    { value: "nightlife", label: "Nightlife" },
    { value: "food", label: "Food Scene" },
    { value: "transport", label: "Public Transportation" }
  ];
  
  // Region options
  const regionOptions = [
    { value: "southeast-asia", label: "Southeast Asia" },
    { value: "europe", label: "Europe" },
    { value: "latin-america", label: "Latin America" },
    { value: "north-america", label: "North America" },
    { value: "oceania", label: "Oceania" },
    { value: "africa", label: "Africa" },
    { value: "middle-east", label: "Middle East" }
  ];
  
  // Lifestyle options
  const lifestyleOptions = [
    { value: "outdoors", label: "Outdoors & Nature" },
    { value: "urban", label: "Urban Living" },
    { value: "family", label: "Family Friendly" },
    { value: "social", label: "Very Social" },
    { value: "quiet", label: "Peace & Quiet" },
    { value: "weather", label: "Good Weather" }
  ];
  
  // Initialize with user settings
  useEffect(() => {
    if (!user) {
      router.push('/login?callbackUrl=/col-planner');
      return;
    }
    
    if (settings?.baseCurrency) {
      setBaseCurrency(settings.baseCurrency);
    }
    
    loadUserPreferences();
    detectLocation();
  }, [user, settings]);
  
  // Detect user's location
  const detectLocation = async () => {
    try {
      const response = await fetch('/api/geolocation');
      const data = await response.json();
      
      if (data.city && data.country) {
        setCurrentLocation(`${data.city}, ${data.country}`);
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      setCurrentLocation("Unknown location");
    }
  };
  
  // Load user preferences from MongoDB
  const loadUserPreferences = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    
    try {
      const response = await axios.get(`/api/user-preferences/relocation?userId=${user.uid}`);
      const data = response.data;
      
      if (data) {
        setPreferences(data);
        setBudget(data.budgetMax);
        setMustHaveFeatures(data.mustHaveFeatures || []);
        setPreferredRegions(data.preferredRegions || []);
        setLifestylePreferences(data.lifestyle || []);
        setSavedCities(data.savedCities || []);
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save user preferences to MongoDB
  const saveUserPreferences = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    
    try {
      // Ensure we're using the user's base currency from settings
      const userBaseCurrency = settings?.baseCurrency || baseCurrency;
      
      const preferencesData: RelocationPreference = {
        userId: user.uid,
        baseCurrency: userBaseCurrency,
        budgetMin: budget * 0.8, // Set minimum budget at 80% of target
        budgetMax: budget,
        mustHaveFeatures: mustHaveFeatures,
        preferredRegions: preferredRegions,
        internetMinSpeed: 20, // Default minimum speed
        lifestyle: lifestylePreferences,
        savedCities: savedCities.map(city => ({
          ...city,
          monthlyEstimate: city.monthlyEstimate, // Keep in base currency
          savingsEstimate: city.savingsEstimate
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const response = await axios.post('/api/user-preferences/relocation', preferencesData);
      
      if (response.data.success) {
        // Update local state
        setPreferences(preferencesData);
        setBaseCurrency(userBaseCurrency); // Update local base currency
        
        // Show success message
        toast({
          title: "Success",
          description: "Your preferences have been saved successfully!",
          variant: "default"
        });
      } else {
        throw new Error(response.data.error || "Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle feature toggle
  const toggleFeature = (feature: string) => {
    if (mustHaveFeatures.includes(feature)) {
      setMustHaveFeatures(mustHaveFeatures.filter(f => f !== feature));
    } else {
      setMustHaveFeatures([...mustHaveFeatures, feature]);
    }
  };
  
  // Handle region toggle
  const toggleRegion = (region: string) => {
    if (preferredRegions.includes(region)) {
      setPreferredRegions(preferredRegions.filter(r => r !== region));
    } else {
      setPreferredRegions([...preferredRegions, region]);
    }
  };
  
  // Handle lifestyle toggle
  const toggleLifestyle = (lifestyle: string) => {
    if (lifestylePreferences.includes(lifestyle)) {
      setLifestylePreferences(lifestylePreferences.filter(l => l !== lifestyle));
    } else {
      setLifestylePreferences([...lifestylePreferences, lifestyle]);
    }
  };
  
  // Save city to user's saved list
  const saveCity = (recommendation: AIRecommendation) => {
    const newCity: SavedCity = {
      city: recommendation.city,
      country: recommendation.country,
      monthlyEstimate: recommendation.monthlyEstimate,
      savingsEstimate: recommendation.savingsEstimate,
      notes: ""
    };
    
    // Check if already saved
    if (!savedCities.some(city => city.city === recommendation.city)) {
      const updatedCities = [...savedCities, newCity];
      setSavedCities(updatedCities);
      
      // Update comparison data
      generateComparisonData();
    }
  };
  
  // Remove city from saved list
  const removeCity = (cityName: string) => {
    const updatedCities = savedCities.filter(city => city.city !== cityName);
    setSavedCities(updatedCities);
    
    // Update comparison data
    generateComparisonData();
  };
  
  // Generate AI recommendations
  const generateAIRecommendations = async () => {
    if (budget <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Please set a valid budget first",
        variant: "destructive"
      });
      return;
    }

    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Please wait for your current location to be detected or enter it manually",
        variant: "destructive"
      });
      return;
    }
    
    setLoadingAI(true);
    setAiRecommendations([]);
    
    try {
      // Build the context for the AI
      const context = {
        budget: formatCurrency(budget, baseCurrency),
        currentLocation,
        mustHaveFeatures: mustHaveFeatures.length > 0 ? mustHaveFeatures : [],
        preferredRegions: preferredRegions.length > 0 ? preferredRegions : [],
        lifestylePreferences: lifestylePreferences.length > 0 ? lifestylePreferences : [],
        additionalRequirements: aiPrompt || ""
      };

      const prompt = `As an expert relocation advisor for digital nomads, analyze the following preferences and provide detailed city recommendations:

PREFERENCES:
- Monthly Budget: ${context.budget}
- Current Location: ${context.currentLocation}
${context.mustHaveFeatures.length > 0 ? `- Must Have Features: ${context.mustHaveFeatures.join(', ')}` : ''}
${context.preferredRegions.length > 0 ? `- Preferred Regions: ${context.preferredRegions.join(', ')}` : ''}
${context.lifestylePreferences.length > 0 ? `- Lifestyle Preferences: ${context.lifestylePreferences.join(', ')}` : ''}
${context.additionalRequirements ? `- Additional Requirements: ${context.additionalRequirements}` : ''}

For each recommended city, calculate and provide:
1. Monthly cost estimate in ${baseCurrency} with detailed breakdown
2. Savings comparison:
   - Research typical costs in ${context.currentLocation} for baseline
   - Calculate percentage difference in total monthly costs
   - Express as "X% lower" or "X% higher" compared to ${context.currentLocation}
   - Example: if new city costs $1500 and ${context.currentLocation} costs $2000, savings would be "25% lower"
3. Lifestyle match percentage (0-100) based on how well it matches the preferences
4. Key reasons why this city matches the preferences
5. Important details about:
   - Housing quality and options
   - Food scene and costs
   - Transportation system
   - Healthcare standards
   - Internet infrastructure
   - Safety statistics
   - Overall quality of life

IMPORTANT: Respond with raw JSON only, no markdown formatting or code blocks. The response should be a single JSON object with this exact structure:
{
  "recommendations": [
    {
      "city": "string",
      "country": "string",
      "monthlyEstimate": number,
      "savingsEstimate": number (positive for savings, negative for higher cost),
      "lifestyleMatch": number (0-100),
      "reason": "string",
      "details": ["string"]
    }
  ]
}

Provide exactly 3 best matching cities based on the given criteria.`;

      // Call Gemini API
      const aiResponse = await callGeminiApi(prompt);
      
      try {
        const parsedResponse = JSON.parse(aiResponse);
        
        if (Array.isArray(parsedResponse.recommendations)) {
          // Add unique IDs and validate/fix savings estimates
          const recommendationsWithIds = parsedResponse.recommendations.map((rec: any) => {
            // Ensure savings estimate is a number and makes sense
            let savingsEstimate = Number(rec.savingsEstimate);
            if (isNaN(savingsEstimate) || savingsEstimate < -100 || savingsEstimate > 100) {
              // If invalid, calculate a rough estimate based on monthly costs
              const currentLocationCost = budget; // Use current budget as baseline
              const newLocationCost = rec.monthlyEstimate;
              savingsEstimate = Math.round(((currentLocationCost - newLocationCost) / currentLocationCost) * 100);
            }

            return {
              ...rec,
              id: Math.random().toString(36).substr(2, 9),
              savingsEstimate: savingsEstimate
            };
          });
          
          setAiRecommendations(recommendationsWithIds);
          
          // Generate comparison data for the recommended cities
          await generateComparisonData();
          
          toast({
            title: "Recommendations Ready",
            description: `Found ${recommendationsWithIds.length} cities matching your criteria.`,
            variant: "default"
          });
        } else {
          throw new Error("Invalid response format from AI");
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        toast({
          title: "Error",
          description: "Failed to process AI recommendations. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingAI(false);
    }
  };
  
  // Generate comparison data for cities
  const generateComparisonData = async () => {
    if (!savedCities.length && !aiRecommendations.length) return;

    setIsLoading(true);

    try {
      const allCities = [
        ...savedCities,
        ...aiRecommendations.map(rec => ({
          city: rec.city,
          country: rec.country,
          monthlyEstimate: rec.monthlyEstimate,
          savingsEstimate: rec.savingsEstimate,
          notes: ""
        }))
      ];

      // Remove duplicates
      const uniqueCities = Array.from(new Set(allCities.map(city => city.city)))
        .map(cityName => allCities.find(city => city.city === cityName)!);

      const prompt = `As a cost of living expert, provide detailed cost breakdowns for these cities: ${uniqueCities.map(city => `${city.city}, ${city.country}`).join('; ')}.

For each city, provide data in ${baseCurrency}:
1. Monthly costs:
- Housing (rent + utilities)
- Food (groceries + dining)
- Transportation
- Healthcare
- Entertainment
2. Quality metrics (0-100):
- Safety
- Healthcare
- Climate
- Pollution

IMPORTANT: Respond with ONLY valid JSON matching this structure:
{
  "cities": [
    {
      "city": "CityName",
      "country": "CountryName",
      "currency": "${baseCurrency}",
      "categories": {
        "housing": {"monthlyRent": 1000, "utilities": 100},
        "food": {"groceries": 400, "restaurants": 300},
        "transportation": {"publicTransport": 50, "taxi": 100},
        "lifestyle": {"fitness": 50, "entertainment": 200},
        "healthcare": {"doctor": 100, "dentist": 150}
      },
      "qualityOfLife": {
        "safety": 85,
        "healthcare": 80,
        "climate": 75,
        "pollution": 20
      }
    }
  ]
}`;

      // Call Gemini API
      const aiResponse = await callGeminiApi(prompt);
      
      try {
        // Clean and validate the response
        const cleanedResponse = aiResponse.trim()
          .replace(/```json\s*|\s*```/g, '') // Remove code blocks
          .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
          .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
        
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error("Initial parse failed:", parseError);
          // Try to extract JSON from the response
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Could not extract valid JSON from response");
          }
        }

        if (!parsedResponse?.cities || !Array.isArray(parsedResponse.cities)) {
          throw new Error("Invalid response structure: missing cities array");
        }

        // Validate and process the data
        const chartData = parsedResponse.cities.map((cityData: CityData, index: number) => {
          // Validate required properties
          if (!cityData.categories || !cityData.qualityOfLife) {
            throw new Error(`Missing required data for city ${cityData.city}`);
          }

          const color = getRandomColor(index);
          
          // Calculate total with validation
          const total = Object.values(cityData.categories).reduce((sum: number, category) => {
            const categoryValues = Object.values(category as Record<string, number>);
            if (!categoryValues.every(val => typeof val === 'number')) {
              throw new Error(`Invalid numeric values in categories for city ${cityData.city}`);
            }
            return sum + categoryValues.reduce((catSum, value) => catSum + value, 0);
          }, 0);

        return {
            name: uniqueCities[index].city,
            color,
            total,
            ...cityData.categories,
            qualityMetrics: cityData.qualityOfLife
        };
      });

        // Update state for different chart types
        setCompareData(chartData);
        setMonthlyTotals(chartData.map((city: ChartDataItem) => ({
          name: city.name,
          total: city.total,
          color: city.color
        })));
        setQualityData(chartData.map((city: ChartDataItem) => ({
          name: city.name,
          city: city.name,
          metrics: city.qualityMetrics,
          color: city.color
        })));

      } catch (parseError) {
        console.error("Error processing cost data:", parseError);
        toast({
          title: "Error",
          description: "Failed to process cost data. Please try generating recommendations again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating comparison data:", error);
      toast({
        title: "Error",
        description: "Failed to generate cost comparisons. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="outline"
            className="mb-2"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeftCircle className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Relocation Planner</h1>
          <p className="text-muted-foreground">
            Find your ideal city based on budget and lifestyle preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Base Currency: {baseCurrency}
          </span>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4">Loading your preferences...</p>
        </div>
      ) : (
        <>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="preferences">
                <CreditCard className="h-4 w-4 mr-2" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                <Lightbulb className="h-4 w-4 mr-2" />
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="compare">
                <BarChart className="h-4 w-4 mr-2" />
                Compare Cities
              </TabsTrigger>
            </TabsList>
            
            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Relocation Preferences</CardTitle>
                  <CardDescription>
                    Set your budget and preferences to get personalized city recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Monthly Budget</h3>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <input 
                              type="range" 
                              min="500" 
                              max="5000" 
                              step="100" 
                              value={budget || 2000} 
                              onChange={(e) => setBudget(parseInt(e.target.value))} 
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>{formatCurrency(500, baseCurrency)}</span>
                              <span>{formatCurrency(2500, baseCurrency)}</span>
                              <span>{formatCurrency(5000, baseCurrency)}</span>
                            </div>
                          </div>
                          <div className="w-48 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="relative w-full">
                                <Banknote className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min="0"
                                  value={budget || 2000}
                                  onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="pl-9"
                                  placeholder="Enter budget"
                                />
                              </div>
                              <span className="text-sm font-medium">{baseCurrency}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">monthly budget</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Must-Have Features</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Select the features that are essential for your next location
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {featureOptions.map(feature => (
                          <Badge 
                            key={feature.value}
                            variant={mustHaveFeatures.includes(feature.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleFeature(feature.value)}
                          >
                            {feature.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Preferred Regions</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Select the regions you'd like to live in
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {regionOptions.map(region => (
                          <Badge 
                            key={region.value}
                            variant={preferredRegions.includes(region.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleRegion(region.value)}
                          >
                            {region.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Lifestyle Preferences</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        What kind of lifestyle are you looking for?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {lifestyleOptions.map(lifestyle => (
                          <Badge 
                            key={lifestyle.value}
                            variant={lifestylePreferences.includes(lifestyle.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleLifestyle(lifestyle.value)}
                          >
                            {lifestyle.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                      <Button 
                        onClick={saveUserPreferences}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>Save Preferences</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        AI Relocation Advisor
                        <Badge className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>Gemini Powered</span>
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Get personalized city recommendations based on your preferences
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={generateAIRecommendations} 
                      disabled={loadingAI}
                      className="flex items-center gap-2"
                    >
                      {loadingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing data...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          <span>Generate Recommendations</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="mt-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Additional preferences (e.g., 'I want a beach city with good internet')" 
                        value={aiPrompt || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiPrompt(e.target.value)}
                        className="flex-1"
                        disabled={loadingAI}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {aiRecommendations.length === 0 ? (
                    <div className="p-8 text-center">
                      <Brain className="h-16 w-16 text-primary/30 mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-1">No recommendations generated yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Click the button above to get personalized destination recommendations
                        based on your preferences and budget.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {aiRecommendations.map((rec) => (
                        <Card key={rec.id} className="border-2 border-primary/10 shadow-sm">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{rec.city}</CardTitle>
                                <CardDescription>{rec.country}</CardDescription>
                              </div>
                              <div className="flex items-center gap-1 text-primary">
                                <Sparkles className="h-4 w-4" />
                                <span className="font-bold">{rec.lifestyleMatch}%</span>
                                <span className="text-sm text-muted-foreground">match</span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-medium">Potential Savings</h4>
                                  <Badge className="bg-green-100 text-green-800">
                                    {rec.savingsEstimate}% lower
                                  </Badge>
                                </div>
                                <Progress value={rec.savingsEstimate} className="h-2" />
                              </div>
                              
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Monthly Estimate:</span>
                                <Badge variant="outline" className="font-medium">
                                  {formatCurrency(rec.monthlyEstimate || 0, baseCurrency)}
                                </Badge>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium mb-2">Why this location matches you:</h4>
                                <div className="space-y-2">
                                  {rec.details.map((detail, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                      <p className="text-sm text-muted-foreground">{detail}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="pt-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => saveCity(rec)}
                                  disabled={savedCities.some(city => city.city === rec.city)}
                                >
                                  {savedCities.some(city => city.city === rec.city) ? 
                                    'Already Saved' : 'Save to Compare'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Compare Tab */}
            <TabsContent value="compare" className="space-y-6">
              {savedCities.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart className="h-16 w-16 text-primary/30 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No cities saved yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate recommendations and save cities to compare them.
                    </p>
                    <Button 
                      onClick={() => setActiveTab("recommendations")}
                      variant="outline"
                    >
                      Go to Recommendations
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Saved Cities</CardTitle>
                      <CardDescription>
                        Compare your saved cities side by side
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {savedCities.map(city => (
                          <Card key={city.city} className="overflow-hidden">
                            <CardHeader className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">{city.city}</CardTitle>
                                  <CardDescription>{city.country}</CardDescription>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0" 
                                  onClick={() => removeCity(city.city)}
                                >
                                  &times;
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="text-xl font-bold mb-1">
                                {formatCurrency(city.monthlyEstimate, baseCurrency)}
                              </div>
                              <div className="text-sm text-muted-foreground mb-3">
                                Monthly estimate
                              </div>
                              
                              <div className="flex items-center gap-1 text-sm">
                                <Badge className="bg-green-100 text-green-800">
                                  {city.savingsEstimate}% savings
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Global Cost Map */}
                  <Card className="col-span-12">
                    <CardHeader>
                      <CardTitle>Global Cost Map</CardTitle>
                      <CardDescription>
                        Visualize your saved cities on a world map
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <LocationHeatMap 
                          cities={savedCities.map(city => ({
                            name: city.city,
                            country: city.country,
                            coordinates: getCityCoordinates(city.city, city.country),
                            cost: city.monthlyEstimate,
                            currency: baseCurrency
                          }))}
                          baseCurrency={baseCurrency}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="col-span-2">
                      <CardHeader>
                        <CardTitle>Monthly Total ({baseCurrency})</CardTitle>
                        <CardDescription>
                          Estimated total monthly expenses in each location
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px] w-full">
                          <MonthlyTotalChart data={monthlyTotals} baseCurrency={baseCurrency} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {compareData.length > 0 && (
                    <Card className="col-span-2">
                      <CardHeader>
                        <CardTitle>Expense Breakdown Comparison</CardTitle>
                        <CardDescription>
                          See how expenses compare across categories
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px] w-full">
                          <ComparisonChart data={compareData} baseCurrency={baseCurrency} />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {qualityData.length > 0 && (
                    <Card className="col-span-2">
                      <CardHeader>
                        <CardTitle>Quality of Life Comparison</CardTitle>
                        <CardDescription>
                          Compare quality of life metrics across cities
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <QualityMetrics data={qualityData} />
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
