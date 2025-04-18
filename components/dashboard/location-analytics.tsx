"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, AlertCircle, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

import useTransactions from "@/hooks/use-transactions";
import { useAuth } from "@/context/AuthContext";
import { useGPSLocation } from "@/hooks/use-gps-location";
import useUserSettings from "@/hooks/use-user-settings";
import { formatCurrency } from "@/lib/currency";

// World map GeoJSON
const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

interface LocationSpending {
  city: string;
  country: string;
  coordinates: [number, number];
  total: number;
  count: number;
  averagePerTransaction: number;
  isCurrentLocation: boolean;
}

export function LocationAnalytics() {
  const { user } = useAuth();
  const { location: gpsLocation } = useGPSLocation();
  const { settings } = useUserSettings();
  const [period, setPeriod] = useState(90); // Last 90 days by default
  const [viewType, setViewType] = useState<"all" | "current">("all");
  const [locationStats, setLocationStats] = useState<LocationSpending[]>([]);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [0, 20],
    zoom: 1,
  });
  const [tooltipContent, setTooltipContent] = useState("");
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - period);
  
  const baseCurrency = settings?.baseCurrency || "USD";
  
  // Fetch transactions for the date range
  const { transactions, loading, error, updateFilters, fetchTransactions } = useTransactions({
    userId: user?.uid,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    categoryType: 'expense',
    includeStats: true,
    limit: 1000, // Get enough transactions to aggregate
  });
  
  // Update filters when period changes
  useEffect(() => {
    if (!user?.uid) return;
    
    const newEndDate = new Date();
    const newStartDate = new Date();
    newStartDate.setDate(newEndDate.getDate() - period);
    
    updateFilters({
      startDate: newStartDate.toISOString(),
      endDate: newEndDate.toISOString(),
      categoryType: 'expense'
    });
  }, [period, user?.uid, updateFilters]);
  
  // Process transactions to extract location data
  useEffect(() => {
    if (!transactions || !settings?.baseCurrency) return;
    
    // Create a map to group transactions by location
    const locationMap = new Map<string, LocationSpending>();
    
    // Process each transaction with location data
    transactions.forEach(transaction => {
      if (!transaction.location?.city || !transaction.location?.country) return;
      if (!transaction.location?.latitude || !transaction.location?.longitude) return;
      
      // Skip positive amounts (income)
      if (transaction.amount > 0) return;
      
      const locationKey = `${transaction.location.city}, ${transaction.location.country}`;
      const amount = Math.abs(transaction.convertedAmount || transaction.amount);
      
      const existing = locationMap.get(locationKey) || {
        city: transaction.location.city,
        country: transaction.location.country,
        coordinates: [transaction.location.longitude, transaction.location.latitude],
        total: 0,
        count: 0,
        averagePerTransaction: 0,
        isCurrentLocation: gpsLocation && 
          transaction.location.city === gpsLocation.city && 
          transaction.location.country === gpsLocation.country
      };
      
      existing.total += amount;
      existing.count += 1;
      existing.averagePerTransaction = existing.total / existing.count;
      
      locationMap.set(locationKey, existing);
    });
    
    // Convert map to array and sort by total amount
    const stats = Array.from(locationMap.values())
      .sort((a, b) => b.total - a.total);
    
    setLocationStats(stats);
  }, [transactions, settings?.baseCurrency, gpsLocation]);

  // Define period options
  const periodOptions = [
    { label: "30d", value: 30 },
    { label: "90d", value: 90 },
    { label: "180d", value: 180 },
    { label: "1y", value: 365 },
  ];
  
  // Handle map zoom
  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  };
  
  // Get color based on spending amount
  const getMarkerColor = (amount: number): string => {
    // Find min and max spending to create a range
    const amounts = locationStats.map(loc => loc.total);
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    
    // Normalize between 0 and 1
    const normalized = (amount - minAmount) / (maxAmount - minAmount) || 0;
    
    // Red (high spending) to green (low spending) gradient
    const r = Math.floor(200 + 55 * normalized);
    const g = Math.floor(55 + 200 * (1 - normalized));
    const b = 50;
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Get marker size based on spending amount
  const getMarkerSize = (amount: number): number => {
    const amounts = locationStats.map(loc => loc.total);
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    
    // Normalize between 0 and 1
    const normalized = (amount - minAmount) / (maxAmount - minAmount) || 0;
    
    // Scale between 4 and 12
    return 4 + (normalized * 8);
  };
  
  // Filter locations based on viewType
  const filteredLocations = viewType === "current" 
    ? locationStats.filter(loc => loc.isCurrentLocation)
    : locationStats;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle>Location Analytics</CardTitle>
              <CardDescription>Where you spend your money around the world</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 justify-start sm:justify-end">
            {periodOptions.map((option) => (
              <Button 
                key={option.value}
                variant={period === option.value ? "default" : "outline"} 
                size="sm"
                className="text-xs h-7"
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
            {gpsLocation && (
              <Button
                variant={viewType === "current" ? "default" : "outline"}
                size="sm"
                className="gap-1 h-7"
                onClick={() => setViewType(viewType === "all" ? "current" : "all")}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Current Location</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="pt-4">
            {loading ? (
              <div className="h-[400px] w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
                <span>Loading location data...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load location data</AlertDescription>
              </Alert>
            ) : filteredLocations.length === 0 ? (
              <div className="h-[400px] w-full flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No location data available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add transactions with location information to see your spending patterns
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative h-[400px] w-full rounded-lg border overflow-hidden">
                <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm p-2 rounded-md">
                  <div className="text-xs font-medium mb-1">Spending Legend</div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs">Lower Spending</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs">Higher Spending</span>
                  </div>
                </div>
                
                <ComposableMap className="w-full h-full">
                  <ZoomableGroup
                    zoom={position.zoom}
                    center={position.coordinates}
                    onMoveEnd={handleMoveEnd}
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill="#EAEAEC"
                            stroke="#D6D6DA"
                            style={{
                              default: { outline: "none" },
                              hover: { outline: "none", fill: "#F5F5F5" },
                              pressed: { outline: "none" }
                            }}
                          />
                        ))
                      }
                    </Geographies>
                    
                    {filteredLocations.map((location, index) => (
                      <Marker
                        key={index}
                        coordinates={location.coordinates}
                        onMouseEnter={() => {
                          setTooltipContent(`${location.city}, ${location.country}: ${formatCurrency(location.total, baseCurrency)}`);
                        }}
                        onMouseLeave={() => {
                          setTooltipContent("");
                        }}
                      >
                        <circle
                          r={getMarkerSize(location.total)}
                          fill={getMarkerColor(location.total)}
                          stroke="#FFF"
                          strokeWidth={1}
                          opacity={0.8}
                          style={{ cursor: "pointer" }}
                        />
                      </Marker>
                    ))}
                  </ZoomableGroup>
                </ComposableMap>
                
                {tooltipContent && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm p-2 rounded-md shadow-md text-xs">
                    {tooltipContent}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="list" className="pt-4">
            <div className="space-y-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-16 w-full animate-pulse bg-muted rounded-lg" />
                ))
              ) : error ? (
                <Alert variant="destructive" className="my-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>Failed to load location data</AlertDescription>
                </Alert>
              ) : filteredLocations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No location data available</p>
                  <p className="text-sm">Add transactions with location information to see your spending patterns</p>
                </div>
              ) : (
                filteredLocations.map((location, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`p-2 rounded-full`}
                        style={{ backgroundColor: getMarkerColor(location.total) }}
                      >
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {location.city}, {location.country}
                          {location.isCurrentLocation && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {location.count} transactions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(location.total, baseCurrency)}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {formatCurrency(location.averagePerTransaction, baseCurrency)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 