"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { getCountryNameByCode, getCountryFlagByCode } from "@/lib/countries";
import { MoreHorizontal, Calendar as CalendarIcon, AlertCircle, Check, Info, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGPSLocation } from "@/hooks/use-gps-location";
import { LocationEntryForm } from "@/components/dashboard/location-entry-form";
import useLocationTracking from "@/hooks/use-location-tracking";
import useTaxProfile from "@/hooks/use-tax-profile";
import useCountryTaxRules from "@/hooks/use-country-tax-rules";
import { useAuth } from "@/context/AuthContext";
import { TaxSuggestions } from "@/components/dashboard/tax-suggestions";

// Mock data for demonstration purposes
// In a real app, this would come from API calls
interface StayRecord {
  id: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  source: "manual" | "automatic";
}

interface TaxStatus {
  countryCode: string;
  daysPresent: number;
  threshold: number;
  status: "safe" | "warning" | "exceeded";
  notes?: string;
}

const mockStayRecords: StayRecord[] = [
  {
    id: "1",
    countryCode: "US",
    startDate: "2023-01-15",
    endDate: "2023-04-15",
    numberOfDays: 90,
    source: "manual"
  },
  {
    id: "2",
    countryCode: "GB",
    startDate: "2023-05-01",
    endDate: "2023-06-15",
    numberOfDays: 45,
    source: "automatic"
  },
  {
    id: "3",
    countryCode: "DE",
    startDate: "2023-07-01",
    endDate: "2023-07-31",
    numberOfDays: 30,
    source: "automatic"
  },
  {
    id: "4",
    countryCode: "FR",
    startDate: "2023-08-15",
    endDate: "2023-09-15",
    numberOfDays: 30,
    source: "manual"
  },
  {
    id: "5",
    countryCode: "PT",
    startDate: "2023-10-01",
    endDate: "2023-12-15",
    numberOfDays: 75,
    source: "automatic"
  }
];

const mockTaxStatus: TaxStatus[] = [
  {
    countryCode: "US",
    daysPresent: 90,
    threshold: 183,
    status: "safe",
    notes: "You're below the 183-day threshold for tax residency."
  },
  {
    countryCode: "GB",
    daysPresent: 45,
    threshold: 183,
    status: "safe",
    notes: "You're below the 183-day threshold for tax residency."
  },
  {
    countryCode: "DE",
    daysPresent: 30,
    threshold: 183,
    status: "safe",
    notes: "You're below the 183-day threshold for tax residency."
  },
  {
    countryCode: "FR",
    daysPresent: 30,
    threshold: 183,
    status: "safe",
    notes: "You're below the 183-day threshold for tax residency."
  },
  {
    countryCode: "PT",
    daysPresent: 150,
    threshold: 183,
    status: "warning",
    notes: "You're approaching the 183-day threshold. Consider tax planning."
  }
];

// Helper function to format dates since we're having issues with date-fns
const formatDateString = (dateStr: string, formatType: 'short' | 'long' = 'long'): string => {
  try {
    const date = new Date(dateStr);
    if (formatType === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    });
  } catch (e) {
    return dateStr || 'Invalid date';
  }
};

export default function TaxTrackerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [stayRecords, setStayRecords] = useState<StayRecord[]>([]);
  const [taxStatus, setTaxStatus] = useState<TaxStatus[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("overview");
  const { location: currentGPSLocation, loading: locationLoading, detectLocation } = useGPSLocation();
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StayRecord | null>(null);

  // Use our hooks to get real data
  const { 
    locationHistory, 
    locationSummary, 
    loading: locationHistoryLoading,
    error: locationError,
    fetchLocationData 
  } = useLocationTracking({ year: selectedYear });

  const {
    profile: taxProfile,
    taxRules,
    residencyStatus,
    loading: profileLoading,
    error: profileError
  } = useTaxProfile();

  const {
    rules: countryRules,
    loading: rulesLoading
  } = useCountryTaxRules();

  // Convert location history to stay records format
  useEffect(() => {
    if (locationHistory && locationHistory.length > 0) {
      const convertedRecords = locationHistory.map((location, index) => ({
        id: location._id || index.toString(),
        countryCode: location.countryCode,
        startDate: new Date(location.entryDate).toISOString().split('T')[0],
        endDate: location.exitDate ? new Date(location.exitDate).toISOString().split('T')[0] : "",
        numberOfDays: location.daysSpent || 0,
        source: "automatic" as const
      }));
      
      setStayRecords(convertedRecords);
    }
  }, [locationHistory]);

  // Convert residency status to tax status format
  useEffect(() => {
    if (residencyStatus && residencyStatus.length > 0) {
      const convertedStatus = residencyStatus.map(status => ({
        countryCode: status.countryCode,
        daysPresent: status.daysPresent,
        threshold: status.threshold,
        status: status.percentage >= 100 ? "exceeded" : 
                status.percentage >= 80 ? "warning" : "safe" as "safe" | "warning" | "exceeded",
        notes: `${status.status}. ${status.daysRemaining > 0 ? 
                `${status.daysRemaining} days remaining before tax residency.` : 
                'You have exceeded the tax residency threshold.'}`
      }));
      
      setTaxStatus(convertedStatus);
    } else if (locationSummary && locationSummary.daysPerCountry) {
      // Fallback to location summary if no residency status
      const convertedStatus = Object.entries(locationSummary.daysPerCountry).map(([country, days]) => {
        const threshold = 183; // Default threshold
        const percentage = Math.round((days / threshold) * 100);
        
        return {
          countryCode: country,
          daysPresent: days,
          threshold: threshold,
          status: percentage >= 100 ? "exceeded" : 
                  percentage >= 80 ? "warning" : "safe" as "safe" | "warning" | "exceeded",
          notes: `You've spent ${days} days in ${country} this year.`
        };
      });
      
      setTaxStatus(convertedStatus);
    }
  }, [residencyStatus, locationSummary]);

  // Fetch data when year changes
  useEffect(() => {
    // fetchLocationData will be called automatically when year changes
    // No need to do anything extra here
  }, [selectedYear]);

  // Function to handle adding a new stay record based on GPS location
  const handleAddCurrentLocation = () => {
    if (!currentGPSLocation) {
      detectLocation();
      return;
    }
    
    // Open the location form dialog instead of just adding a mock record
    setShowLocationForm(true);
  };

  // Function to handle successful location entry
  const handleLocationEntrySuccess = () => {
    // Refresh location data after adding a new entry
    fetchLocationData();
    setShowLocationForm(false);
    setSelectedRecord(null);
  };

  // Function to handle editing a stay record
  const handleEditStayRecord = (record: StayRecord) => {
    setSelectedRecord(record);
    setShowLocationForm(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe": return "bg-green-500";
      case "warning": return "bg-amber-500";
      case "exceeded": return "bg-red-500";
      default: return "bg-gray-300";
    }
  };

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  // Show loading state if data is loading
  const isLoading = locationHistoryLoading || profileLoading || rulesLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Tracker</h1>
          <p className="text-muted-foreground">
            Monitor your tax residency status across different countries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleAddCurrentLocation} disabled={locationLoading}>
            {locationLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-2" />
            )}
            {currentGPSLocation ? "Add Current Location" : "Detect Location"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/tax-profile">
              Tax Profile
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/location">
              Add Location
            </Link>
          </Button>
        </div>
      </div>

      {/* Location Entry Form Dialog */}
      {showLocationForm && (
        <LocationEntryForm
          onSuccess={() => {
            handleLocationEntrySuccess();
            setShowLocationForm(false);
            setSelectedRecord(null);
          }}
          initialData={selectedRecord ? {
            country: getCountryNameByCode(selectedRecord.countryCode),
            countryCode: selectedRecord.countryCode,
            city: "Unknown", // StayRecord doesn't include city, so use a default
            entryDate: new Date(selectedRecord.startDate),
            exitDate: selectedRecord.endDate ? new Date(selectedRecord.endDate) : null,
            isCurrentLocation: !selectedRecord.endDate
          } : null}
          triggerButton={
            <Button variant="default" className="hidden">Open Form</Button>
          }
        />
      )}

      {currentGPSLocation && (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <MapPin className="h-4 w-4 text-blue-600" />
          <AlertTitle>Current Location Detected</AlertTitle>
          <AlertDescription>
            We detected you are in {currentGPSLocation.city}, {currentGPSLocation.country}. 
            Click "Add Current Location" to record this in your tax tracker.
          </AlertDescription>
        </Alert>
      )}

      <Alert variant="default" className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle>Tax Information</AlertTitle>
        <AlertDescription>
          This tracker provides an estimate of your tax residency status based on your location data. 
          For accurate tax advice, consult with a tax professional.
        </AlertDescription>
      </Alert>

      {/* Replace the tax suggestions alert with our new component */}
      <TaxSuggestions 
        taxProfile={taxProfile}
        taxStatus={taxStatus}
        stayRecords={stayRecords}
        isLoading={isLoading}
      />

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stays">Stay Records</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading tax data...</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {taxStatus.map((status) => (
                <Card key={status.countryCode} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span className="text-lg">{getCountryFlagByCode(status.countryCode)}</span>
                      {getCountryNameByCode(status.countryCode)}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Export Data</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
          </CardHeader>
          <CardContent>
                    <div className="text-2xl font-bold">
                      {status.daysPresent} / {status.threshold} days
                  </div>
                  <Progress
                      value={(status.daysPresent / status.threshold) * 100} 
                      className={`h-2 mt-2 ${getStatusColor(status.status)}`} 
                    />
                    <p className="text-xs text-muted-foreground mt-2">{status.notes}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stays">
          <Card>
          <CardHeader>
              <CardTitle>Stay Records</CardTitle>
            <CardDescription>
                Your recorded stays across different countries
            </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-6 border-b bg-muted/50 p-2 text-sm font-medium">
                  <div>Country</div>
                  <div>Start Date</div>
                  <div>End Date</div>
                  <div>Days</div>
                  <div>Source</div>
                  <div className="text-right">Actions</div>
      </div>
                {stayRecords.map((record) => (
                  <div key={record.id} className="grid grid-cols-6 p-3 text-sm items-center border-b last:border-b-0">
                      <div className="flex items-center gap-2">
                      <span className="text-lg">{getCountryFlagByCode(record.countryCode)}</span>
                      {getCountryNameByCode(record.countryCode)}
                    </div>
                    <div>{formatDateString(record.startDate)}</div>
                    <div>{record.endDate ? formatDateString(record.endDate) : "Present"}</div>
                    <div>{record.numberOfDays}</div>
                    <div className="capitalize">
                      {record.source === "automatic" ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <Check className="h-3 w-3" /> Auto-detected
                        </span>
                      ) : (
                        "Manual"
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditStayRecord(record)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // Filter out the record with this ID
                          setStayRecords(stayRecords.filter(r => r.id !== record.id));
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                      </div>
                ))}
              </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendar View
              </CardTitle>
            <CardDescription>
                View your travel patterns on a calendar
            </CardDescription>
          </CardHeader>
            <CardContent>
              <div className="flex justify-center p-4">
                <Calendar
                  mode="single"
                  selected={new Date()}
                  // In a real app, this would show colored days based on location data
                  className="rounded-md border"
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Calendar view with location data is in development. 
                Check back soon for visual representation of your stays.
              </p>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 