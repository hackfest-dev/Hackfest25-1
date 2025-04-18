"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useTaxProfile from "@/hooks/use-tax-profile";
import useCountryTaxRules from "@/hooks/use-country-tax-rules";
import { COUNTRIES } from "@/lib/countries";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
// We'll use a custom date formatting function instead of date-fns
// import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Globe, Check, Home, InfoIcon, Flag, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Custom function to format dates without using date-fns
const formatDateString = (date: Date, formatStr: string): string => {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const day = date.getDate();
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    
    // Different format strings
    if (formatStr === 'MMM d') {
      return `${months[month]} ${day}`;
    } else if (formatStr === 'MMMM d') {
      return `${fullMonths[month]} ${day}`;
    } else if (formatStr === 'MMM d, yyyy') {
      return `${months[month]} ${day}, ${year}`;
    } else {
      // Default format: MMM d, yyyy
      return `${months[month]} ${day}, ${year}`;
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

// Define form schema
const formSchema = z.object({
  taxHome: z.string().min(2, { message: "Primary tax home is required" }),
  taxHomeCode: z.string().min(2, { message: "Country code is required" }).max(2),
  citizenship: z.array(z.string()).min(1, { message: "At least one citizenship is required" }),
  additionalTaxObligations: z.array(z.object({
    country: z.string(),
    countryCode: z.string(),
    reason: z.string()
  })).default([]),
  declareTaxIn: z.array(z.string()).min(1, { message: "At least one tax jurisdiction is required" }),
  userSettings: z.object({
    baseYear: z.number(),
    preferredCurrency: z.string(),
    trackIncome: z.boolean()
  })
});

type FormValues = z.infer<typeof formSchema>;

export default function TaxProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [citizenships, setCitizenships] = useState<Array<string>>([]);
  const [taxObligations, setTaxObligations] = useState<Array<{country: string, countryCode: string, reason: string}>>([]);
  const [newObligation, setNewObligation] = useState<{country: string, countryCode: string, reason: string}>({
    country: "",
    countryCode: "",
    reason: ""
  });
  
  // Get tax profile data
  const {
    profile,
    hasProfile,
    loading: profileLoading,
    error: profileError,
    saveTaxProfile,
    updateTaxProfile
  } = useTaxProfile();
  
  // Get tax rules data
  const {
    rules: taxRules,
    loading: rulesLoading
  } = useCountryTaxRules();
  
  // Setup form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taxHome: "",
      taxHomeCode: "",
      citizenship: [],
      additionalTaxObligations: [],
      declareTaxIn: [],
      userSettings: {
        baseYear: new Date().getFullYear(),
        preferredCurrency: "USD",
        trackIncome: true
      }
    }
  });
  
  // Update form with profile data when it's loaded
  useEffect(() => {
    if (profile && !profileLoading) {
      form.reset({
        taxHome: profile.taxHome,
        taxHomeCode: profile.taxHomeCode,
        citizenship: profile.citizenship,
        additionalTaxObligations: profile.additionalTaxObligations,
        declareTaxIn: profile.declareTaxIn,
        userSettings: {
          baseYear: profile.userSettings.baseYear,
          preferredCurrency: profile.userSettings.preferredCurrency,
          trackIncome: profile.userSettings.trackIncome
        }
      });
      
      // Set state variables
      setCitizenships(profile.citizenship);
      setTaxObligations(profile.additionalTaxObligations);
    }
  }, [profile, profileLoading, form]);
  
  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (!user?.uid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save your tax profile"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Add citizenship and obligations
      values.citizenship = citizenships;
      // Ensure additionalTaxObligations is always a non-empty array
      values.additionalTaxObligations = taxObligations.length > 0 ? 
        taxObligations : 
        [{ country: values.taxHome, countryCode: values.taxHomeCode, reason: "Primary Residence" }];
      
      // Log the data being submitted
      console.log("Submitting tax profile data:", JSON.stringify({
        userId: user.uid,
        ...values
      }, null, 2));
      
      // Save profile
      const response = await saveTaxProfile({
        userId: user.uid,
        ...values
      });
      
      console.log("Tax profile save response:", response);
      
      toast({
        title: "Success",
        description: "Your tax profile has been saved."
      });
      
      // Delay the redirect to make sure toast is visible
      setTimeout(() => {
        router.push("/dashboard/tax-tracker");
      }, 1500);
    } catch (error) {
      console.error("Error saving tax profile:", error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? `Failed to save your tax profile: ${error.message}`
          : "Failed to save your tax profile. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle adding citizenship
  const handleAddCitizenship = (countryCode: string) => {
    if (!countryCode || citizenships.includes(countryCode)) return;
    
    setCitizenships([...citizenships, countryCode]);
    
    // Also add to countries where taxes are declared
    const declareTaxIn = form.getValues("declareTaxIn");
    if (!declareTaxIn.includes(countryCode)) {
      form.setValue("declareTaxIn", [...declareTaxIn, countryCode]);
    }
  };
  
  // Handle removing citizenship
  const handleRemoveCitizenship = (countryCode: string) => {
    setCitizenships(citizenships.filter(c => c !== countryCode));
  };
  
  // Handle adding tax obligation
  const handleAddObligation = () => {
    if (!newObligation.countryCode || !newObligation.reason) return;
    
    // Find country name
    const country = COUNTRIES.find(c => c.code === newObligation.countryCode);
    if (!country) return;
    
    // Add obligation
    setTaxObligations([...taxObligations, {
      country: country.name,
      countryCode: newObligation.countryCode,
      reason: newObligation.reason
    }]);
    
    // Reset form
    setNewObligation({
      country: "",
      countryCode: "",
      reason: ""
    });
    
    // Also add to countries where taxes are declared
    const declareTaxIn = form.getValues("declareTaxIn");
    if (!declareTaxIn.includes(newObligation.countryCode)) {
      form.setValue("declareTaxIn", [...declareTaxIn, newObligation.countryCode]);
    }
  };
  
  // Handle removing tax obligation
  const handleRemoveObligation = (countryCode: string) => {
    setTaxObligations(taxObligations.filter(o => o.countryCode !== countryCode));
  };
  
  // Loading state
  const loading = profileLoading || rulesLoading;
  
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Tax Profile</h2>
        <Button variant="outline" onClick={() => router.push("/dashboard/tax-tracker")}>
          Back to Tax Tracker
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p>Loading your tax profile...</p>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-between items-center mb-6">
                <TabsList>
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="citizenship">Citizenship</TabsTrigger>
                  <TabsTrigger value="obligations">Tax Obligations</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Profile
                </Button>
              </div>
              
              <TabsContent value="basic">
                <Card>
                  <CardHeader>
                    <CardTitle>Primary Tax Residence</CardTitle>
                    <CardDescription>
                      This is your primary country of tax residence and determines your main tax obligations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert className="mb-6">
                      <InfoIcon className="h-4 w-4" />
                      <AlertTitle>What is a tax home?</AlertTitle>
                      <AlertDescription>
                        Your tax home is your primary tax residence, typically where you spend the most time,
                        have the strongest personal and economic ties, or have legal residence.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={form.control}
                        name="taxHomeCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Tax Home</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                
                                // Also update the country name
                                const country = COUNTRIES.find(c => c.code === value);
                                if (country) {
                                  form.setValue("taxHome", country.name);
                                }
                                
                                // Also add to countries where taxes are declared
                                const declareTaxIn = form.getValues("declareTaxIn");
                                if (!declareTaxIn.includes(value)) {
                                  form.setValue("declareTaxIn", [...declareTaxIn, value]);
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your primary tax residence" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    {country.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              This is the country where you typically file your main tax return
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("taxHomeCode") && (
                        <div className="p-4 bg-muted rounded-md">
                          <div className="flex items-center gap-2 mb-1">
                            <Home className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-medium">Tax Residence Details</h3>
                          </div>
                          
                          {taxRules[form.watch("taxHomeCode")] ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Residency Threshold:</span>
                                <span className="font-medium">{taxRules[form.watch("taxHomeCode")].residencyThresholdDays} days</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax Filing Date:</span>
                                <span className="font-medium">
                                  {formatDateString(new Date(2000, taxRules[form.watch("taxHomeCode")].taxFilingMonth - 1, taxRules[form.watch("taxHomeCode")].taxFilingDay), 'MMM d')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax Year Type:</span>
                                <span className="font-medium capitalize">{taxRules[form.watch("taxHomeCode")].taxYear}</span>
                              </div>
                              <div className="mt-2">
                                <span className="text-muted-foreground">{taxRules[form.watch("taxHomeCode")].description}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No detailed tax information available for this country yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="citizenship">
                <Card>
                  <CardHeader>
                    <CardTitle>Citizenship & Nationalities</CardTitle>
                    <CardDescription>
                      Your citizenship can affect your tax obligations regardless of where you live
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert className="mb-6">
                      <Flag className="h-4 w-4" />
                      <AlertTitle>Why citizenship matters</AlertTitle>
                      <AlertDescription>
                        Some countries (like the US) tax their citizens regardless of where they live.
                        Others only tax based on residence.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Add Citizenship</label>
                        <div className="flex gap-2 mt-1">
                          <Select
                            value={newObligation.countryCode}
                            onValueChange={(value) => setNewObligation({...newObligation, countryCode: value})}
                          >
                            <SelectTrigger className="w-full">
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
                          
                          <Button 
                            variant="outline" 
                            type="button" 
                            onClick={() => handleAddCitizenship(newObligation.countryCode)}
                            disabled={!newObligation.countryCode}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Your Citizenships</label>
                        
                        {citizenships.length === 0 ? (
                          <div className="text-sm text-muted-foreground p-2">
                            No citizenships added yet. Please add at least one citizenship.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {citizenships.map((code) => {
                              const country = COUNTRIES.find(c => c.code === code);
                              return (
                                <Badge key={code} variant="outline" className="flex items-center gap-1">
                                  {country?.name || code}
                                  <button 
                                    type="button" 
                                    className="ml-1 rounded-full hover:bg-muted p-1"
                                    onClick={() => handleRemoveCitizenship(code)}
                                  >
                                    ✕
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="obligations">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Tax Obligations</CardTitle>
                    <CardDescription>
                      Add any other countries where you have tax obligations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Additional obligations</AlertTitle>
                      <AlertDescription>
                        You may have tax obligations in countries where you're not a citizen or resident,
                        such as from a Green Card, substantial presence, or income sources.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <label className="text-sm font-medium">Country</label>
                          <Select
                            value={newObligation.countryCode}
                            onValueChange={(value) => {
                              const country = COUNTRIES.find(c => c.code === value);
                              setNewObligation({
                                ...newObligation,
                                country: country?.name || "",
                                countryCode: value
                              });
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
                        </div>
                        
                        <div className="col-span-5">
                          <label className="text-sm font-medium">Reason</label>
                          <Select
                            value={newObligation.reason}
                            onValueChange={(value) => setNewObligation({...newObligation, reason: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Green Card">Green Card</SelectItem>
                              <SelectItem value="Substantial Presence">Substantial Presence</SelectItem>
                              <SelectItem value="Income Source">Income Source</SelectItem>
                              <SelectItem value="Property Ownership">Property Ownership</SelectItem>
                              <SelectItem value="Business Interest">Business Interest</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-2 flex items-end">
                          <Button 
                            variant="outline" 
                            type="button" 
                            className="w-full"
                            onClick={handleAddObligation}
                            disabled={!newObligation.countryCode || !newObligation.reason}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <label className="text-sm font-medium">Your Additional Tax Obligations</label>
                        
                        {taxObligations.length === 0 ? (
                          <div className="text-sm text-muted-foreground p-2">
                            No additional tax obligations added.
                          </div>
                        ) : (
                          <div className="space-y-2 mt-2">
                            {taxObligations.map((obligation, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <div className="flex items-center gap-2">
                                  <span>{obligation.country}</span>
                                  <Badge variant="outline">{obligation.reason}</Badge>
                                </div>
                                <button
                                  type="button"
                                  className="text-sm text-muted-foreground hover:text-foreground"
                                  onClick={() => handleRemoveObligation(obligation.countryCode)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t">
                      <FormField
                        control={form.control}
                        name="declareTaxIn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Countries Where You File Taxes</FormLabel>
                            <div className="space-y-2">
                              {COUNTRIES.map((country) => {
                                // Check if this is a country the user has obligations in
                                const hasObligation = 
                                  form.watch("taxHomeCode") === country.code || 
                                  citizenships.includes(country.code) || 
                                  taxObligations.some(o => o.countryCode === country.code);
                                
                                // Only include countries with obligations by default
                                return (
                                  <div key={country.code} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`file-${country.code}`}
                                      checked={field.value.includes(country.code)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, country.code]);
                                        } else {
                                          field.onChange(
                                            field.value.filter((value) => value !== country.code)
                                          );
                                        }
                                      }}
                                      // If this is a country with obligations, disable the checkbox
                                      disabled={hasObligation}
                                    />
                                    <label
                                      htmlFor={`file-${country.code}`}
                                      className="text-sm flex items-center gap-1"
                                    >
                                      {country.name}
                                      {hasObligation && <span className="text-xs text-muted-foreground">(Required)</span>}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                            <FormDescription>
                              These are the countries where you file tax returns or have filing obligations.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Tax Profile Settings</CardTitle>
                    <CardDescription>
                      Configure your tax tracking preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="userSettings.baseYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Tax Year</FormLabel>
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The year for which you want to track your tax residency status
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="userSettings.preferredCurrency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Currency</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY", "INR"].map((currency) => (
                                <SelectItem key={currency} value={currency}>
                                  {currency}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Your preferred currency for displaying tax amounts
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="userSettings.trackIncome"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Track Income for Tax Purposes</FormLabel>
                            <FormDescription>
                              Enable income tracking for better tax planning
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">
                      These settings determine how your tax profile and residency are calculated and displayed.
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      )}
    </div>
  );
} 