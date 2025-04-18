"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { CalendarIcon, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { getAllCategories, guessCategory } from "@/lib/transactionCategories";
import { CURRENCIES } from "@/lib/currency";
import { detectUserLocation, formatLocation } from "@/lib/location";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useUserSettings from "@/hooks/use-user-settings";

interface TransactionFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
  isExpense?: boolean;
  mode?: "create" | "edit";
}

const formSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().min(1, "Currency is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  date: z.date(),
  isExpense: z.boolean().default(true),
  location: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export function TransactionForm({ onSubmit, initialData, isExpense = true, mode = "create" }: TransactionFormProps) {
  const { toast } = useToast();
  const { settings } = useUserSettings();
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [currencyChanged, setCurrencyChanged] = useState(false);
  
  // Default form values
  const defaultValues = {
    amount: initialData?.amount?.toString() || "",
    currency: initialData?.currency || settings?.baseCurrency || "USD",
    category: initialData?.category || "",
    description: initialData?.description || "",
    date: initialData?.date ? new Date(initialData.date) : new Date(),
    isExpense: initialData?.isExpense !== undefined ? initialData.isExpense : isExpense,
    location: initialData?.location || "",
    tags: initialData?.tags || [],
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Function to detect user's location by IP
  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      // Use our location utility function
      const location = await detectUserLocation();
      
      // Update form with detected location and currency
      form.setValue("location", formatLocation(location));
      
      // Only update currency if user hasn't explicitly changed it
      if (!currencyChanged && location.currency && 
          CURRENCIES.some(c => c.code === location.currency)) {
        form.setValue("currency", location.currency);
      }
      
      toast({
        title: "Location detected",
        description: formatLocation(location),
      });
    } catch (error) {
      console.error("Error detecting location:", error);
      toast({
        title: "Location detection failed",
        description: "Could not automatically detect your location",
        variant: "destructive",
      });
    } finally {
      setDetectingLocation(false);
    }
  };
  
  // Auto-detect location when form loads for new transactions
  useEffect(() => {
    if (mode === "create" && !initialData?.location) {
      detectLocation();
    }
  }, [mode]);
  
  // Watch for currency changes made by user
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "currency") {
        setCurrencyChanged(true);
      }
      
      if (name === "description" && value.description && !form.getValues("category")) {
        const suggestedCategory = guessCategory(value.description as string);
        if (suggestedCategory) {
          form.setValue("category", suggestedCategory);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    const formattedData = {
      ...data,
      amount: parseFloat(data.amount),
    };
    
    onSubmit(formattedData);
    setCurrencyChanged(false);
  };
  
  const formatDateString = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Add" : "Edit"} {isExpense ? "Expense" : "Income"}</CardTitle>
        <CardDescription>
          {mode === "create" ? "Record a new transaction" : "Update transaction details"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input 
                id="amount"
                placeholder="0.00"
                type="number"
                step="0.01"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-red-500 text-xs">{form.formState.errors.amount.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={form.getValues("currency")} 
                onValueChange={(value: string) => {
                  form.setValue("currency", value);
                  setCurrencyChanged(true);
                }}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.currency && (
                <p className="text-red-500 text-xs">{form.formState.errors.currency.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.getValues("category")}
              onValueChange={(value: string) => form.setValue("category", value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {getAllCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-red-500 text-xs">{form.formState.errors.category.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What was this transaction for?"
              {...form.register("description")}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.getValues("date") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.getValues("date") ? (
                      formatDateString(form.getValues("date"))
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.getValues("date")}
                    onSelect={(date) => date && form.setValue("date", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  placeholder="Where did this happen?"
                  {...form.register("location")}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={detectLocation}
                  disabled={detectingLocation}
                >
                  {detectingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="isExpense">Transaction Type</Label>
            <Select 
              value={form.getValues("isExpense") ? "expense" : "income"} 
              onValueChange={(value: string) => form.setValue("isExpense", value === "expense")}
            >
              <SelectTrigger id="isExpense">
                <SelectValue placeholder="Transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
          <Button type="button" variant="outline" onClick={() => onSubmit(null)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            {mode === "create" ? "Add" : "Update"} Transaction
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 