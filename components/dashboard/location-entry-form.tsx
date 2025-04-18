"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGPSLocation } from "@/hooks/use-gps-location";
import axios from "axios";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, MapPin, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LocationEntry {
  _id?: string;
  country: string;
  countryCode: string;
  city: string;
  entryDate: Date;
  exitDate: Date | null;
  isCurrentLocation?: boolean;
}

interface LocationEntryFormProps {
  onSuccess?: () => void;
  initialData?: LocationEntry | null;
  triggerButton?: React.ReactNode;
}

// Form schema with validation
const formSchema = z.object({
  country: z.string().min(2, { message: "Country is required" }),
  countryCode: z.string().min(2, { message: "Country code is required" }).max(2),
  city: z.string().min(1, { message: "City is required" }),
  entryDate: z.date({ required_error: "Entry date is required" }),
  exitDate: z.date().nullable().optional(),
  isCurrentLocation: z.boolean().optional(),
});

export function LocationEntryForm({ 
  onSuccess, 
  initialData = null,
  triggerButton
}: LocationEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { location: currentLocation, error: locationError, loading: locationLoading, permissionDenied, detectLocation } = useGPSLocation();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const isEditing = !!initialData?._id;

  // Initialize form with either initial data or current location
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          country: initialData.country,
          countryCode: initialData.countryCode,
          city: initialData.city,
          entryDate: new Date(initialData.entryDate),
          exitDate: initialData.exitDate ? new Date(initialData.exitDate) : null,
          isCurrentLocation: initialData.isCurrentLocation || false,
        }
      : {
          country: "",
          countryCode: "",
          city: "",
          entryDate: new Date(),
          exitDate: null,
          isCurrentLocation: true,
        },
  });

  // Auto-fill form with current location data when available
  useEffect(() => {
    if (open && !initialData && currentLocation && !form.getValues("country") && !autoFilling) {
      handleAutoFill();
    }
  }, [open, currentLocation, initialData]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.uid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save location data",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Find the selected country to get its proper name
      const selectedCountry = COUNTRIES.find(c => c.code === values.country);
      
      // Add user ID to the data and set the proper country details
      const locationData = {
        ...values,
        country: selectedCountry?.name || values.country,
        countryCode: selectedCountry?.code || values.countryCode,
        userId: user.uid,
      };

      let response;
      if (isEditing && initialData?._id) {
        // Update existing entry
        response = await axios.patch("/api/location-tracking", {
          userId: user.uid,
          locationId: initialData._id,
          updates: locationData,
        });
      } else {
        // Create new entry
        response = await axios.post("/api/location-tracking", locationData);
      }

      if (response.data.status === "success") {
        toast({
          title: "Success",
          description: isEditing
            ? "Location entry updated successfully"
            : "Location entry added successfully",
        });

        // Close the dialog and reset form
        setOpen(false);
        form.reset();

        // Call the success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(response.data.error || "Failed to save location entry");
      }
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save location data. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle auto-fill from current location
  const handleAutoFill = async () => {
    setAutoFilling(true);
    
    try {
      if (permissionDenied) {
        toast({
          variant: "destructive", 
          title: "Location permission denied",
          description: "Please enable location services in your browser settings."
        });
        return;
      }
      
      if (!currentLocation) {
        // Try to get location if we don't have it yet
        detectLocation();
        toast({
          title: "Detecting location",
          description: "Please wait while we detect your current location."
        });
        return;
      }
      
      // Find matching country in our list
      const matchingCountry = COUNTRIES.find(
        c => c.name === currentLocation.country || 
             c.code === currentLocation.country_code
      );
      
      if (matchingCountry) {
        form.setValue("country", matchingCountry.code);
        form.setValue("countryCode", matchingCountry.code);
      } else {
        // Fallback if not found in our list
        toast({
          variant: "destructive",
          title: "Country not found",
          description: `Could not match "${currentLocation.country}" (${currentLocation.country_code}) to our country list.`
        });
        form.setValue("country", "");
        form.setValue("countryCode", currentLocation.country_code || "");
      }
      
      form.setValue("city", currentLocation.city);
      
      toast({
        title: "Location detected",
        description: `We detected you are in ${currentLocation.city}, ${currentLocation.country}.`
      });
    } catch (error) {
      console.error("Error auto-filling location:", error);
      toast({
        variant: "destructive",
        title: "Location detection failed",
        description: "Could not detect your current location."
      });
    } finally {
      setAutoFilling(false);
    }
  };

  // Handle current location checkbox
  const handleCurrentLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isCurrentLocation = e.target.checked;
    form.setValue("isCurrentLocation", isCurrentLocation);
    
    if (isCurrentLocation) {
      form.setValue("exitDate", null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton ? (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {isEditing ? "Edit Location" : "Add Location"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Location" : "Add New Location"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your location information"
              : "Record a new location entry in your travel history"}
          </DialogDescription>
        </DialogHeader>

        {permissionDenied && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Location permission denied</AlertTitle>
            <AlertDescription>
              Please enable location services in your browser settings to use auto-detection.
            </AlertDescription>
          </Alert>
        )}

        {currentLocation && (
          <div className="bg-muted p-3 rounded-md mb-4 text-sm">
            <div className="font-medium mb-1 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Current Location Detected
            </div>
            <p>{currentLocation.city}, {currentLocation.country} ({currentLocation.country_code})</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="col-span-2 md:col-span-1">
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Auto-fill the country code when selecting country
                          form.setValue("countryCode", value);
                          
                          // Get currency for the selected country (for potential future use)
                          const selectedCountry = COUNTRIES.find(c => c.code === value);
                          if (selectedCountry) {
                            // You could set currency or other country-specific values here
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem className="col-span-2 md:col-span-1">
                    <FormLabel>Country Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ES" maxLength={2} {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Barcelona" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Entry Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exitDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Exit Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={form.watch("isCurrentLocation")}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Still here</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < form.getValues("entryDate") ||
                            date > new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="currentLocation"
                checked={form.watch("isCurrentLocation")}
                onChange={handleCurrentLocationChange}
                className="rounded border-gray-300"
              />
              <label htmlFor="currentLocation" className="text-sm">
                This is my current location
              </label>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleAutoFill}
              disabled={autoFilling}
            >
              {autoFilling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : locationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : permissionDenied ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {autoFilling ? "Detecting location..." : "Auto-fill with current location"}
            </Button>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Update Location"
                  : "Add Location"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 