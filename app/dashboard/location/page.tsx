"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle, 
  MapPin, 
  Plane, 
  Calendar, 
  Home, 
  Globe, 
  Info,
  Loader2,
  RefreshCw
} from "lucide-react";
import { LocationTransactionList } from "@/components/dashboard/location-transaction-list";
import { LocationEntryForm } from "@/components/dashboard/location-entry-form";
import { useGPSLocation } from "@/hooks/use-gps-location";
import useLocationTracking from "@/hooks/use-location-tracking";
import useTransactions from "@/hooks/use-transactions";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

export default function LocationPage() {
  const { user } = useAuth();
  const { location: currentGPSLocation, loading: locationLoading, error: locationError, permissionDenied, detectLocation } = useGPSLocation();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [taxYearType, setTaxYearType] = useState<"calendar" | "fiscal">("calendar");
  const [autoDetectingLocation, setAutoDetectingLocation] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  
  // Use our location tracking hook
  const { 
    locationHistory, 
    locationSummary, 
    loading, 
    error, 
    fetchLocationData,
    addLocationEntry,
    updateLocationEntry,
    getCurrentLocation
  } = useLocationTracking({ year });

  // Format a date string
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Present";
    
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle year selection
  const handleYearChange = (newYear: number) => {
    setYear(newYear);
  };

  // Get available years for selection
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    // Generate an array of the last 5 years
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  };
  
  // Auto-detect location and create entry if needed
  useEffect(() => {
    const autoDetectLocation = async () => {
      // Only proceed if we have GPS location, user is logged in, and location history is loaded
      if (!currentGPSLocation || !user?.uid || loading || locationLoading || autoDetectingLocation) {
        return;
      }
      
      try {
        setAutoDetectingLocation(true);
        
        // Find matching country in our list
        const matchingCountry = COUNTRIES.find(
          c => c.name === currentGPSLocation.country || 
               c.code === currentGPSLocation.country_code
        );
        
        // Only proceed if we have a valid country match
        if (!matchingCountry) {
          console.log("Current location doesn't match any country in our database");
          return;
        }
        
        // Get the current active location (if any)
        const currentActiveLocation = getCurrentLocation();
        
        // If user is in the same country as their current active location, nothing to do
        if (currentActiveLocation && currentActiveLocation.country === matchingCountry.name) {
          console.log("User is already in the same country");
          return;
        }

        // If current location is different than active location, show the prompt
        if (currentActiveLocation && currentActiveLocation.country !== matchingCountry.name) {
          setShowLocationPrompt(true);
          return;
        }
        
        // If no active location exists, also show the prompt
        if (!currentActiveLocation) {
          setShowLocationPrompt(true);
          return;
        }
      } catch (error) {
        console.error("Error auto-detecting location:", error);
      } finally {
        setAutoDetectingLocation(false);
      }
    };
    
    autoDetectLocation();
  }, [currentGPSLocation, user?.uid, loading, locationHistory]);

  // Handle confirming location update
  const handleConfirmLocationUpdate = async () => {
    if (!currentGPSLocation || !user?.uid) return;
    
    try {
      setAutoDetectingLocation(true);
      
      // Find matching country in our list
      const matchingCountry = COUNTRIES.find(
        c => c.name === currentGPSLocation.country || 
           c.code === currentGPSLocation.country_code
      );
      
      // Only proceed if we have a valid country match
      if (!matchingCountry) {
        toast({
          variant: "destructive",
          title: "Country not found",
          description: "Current location doesn't match any country in our database"
        });
        return;
      }
      
      // Get the current active location (if any)
      const currentActiveLocation = getCurrentLocation();
      
      // Check if we need to close the previous location entry
      if (currentActiveLocation) {
        await updateLocationEntry(currentActiveLocation._id, {
          exitDate: new Date().toISOString(),
          isCurrentLocation: false
        });
        
        toast({
          title: `Left ${currentActiveLocation.country}`,
          description: `Your stay in ${currentActiveLocation.country} has been recorded.`,
        });
      }
      
      // Create a new location entry
      await addLocationEntry({
        country: matchingCountry.name,
        countryCode: matchingCountry.code,
        city: currentGPSLocation.city,
        entryDate: new Date().toISOString(),
        exitDate: null,
        isCurrentLocation: true,
        userId: user.uid
      });
      
      toast({
        title: `Welcome to ${matchingCountry.name}!`,
        description: "Your location has been automatically tracked.",
      });
      
      // Refresh the data
      await fetchLocationData();
      setShowLocationPrompt(false);
    } catch (error) {
      console.error("Error updating location:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update location. Please try again."
      });
    } finally {
      setAutoDetectingLocation(false);
    }
  };

  // Handle dismissing location prompt
  const handleDismissLocationPrompt = () => {
    setShowLocationPrompt(false);
  };

  // Manually trigger location detection
  const handleManualDetection = () => {
    if (permissionDenied) {
      toast({
        variant: "destructive",
        title: "Location permission denied",
        description: "Please enable location services in your browser settings."
      });
      return;
    }
    
    detectLocation();
    toast({
      title: "Detecting location",
      description: "Please wait while we detect your current location."
    });
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Location Tracker</h2>
        <div className="flex items-center gap-2">
          <select 
            className="bg-background border rounded-md px-2 py-1 text-sm"
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
          >
            {getYearOptions().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualDetection}
            disabled={locationLoading || autoDetectingLocation}
            className="flex items-center gap-1"
          >
            {locationLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            <span>Detect Location</span>
          </Button>
          
          {currentGPSLocation && (
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>Current: {currentGPSLocation.city}, {currentGPSLocation.country}</span>
            </Badge>
          )}
        </div>
      </div>

      {showLocationPrompt && currentGPSLocation && (
        <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <MapPin className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-700 dark:text-blue-300">New location detected</AlertTitle>
          <AlertDescription>
            <div className="mt-2 mb-2">
              We detected you are now in <strong>{currentGPSLocation.city}, {currentGPSLocation.country}</strong>.
              Would you like to update your current location?
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleConfirmLocationUpdate} disabled={autoDetectingLocation}>
                {autoDetectingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Yes, update my location
              </Button>
              <Button variant="outline" size="sm" onClick={handleDismissLocationPrompt}>
                No, thanks
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {loading || autoDetectingLocation ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
          <span>Loading location data...</span>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load location data. Please refresh the page.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Year Overview ({year})
                </CardTitle>
                <CardDescription>Summary of your global movement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <span className="text-2xl font-bold">{locationSummary?.countriesVisited || 0}</span>
                    <span className="text-xs text-muted-foreground text-center">Countries Visited</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <span className="text-2xl font-bold">{locationSummary?.totalDays || 0}</span>
                    <span className="text-xs text-muted-foreground text-center">Days Tracked</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <span className="text-2xl font-bold">{locationSummary?.primaryResidencePercentage || 0}%</span>
                    <span className="text-xs text-muted-foreground text-center">In Primary Residence</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Primary Residence:</span>
                    <span>{locationSummary?.primaryResidence || "Unknown"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Days in Primary:</span>
                    <span>{locationSummary?.primaryResidenceDays || 0} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Residence Distribution
                </CardTitle>
                <CardDescription>Distribution of days spent in each country</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="calendar">
                  <TabsList className="mb-4">
                    <TabsTrigger value="calendar" onClick={() => setTaxYearType("calendar")}>
                      Calendar Year
                    </TabsTrigger>
                    <TabsTrigger value="fiscal" onClick={() => setTaxYearType("fiscal")}>
                      Fiscal Year
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="space-y-4">
                    {locationSummary?.daysPerCountry && Object.keys(locationSummary.daysPerCountry).length > 0 ? (
                      Object.entries(locationSummary.daysPerCountry).map(([country, days]) => {
                        const percentage = Math.round((days / (locationSummary.totalDays || 1)) * 100);
                        
                        return (
                          <div key={country} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{country}</span>
                                {country === locationSummary.primaryResidence && (
                                  <Badge variant="secondary">Primary</Badge>
                                )}
                              </div>
                              <Badge variant="outline">
                                {days} days ({percentage}%)
                              </Badge>
                            </div>
                            <Progress 
                              value={percentage} 
                              className={
                                country === locationSummary.primaryResidence
                                ? "bg-blue-100" 
                                : "bg-muted"
                              } 
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No residence data available for {year}
                      </div>
                    )}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Location History Timeline
              </CardTitle>
              <CardDescription>Your travel history and stays in each location</CardDescription>
            </CardHeader>
            <CardContent>
              {locationHistory && locationHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Entry Date</TableHead>
                      <TableHead>Exit Date</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationHistory.map((location) => (
                      <TableRow key={location._id}>
                        <TableCell>
                          <div className="font-medium">{location.city}, {location.country}</div>
                          <div className="text-xs text-muted-foreground">{location.countryCode}</div>
                        </TableCell>
                        <TableCell>{formatDate(location.entryDate)}</TableCell>
                        <TableCell>{formatDate(location.exitDate)}</TableCell>
                        <TableCell className="text-right">{location.daysSpent}</TableCell>
                        <TableCell>
                          {location.isCurrentLocation ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Current</Badge>
                          ) : (
                            <Badge variant="outline">Past</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <LocationEntryForm 
                            initialData={location}
                            triggerButton={
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            }
                            onSuccess={fetchLocationData}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No location data available for {year}. Add your first location entry.
                </div>
              )}
            </CardContent>
            <CardFooter>
              <LocationEntryForm 
                triggerButton={
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Add Location Entry
                  </Button>
                }
                onSuccess={fetchLocationData}
              />
            </CardFooter>
          </Card>
          
          {locationSummary && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Location Summary</AlertTitle>
              <AlertDescription>
                You're currently spending the most time in {locationSummary.primaryResidence} ({locationSummary.primaryResidenceDays} days this year).
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Location-Based Transactions</h3>
        <LocationTransactionList limit={5} />
      </div>
    </div>
  );
} 