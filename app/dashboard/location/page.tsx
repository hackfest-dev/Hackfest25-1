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
  RefreshCw,
  Download,
  FileDown,
  BarChart,
  FileText
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

interface LocationEntry {
  _id?: string;
  userId: string;
  country: string;
  countryCode: string;
  city: string;
  entryDate: string;  // Store dates as ISO strings in the database
  exitDate: string | null;
  isCurrentLocation: boolean;
  daysSpent: number;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to format dates consistently
const formatDateToString = (date: Date | string | null): string => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString();
};

const parseDate = (date: string | null): Date | null => {
  if (!date) return null;
  return new Date(date);
};

const formatDisplayDate = (date: string | null): string => {
  const parsedDate = parseDate(date);
  return parsedDate ? parsedDate.toLocaleDateString() : 'Present';
};

// Helper function to export data to CSV
const exportToCSV = (data: any[], filename: string) => {
  const csvContent = "data:text/csv;charset=utf-8," + 
    data.map(row => Object.values(row).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper function to generate PDF report
const generatePDFReport = async (data: any) => {
  try {
    const response = await axios.post("/api/reports/location", data, {
      responseType: "blob"
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `location-report-${new Date().toISOString().split("T")[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Error generating PDF report:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to generate PDF report. Please try again."
    });
  }
};

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
    if (!selectedLocation || !user?.uid) return;

    try {
      setIsUpdating(true);

      const locationData: Partial<LocationEntry> = {
        country: selectedLocation.country,
        countryCode: selectedLocation.countryCode,
        city: selectedLocation.city,
        entryDate: formatDateToString(selectedLocation.entryDate),
        exitDate: selectedLocation.exitDate ? formatDateToString(selectedLocation.exitDate) : null,
        isCurrentLocation: selectedLocation.isCurrentLocation,
      };

      if (selectedLocation._id) {
        await updateLocationEntry(selectedLocation._id, locationData);
      } else {
        await addLocationEntry({
          ...locationData,
          userId: user.uid,
          daysSpent: 0
        } as LocationEntry);
      }

      toast.success('Location updated successfully');
      setShowLocationModal(false);
      await fetchLocationData();
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location');
    } finally {
      setIsUpdating(false);
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

  // Prepare data for export
  const prepareExportData = () => {
    return locationHistory?.map(location => ({
      city: location.city,
      country: location.country,
      countryCode: location.countryCode,
      entryDate: formatDate(location.entryDate),
      exitDate: formatDate(location.exitDate),
      daysSpent: location.daysSpent,
      status: location.isCurrentLocation ? "Current" : "Past"
    })) || [];
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 container max-w-7xl mx-auto py-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Location Tracker</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select 
                className="bg-background border rounded-md px-2 py-1.5 text-sm min-w-[100px]"
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
              >
                {getYearOptions().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManualDetection}
                disabled={locationLoading || autoDetectingLocation}
                className="flex items-center gap-1.5"
              >
                {locationLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Detect Location</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(prepareExportData(), `location-history-${year}`)}
                  className="flex items-center gap-1.5"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generatePDFReport({
                    year,
                    locationHistory,
                    locationSummary
                  })}
                  className="flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Generate Report</span>
                </Button>
              </div>
              
              {currentGPSLocation && (
                <Badge variant="outline" className="hidden sm:flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{currentGPSLocation.city}, {currentGPSLocation.country}</span>
                </Badge>
              )}
            </div>
          </div>

          {showLocationPrompt && currentGPSLocation && (
            <Alert className="border-primary/20 bg-primary/5">
              <MapPin className="h-4 w-4 text-primary" />
              <AlertTitle>New location detected</AlertTitle>
              <AlertDescription>
                <div className="mt-2 mb-2">
                  We detected you are now in <strong>{currentGPSLocation.city}, {currentGPSLocation.country}</strong>.
                  Would you like to update your current location?
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleConfirmLocationUpdate} disabled={autoDetectingLocation}>
                    {autoDetectingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Update Location
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDismissLocationPrompt}>
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {loading || autoDetectingLocation ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 text-primary animate-spin mr-2" />
              <span>Loading location data...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load location data. Please try again.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="h-4 w-4" />
                      Year Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-lg">
                        <span className="text-xl font-semibold">{locationSummary?.countriesVisited || 0}</span>
                        <span className="text-xs text-muted-foreground text-center">Countries</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-lg">
                        <span className="text-xl font-semibold">{locationSummary?.totalDays || 0}</span>
                        <span className="text-xs text-muted-foreground text-center">Days</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-lg">
                        <span className="text-xl font-semibold">{locationSummary?.primaryResidencePercentage || 0}%</span>
                        <span className="text-xs text-muted-foreground text-center">Primary</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Primary Residence</span>
                        <span className="font-medium">{locationSummary?.primaryResidence || "Unknown"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Days in Primary</span>
                        <span className="font-medium">{locationSummary?.primaryResidenceDays || 0} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart className="h-4 w-4" />
                      Residence Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs defaultValue="calendar" className="w-full">
                      <TabsList className="w-full">
                        <TabsTrigger value="calendar" className="flex-1">Calendar Year</TabsTrigger>
                        <TabsTrigger value="fiscal" className="flex-1">Fiscal Year</TabsTrigger>
                      </TabsList>
                      
                      <div className="space-y-3 mt-4">
                        {locationSummary?.daysPerCountry && Object.keys(locationSummary.daysPerCountry).length > 0 ? (
                          Object.entries(locationSummary.daysPerCountry).map(([country, days]) => {
                            const percentage = Math.round((days / (locationSummary.totalDays || 1)) * 100);
                            
                            return (
                              <div key={country} className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span>{country}</span>
                                    {country === locationSummary.primaryResidence && (
                                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                                    )}
                                  </div>
                                  <span className="text-muted-foreground">
                                    {days} days ({percentage}%)
                                  </span>
                                </div>
                                <Progress 
                                  value={percentage} 
                                  className={country === locationSummary.primaryResidence ? "bg-primary/20" : "bg-muted"} 
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            No residence data available for {year}
                          </div>
                        )}
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Plane className="h-4 w-4" />
                      Location History
                    </CardTitle>
                    <LocationEntryForm 
                      triggerButton={
                        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Add Entry</span>
                        </Button>
                      }
                      onSuccess={fetchLocationData}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {locationHistory && locationHistory.length > 0 ? (
                    <div className="border-t">
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
                              <TableCell className="text-right font-medium">{location.daysSpent}</TableCell>
                              <TableCell>
                                {location.isCurrentLocation ? (
                                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Current</Badge>
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
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No location data available for {year}. Add your first location entry.
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {locationSummary && (
                <Alert className="bg-primary/5 border-primary/10">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle>Location Summary</AlertTitle>
                  <AlertDescription className="mt-1">
                    Your primary residence is {locationSummary.primaryResidence} with {locationSummary.primaryResidenceDays} days spent this year.
                    {locationSummary.primaryResidencePercentage < 50 && (
                      <span className="block mt-1 text-sm text-muted-foreground">
                        Note: You've spent less than 50% of your time in your primary residence.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/transactions" className="flex items-center gap-1.5">
                  View All
                  <span className="sr-only">transactions</span>
                </Link>
              </Button>
            </div>
            <LocationTransactionList limit={5} />
          </div>
        </div>
      </div>
    </div>
  );
} 