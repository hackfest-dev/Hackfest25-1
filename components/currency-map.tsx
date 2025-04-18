"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencySelector } from "@/components/currency-selector";
import { MapPin, Globe, Loader2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { 
  CURRENCIES, 
  COUNTRY_TO_CURRENCY, 
  getCurrencySymbol,
  getExchangeRate,
  getCountryFromCode
} from "@/lib/currency";
import { useGPSLocation } from '@/hooks/use-gps-location';

// Simplified world map regions for visualization
const WORLD_REGIONS = [
  { code: "NA", name: "North America", countries: ["US", "CA", "MX"] },
  { code: "SA", name: "South America", countries: ["BR", "CO", "EC", "PE", "AR", "CL"] },
  { code: "EU", name: "Europe", countries: ["GB", "DE", "FR", "IT", "ES", "PT", "NL", "BE", "GR"] },
  { code: "AF", name: "Africa", countries: ["ZA", "EG", "MA", "NG", "KE"] },
  { code: "AS", name: "Asia", countries: ["JP", "CN", "IN", "TH", "VN", "SG", "MY", "ID", "PH", "AE"] },
  { code: "OC", name: "Oceania", countries: ["AU", "NZ", "FJ"] },
];

// Country shapes for the map (improved)
const COUNTRY_COORDINATES: { [key: string]: { x: number, y: number, width: number, height: number, name: string } } = {
  US: { x: 60, y: 80, width: 80, height: 40, name: "United States" },
  CA: { x: 70, y: 50, width: 80, height: 30, name: "Canada" },
  MX: { x: 70, y: 120, width: 40, height: 30, name: "Mexico" },
  
  BR: { x: 150, y: 180, width: 50, height: 50, name: "Brazil" },
  CO: { x: 120, y: 160, width: 30, height: 30, name: "Colombia" },
  AR: { x: 140, y: 220, width: 30, height: 30, name: "Argentina" },
  
  GB: { x: 220, y: 70, width: 20, height: 20, name: "United Kingdom" },
  DE: { x: 240, y: 80, width: 20, height: 20, name: "Germany" },
  FR: { x: 230, y: 90, width: 20, height: 20, name: "France" },
  IT: { x: 250, y: 100, width: 20, height: 20, name: "Italy" },
  ES: { x: 220, y: 110, width: 30, height: 20, name: "Spain" },
  
  RU: { x: 300, y: 60, width: 100, height: 50, name: "Russia" },
  
  CN: { x: 350, y: 110, width: 50, height: 40, name: "China" },
  JP: { x: 400, y: 100, width: 20, height: 30, name: "Japan" },
  IN: { x: 330, y: 140, width: 40, height: 40, name: "India" },
  TH: { x: 360, y: 150, width: 20, height: 20, name: "Thailand" },
  VN: { x: 370, y: 160, width: 15, height: 20, name: "Vietnam" },
  SG: { x: 365, y: 175, width: 10, height: 10, name: "Singapore" },
  ID: { x: 370, y: 190, width: 50, height: 20, name: "Indonesia" },
  
  AU: { x: 400, y: 230, width: 50, height: 40, name: "Australia" },
  NZ: { x: 450, y: 260, width: 20, height: 20, name: "New Zealand" },
  
  ZA: { x: 270, y: 220, width: 30, height: 30, name: "South Africa" },
  AE: { x: 310, y: 130, width: 15, height: 15, name: "UAE" },
};

interface ExchangeRateMapProps {
  baseCurrency?: string;
  onCurrencyChange?: (currency: string) => void;
  className?: string;
}

export function ExchangeRateMap({
  baseCurrency = "USD",
  onCurrencyChange,
  className = "",
}: ExchangeRateMapProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(baseCurrency);
  const [rates, setRates] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("map");
  const [isClient, setIsClient] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mapRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [favorites, setFavorites] = useState<string[]>([]);
  const { location } = useGPSLocation();
  const [userLocation, setUserLocation] = useState<string | null>(null);

  // Set client-side flag to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
    
    // Initialize with predefined favorites
    const defaultFavorites = ["USD", "EUR", "GBP", "JPY", "AUD"];
    setFavorites(defaultFavorites);
  }, []);

  // Detect user's location and highlight on the map
  useEffect(() => {
    if (location && location.country) {
      // Find corresponding country code for the map
      const countryCode = Object.keys(COUNTRY_COORDINATES).find(
        code => COUNTRY_COORDINATES[code].name.includes(location.country)
      );
      
      if (countryCode) {
        setUserLocation(countryCode);
      }
    }
  }, [location]);

  useEffect(() => {
    if (onCurrencyChange) {
      onCurrencyChange(selectedCurrency);
    }
  }, [selectedCurrency, onCurrencyChange]);

  // Fetch exchange rates for visualization
  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      const newRates: {[key: string]: number} = {};
      
      try {
        // Get rates for major currencies
        const uniqueCurrencies = [...new Set(Object.values(COUNTRY_TO_CURRENCY))];
        
        // Fetch rates in batches to avoid too many requests
        for (const currency of uniqueCurrencies) {
          try {
            if (currency === selectedCurrency) {
              newRates[currency] = 1;
            } else {
              const rate = await getExchangeRate(selectedCurrency, currency);
              newRates[currency] = rate;
            }
          } catch (error) {
            console.error(`Error fetching rate for ${currency}:`, error);
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        setRates(newRates);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRates();
  }, [selectedCurrency]);

  // Get color intensity based on exchange rate
  const getColorIntensity = (rate: number | undefined, countryCode: string): string => {
    if (!rate) return "fill-muted/30 stroke-slate-300/50";
    
    // Check if this is user's current location
    if (userLocation === countryCode) {
      return "fill-green-500/30 stroke-green-600 stroke-[1.5]";
    }
    
    // Check if this is the selected base currency's country
    const countryCurrency = COUNTRY_TO_CURRENCY[countryCode];
    if (countryCurrency === selectedCurrency) {
      return "fill-yellow-400/40 stroke-yellow-500 stroke-[1.5]";
    }
    
    // Determine color based on exchange rate
    if (rate > 100) return "fill-blue-900/70 stroke-blue-800";
    if (rate > 50) return "fill-blue-800/60 stroke-blue-700";
    if (rate > 20) return "fill-blue-700/50 stroke-blue-600";
    if (rate > 10) return "fill-blue-600/40 stroke-blue-500";
    if (rate > 5) return "fill-blue-500/40 stroke-blue-400";
    if (rate > 2) return "fill-blue-400/30 stroke-blue-300";
    if (rate > 1) return "fill-blue-300/30 stroke-blue-200";
    if (rate === 1) return "fill-purple-400/30 stroke-purple-400";
    if (rate > 0.5) return "fill-orange-300/30 stroke-orange-300";
    if (rate > 0.2) return "fill-orange-400/40 stroke-orange-400";
    if (rate > 0.1) return "fill-orange-500/40 stroke-orange-500";
    
    return "fill-orange-600/50 stroke-orange-600";
  };

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };

  const handleCountryHover = (countryCode: string | null) => {
    setHoveredCountry(countryCode);
  };

  const handleMapWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(scale + delta, 1), 2.5);
    setScale(newScale);
  };

  const handleMapMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({x: e.clientX, y: e.clientY});
    }
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (isDragging && mapRef.current) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setPosition({
        x: position.x + dx,
        y: position.y + dy
      });
      
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleMapMouseUp = () => {
    setIsDragging(false);
  };

  const resetMap = () => {
    setScale(1);
    setPosition({x: 0, y: 0});
  };

  const toggleFavorite = (currency: string) => {
    if (favorites.includes(currency)) {
      setFavorites(favorites.filter(c => c !== currency));
    } else {
      setFavorites([...favorites, currency]);
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Global Exchange Rates
            </CardTitle>
            <CardDescription>
              Visualize exchange rates across the world
            </CardDescription>
          </div>
          <div className="w-full sm:w-40">
            <CurrencySelector
              value={selectedCurrency}
              onChange={handleCurrencyChange}
              showIcon={true}
              placeholder="Select base currency"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">Interactive Map</TabsTrigger>
            <TabsTrigger value="rates">Currency Rates</TabsTrigger>
          </TabsList>
        
          <TabsContent value="map" className="relative">
            {isClient && location && (
              <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-lg py-1 px-3 border shadow-sm flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium text-foreground">
                  {location.city}, {location.country}
                </span>
              </div>
            )}
            
            <div className="relative p-1 mb-2 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={resetMap}
                title="Reset View"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {loading ? (
              <div className="h-[350px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-muted-foreground text-sm">Loading exchange rates...</p>
                </div>
              </div>
            ) : (
              <div 
                className="relative overflow-hidden h-[350px] border rounded-lg bg-slate-50/50"
                onWheel={handleMapWheel}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleMapMouseMove}
                onMouseUp={handleMapMouseUp}
                onMouseLeave={handleMapMouseUp}
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
              >
                {/* Simplified World Map */}
                <svg 
                  ref={mapRef}
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 500 300" 
                  className="bg-slate-50/50 transition-transform duration-100"
                  style={{ 
                    transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: "center",
                  }}
                >
                  {/* Background grid */}
                  <g className="opacity-20">
                    {Array(20).fill(0).map((_, i) => (
                      <line 
                        key={`h-${i}`} 
                        x1="0" 
                        y1={i * 15} 
                        x2="500" 
                        y2={i * 15} 
                        className="stroke-slate-300 stroke-[0.5]" 
                      />
                    ))}
                    {Array(33).fill(0).map((_, i) => (
                      <line 
                        key={`v-${i}`} 
                        x1={i * 15} 
                        y1="0" 
                        x2={i * 15} 
                        y2="300" 
                        className="stroke-slate-300 stroke-[0.5]" 
                      />
                    ))}
                  </g>
                  
                  {/* Countries */}
                  {WORLD_REGIONS.map(region => (
                    <g key={region.code}>
                      {region.countries.map(countryCode => {
                        const coords = COUNTRY_COORDINATES[countryCode];
                        if (!coords) return null;
                        
                        const currency = COUNTRY_TO_CURRENCY[countryCode];
                        const rate = rates[currency];
                        const colorClass = getColorIntensity(rate, countryCode);
                        const isHovered = hoveredCountry === countryCode;
                        const isUserLocation = userLocation === countryCode;
                        
                        return (
                          <g 
                            key={countryCode}
                            onMouseEnter={() => handleCountryHover(countryCode)}
                            onMouseLeave={() => handleCountryHover(null)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={coords.x}
                              y={coords.y}
                              width={coords.width}
                              height={coords.height}
                              className={`${colorClass} transition-all duration-200 ${isHovered ? 'stroke-[1.5] scale-105' : ''}`}
                              rx="3"
                              transform-origin={`${coords.x + coords.width/2} ${coords.y + coords.height/2}`}
                            />
                            <text
                              x={coords.x + coords.width/2}
                              y={coords.y + coords.height/2 + 1}
                              textAnchor="middle"
                              fontSize="8"
                              className={`fill-foreground font-medium ${isHovered ? 'font-bold' : ''}`}
                            >
                              {countryCode}
                            </text>
                            <text
                              x={coords.x + coords.width/2}
                              y={coords.y + coords.height/2 + 10}
                              textAnchor="middle"
                              fontSize="7"
                              className="fill-foreground"
                            >
                              {rate ? rate.toFixed(1) : "-"}
                            </text>
                            
                            {/* Highlight for hovered country */}
                            {isHovered && (
                              <rect
                                x={coords.x - 2}
                                y={coords.y - 2}
                                width={coords.width + 4}
                                height={coords.height + 4}
                                className="fill-none stroke-foreground stroke-[1] stroke-dashed"
                                rx="4"
                                strokeDasharray="3,2"
                              />
                            )}
                            
                            {/* Highlight for user location */}
                            {isUserLocation && !isHovered && (
                              <rect
                                x={coords.x - 1}
                                y={coords.y - 1}
                                width={coords.width + 2}
                                height={coords.height + 2}
                                className="fill-none stroke-green-500 stroke-[1] stroke-dashed"
                                rx="4"
                                strokeDasharray="2,2"
                              />
                            )}
                          </g>
                        );
                      })}
                    </g>
                  ))}
                </svg>
                
                {/* Country info popover */}
                {hoveredCountry && (
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm p-3 rounded-lg text-sm border shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-1">
                    <div className="font-medium mb-1">
                      {COUNTRY_COORDINATES[hoveredCountry]?.name || hoveredCountry}
                    </div>
                    <div className="text-xs flex flex-col gap-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Currency:</span>
                        <span className="font-medium">
                          {COUNTRY_TO_CURRENCY[hoveredCountry] || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="font-medium">
                          {rates[COUNTRY_TO_CURRENCY[hoveredCountry]] 
                            ? `1 ${selectedCurrency} = ${rates[COUNTRY_TO_CURRENCY[hoveredCountry]].toFixed(2)} ${COUNTRY_TO_CURRENCY[hoveredCountry]}`
                            : "Not available"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Legend */}
                <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg text-xs border shadow-sm">
                  <div className="font-medium mb-1 text-xs">Exchange Rates Legend</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm fill-orange-600/50 stroke-orange-600"></div>
                      <span>Low Rate (&lt;0.1)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm fill-blue-900/70 stroke-blue-800"></div>
                      <span>High Rate (&gt;100)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm fill-purple-400/30 stroke-purple-400"></div>
                      <span>Equal (1:1)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm fill-green-500/30 stroke-green-600 stroke-[1.5]"></div>
                      <span>Your Location</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {lastUpdated && (
              <div className="mt-2 text-xs text-muted-foreground flex justify-between items-center">
                <div>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
                <Badge variant="outline" className="font-normal text-xs">
                  {isClient && location ? `${location.city || ""}, ${location.country || ""}` : "Location detection pending"}
                </Badge>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="rates">
            {loading ? (
              <div className="space-y-2">
                {Array(8).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Favorites</h3>
                    {favorites.length > 0 ? (
                      <div className="space-y-2">
                        {favorites.map(currencyCode => {
                          const rate = rates[currencyCode];
                          const currencyInfo = CURRENCIES.find(c => c.code === currencyCode);
                          if (!currencyInfo) return null;
                          
                          return (
                            <div 
                              key={currencyCode} 
                              className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{currencyInfo.flag}</span>
                                <div>
                                  <div className="font-medium">{currencyCode}</div>
                                  <div className="text-xs text-muted-foreground">{currencyInfo.name}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-medium ${rate > 1 ? 'text-blue-600' : rate < 1 ? 'text-orange-600' : ''}`}>
                                  {rate ? rate.toFixed(4) : "N/A"}
                                </div>
                                <div className="text-xs flex items-center justify-end">
                                  {rate > 1 ? (
                                    <TrendingUp className="h-3 w-3 text-blue-500 mr-1" />
                                  ) : rate < 1 ? (
                                    <TrendingDown className="h-3 w-3 text-orange-500 mr-1" />
                                  ) : null}
                                  <span>1 {selectedCurrency}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-4 border rounded-lg bg-muted/10">
                        <p className="text-muted-foreground text-sm">No favorites added yet</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">All Currencies</h3>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                      {Object.entries(rates)
                        .filter(([currency]) => CURRENCIES.some(c => c.code === currency))
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([currency, rate]) => {
                          const currencyInfo = CURRENCIES.find(c => c.code === currency);
                          if (!currencyInfo) return null;
                          
                          const isFavorite = favorites.includes(currency);
                          
                          return (
                            <div 
                              key={currency} 
                              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                isFavorite ? 'bg-blue-50 border-blue-200' : 'bg-background hover:bg-muted/30'
                              }`}
                              onClick={() => toggleFavorite(currency)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{currencyInfo.flag}</span>
                                <div>
                                  <div className="font-medium">{currency}</div>
                                  <div className="text-xs text-muted-foreground">{currencyInfo.name}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-medium ${rate > 1 ? 'text-blue-600' : rate < 1 ? 'text-orange-600' : ''}`}>
                                  {rate.toFixed(4)}
                                </div>
                                <div className="text-xs flex items-center justify-end">
                                  1 {selectedCurrency} = {rate.toFixed(2)} {getCurrencySymbol(currency)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
                
                {lastUpdated && (
                  <div className="text-xs text-muted-foreground flex justify-between items-center">
                    <div>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        // Refetch rates
                        handleCurrencyChange(selectedCurrency);
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 