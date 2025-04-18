"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarIcon, Loader2, MapPin } from "lucide-react";
import * as dateFns from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getAllCategories } from "@/lib/transactionCategories";
import { Transaction } from "@/hooks/use-transactions";
import { useAuth } from "@/context/AuthContext";
import useUserSettings from "@/hooks/use-user-settings";
import useTransactions from "@/hooks/use-transactions";
import { CURRENCIES } from "@/lib/currency";
import { createLocationObject } from "@/lib/location";
import { useGPSLocation } from "@/hooks/use-gps-location";
import { COUNTRIES } from "@/lib/countries";

// Helper function to parse location string
function parseLocation(location: string | undefined) {
  if (!location) return { country: "", country_code: "", city: "" };
  const [city = "", country = ""] = location.split(",").map(s => s.trim());
  // Find country code from country name
  const countryData = COUNTRIES.find(c => c.name === country);
  return {
    city,
    country,
    country_code: countryData?.code || ""
  };
}

// Update the location interface
interface LocationData {
  country: string;
  country_code: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// Form schema
const transactionFormSchema = z.object({
  amount: z.coerce.number().refine(value => value !== 0, {
    message: "Amount cannot be zero"
  }),
  currency: z.string().min(1, "Currency is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  location: z.object({
    country: z.string().min(1, "Country is required"),
    country_code: z.string().min(1, "Country code is required"),
    city: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  transaction?: Transaction;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultValues?: {
    amount?: number;
    type?: 'income' | 'expense';
  };
}

export function TransactionForm({ transaction, onSuccess, onCancel, defaultValues }: TransactionFormProps) {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { createTransaction, updateTransaction } = useTransactions();
  const { location: gpsLocation, loading: gpsLoading } = useGPSLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currencyChanged, setCurrencyChanged] = useState(false);
  const categories = getAllCategories();
  
  // Parse location from settings
  const defaultLocation = settings?.location ? parseLocation(settings.location) : undefined;
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: transaction?.amount || defaultValues?.amount || 0,
      currency: transaction?.currency || settings?.baseCurrency || "USD",
      description: transaction?.description || "",
      category: transaction?.category || "Other",
      date: transaction?.date ? new Date(transaction.date) : new Date(),
      location: {
        country: transaction?.location?.country || defaultLocation?.country || "",
        country_code: transaction?.location?.country_code || defaultLocation?.country_code || "",
        city: transaction?.location?.city || defaultLocation?.city || ""
      },
      notes: "",
    },
  });

  useEffect(() => {
    if (defaultValues?.type === 'income' && !transaction) {
      const amount = form.getValues('amount');
      form.setValue('amount', Math.abs(amount));
    } else if (defaultValues?.type === 'expense' && !transaction) {
      const amount = form.getValues('amount');
      form.setValue('amount', -Math.abs(amount));
    }
  }, [defaultValues?.type, form, transaction]);

  // Watch for currency changes made by user
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "currency") {
        setCurrencyChanged(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Update form when GPS location changes
  useEffect(() => {
    if (!transaction && gpsLocation && !form.getValues('location.country')) {
      form.setValue('location', {
        country: gpsLocation.country,
        country_code: gpsLocation.country_code,
        city: gpsLocation?.city || settings?.location?.city || ""
      });
      
      // Only update currency if user hasn't explicitly changed it
      if (!currencyChanged && gpsLocation.currency) {
        if (CURRENCIES.some(c => c.code === gpsLocation.currency)) {
          form.setValue('currency', gpsLocation.currency);
        }
      }
    }
  }, [gpsLocation, transaction, form, currencyChanged, settings]);

  // Update form when transaction or settings change
  useEffect(() => {
    if (transaction) {
      form.reset({
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        category: transaction.category,
        date: new Date(transaction.date),
        location: {
          country: transaction.location?.country || "",
          country_code: transaction.location?.country_code || "",
          city: transaction.location?.city || ""
        },
        notes: "",
      });
    } else if (settings) {
      form.setValue("currency", settings.baseCurrency || "USD");
      if (settings.location) {
        form.setValue("location", {
          country: settings.location.country || "",
          country_code: settings.location.country_code || "",
          city: settings?.location?.city || ""
        });
      }
    }
  }, [transaction, settings, form]);

  async function onSubmit(values: TransactionFormValues) {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const locationData = gpsLocation && values.location.country === gpsLocation.country
        ? {
            country: gpsLocation.country,
            country_code: gpsLocation.country_code,
            city: gpsLocation.city || values.location.country,
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude
          }
        : {
            country: values.location.country,
            country_code: values.location.country_code,
            city: values.location.country
          };

      const transactionData = {
        ...values,
        userId: user.uid,
        location: locationData,
        // Ensure amount is positive for income, negative for expense
        amount: defaultValues?.type === 'income' ? Math.abs(values.amount) : -Math.abs(values.amount)
      };
      
      if (transaction?._id) {
        await updateTransaction(transaction._id, transactionData);
      } else {
        await createTransaction(transactionData);
      }
      
      if (onSuccess) onSuccess();
      
      if (!transaction) {
        form.reset({
          amount: 0,
          currency: settings?.baseCurrency || "USD",
          description: "",
          category: "Other",
          date: new Date(),
          location: {
            country: settings?.location?.country || "",
            country_code: settings?.location?.country_code || "",
            city: settings?.location?.city || ""
          },
          notes: "",
        });
        setCurrencyChanged(false);
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    {...field} 
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setCurrencyChanged(true);
                  }} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Transaction description" {...field} className="h-10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "h-10 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          dateFns.format(field.value, "PPP")
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
        </div>
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>Country</FormLabel>
                {!transaction && (
                  <div className="text-sm text-muted-foreground">
                    {gpsLoading ? (
                      <div className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Detecting country...</span>
                      </div>
                    ) : gpsLocation ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>GPS Location Available</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <FormControl>
                <Select 
                  onValueChange={(value) => {
                    const selectedCountry = COUNTRIES.find(c => c.code === value);
                    if (selectedCountry) {
                      field.onChange({
                        country: selectedCountry.name,
                        country_code: selectedCountry.code
                      });
                    }
                  }} 
                  value={field.value.country_code}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select country" />
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
              {gpsLocation && (
                <FormDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Detected: {gpsLocation.country}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes about this transaction" 
                  className="resize-none min-h-[80px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{transaction ? "Updating..." : "Adding..."}</span>
              </div>
            ) : (
              transaction ? "Update Transaction" : "Add Transaction"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}