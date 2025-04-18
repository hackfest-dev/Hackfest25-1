"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Clock, Info, Flag } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGPSLocation } from "@/hooks/use-gps-location";
import useTaxProfile from "@/hooks/use-tax-profile";
import useCountryTaxRules from "@/hooks/use-country-tax-rules";
import { useAuth } from "@/context/AuthContext";
import useLocationTracking from "@/hooks/use-location-tracking";

export function TaxResidencyTracker() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("current");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const { location: currentLocation } = useGPSLocation();
  
  // Use our hooks
  const { 
    profile, 
    taxRules, 
    residencyStatus, 
    loading: profileLoading,
    error: profileError
  } = useTaxProfile();
  
  const {
    rules: countryRules,
    loading: rulesLoading,
    getNextFilingDate
  } = useCountryTaxRules();
  
  const {
    locationHistory,
    locationSummary,
    loading: locationLoading
  } = useLocationTracking({ year });
  
  // Get the countries with the highest risk of tax residency
  const highRiskCountries = residencyStatus
    .filter(country => country.percentage >= 50)
    .sort((a, b) => b.percentage - a.percentage);
  
  // Get the next tax deadlines
  const getUpcomingDeadlines = () => {
    if (!profile) return [];
    
    const countries = [
      profile.taxHomeCode,
      ...residencyStatus.filter(r => r.percentage > 30).map(r => r.countryCode)
    ];
    
    return countries
      .filter((country, index, self) => self.indexOf(country) === index) // Remove duplicates
      .map(countryCode => {
        const filingDate = getNextFilingDate(countryCode);
        const rule = countryRules[countryCode];
        
        if (!rule || !filingDate) return null;
        
        return {
          country: rule.country,
          countryCode,
          flagEmoji: rule.flagEmoji,
          deadline: filingDate,
          description: `${rule.country} tax filing deadline`,
          daysRemaining: Math.ceil((filingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.deadline as Date).getTime() - (b!.deadline as Date).getTime());
  };
  
  // Determine if we should show a warning about a country approaching tax residency
  const getResidencyWarning = () => {
    const approachingCountry = residencyStatus.find(country => 
      country.percentage >= 70 && country.percentage < 100
    );
    
    if (approachingCountry) {
      return {
        country: approachingCountry.country,
        countryCode: approachingCountry.countryCode,
        flagEmoji: approachingCountry.flagEmoji,
        daysPresent: approachingCountry.daysPresent,
        threshold: approachingCountry.threshold,
        daysRemaining: approachingCountry.daysRemaining
      };
    }
    
    return null;
  };
  
  // Determine if we should show an alert about tax residency
  const getResidencyAlert = () => {
    const residentCountry = residencyStatus.find(country => 
      country.percentage >= 100
    );
    
    if (residentCountry) {
      return {
        country: residentCountry.country,
        countryCode: residentCountry.countryCode,
        flagEmoji: residentCountry.flagEmoji,
        daysPresent: residentCountry.daysPresent,
        threshold: residentCountry.threshold
      };
    }
    
    return null;
  };
  
  // Format a date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };
  
  // Handle year change
  const handleYearChange = (newYear: number) => {
    setYear(newYear);
  };
  
  const loading = profileLoading || rulesLoading || locationLoading;
  const warning = getResidencyWarning();
  const alert = getResidencyAlert();
  const deadlines = getUpcomingDeadlines();
  
  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tax Residency Status</CardTitle>
            <CardDescription>Track your days in each country for tax purposes</CardDescription>
          </div>
          <select 
            className="bg-background border rounded-md px-2 py-1 text-sm"
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
          >
            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading residency data...</p>
            </div>
          </div>
        ) : (
          <>
            {alert && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Tax Residency Alert</AlertTitle>
                <AlertDescription>
                  You have exceeded the tax residency threshold in <strong>{alert.country} ({alert.flagEmoji})</strong>. 
                  You have spent {alert.daysPresent} days out of the {alert.threshold}-day threshold.
                  You may be considered a tax resident and should consult a tax professional.
                </AlertDescription>
              </Alert>
            )}
            
            {warning && !alert && (
              <Alert variant="default" className="mb-4 bg-amber-50 border-amber-200">
                <Clock className="h-4 w-4 text-amber-500" />
                <AlertTitle>Approaching Tax Residency</AlertTitle>
                <AlertDescription>
                  You're approaching the tax residency threshold for <strong>{warning.country} ({warning.flagEmoji})</strong>. 
                  You have spent {warning.daysPresent} days out of the {warning.threshold}-day threshold.
                  Only {warning.daysRemaining} days remaining before potential tax residency.
                </AlertDescription>
              </Alert>
            )}
            
            {profile && profile.taxHome && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Primary Tax Home: {profile.taxHome}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is your declared primary tax residence. Travel carefully to avoid creating additional tax residency.
                </p>
              </div>
            )}
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
              <TabsList className="mb-4">
                <TabsTrigger value="current">Current Status</TabsTrigger>
                <TabsTrigger value="calendar">Calendar Year</TabsTrigger>
                <TabsTrigger value="fiscal">Fiscal Year</TabsTrigger>
              </TabsList>
              
              <TabsContent value="current" className="space-y-4">
                {highRiskCountries.length > 0 ? (
                  highRiskCountries.map((country) => (
                    <div key={country.countryCode} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{country.flagEmoji}</span>
                          <h3 className="font-medium">{country.country}</h3>
                        </div>
                        <span className="text-sm">
                          {country.daysPresent} / {country.threshold} days
                        </span>
                      </div>
                      <Progress 
                        value={country.percentage} 
                        className={
                          country.percentage >= 100 ? "bg-red-100" :
                          country.percentage >= 80 ? "bg-amber-100" :
                          country.percentage >= 50 ? "bg-blue-100" :
                          "bg-muted"
                        } 
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className={
                          country.percentage >= 100 ? "text-red-500 font-medium" :
                          country.percentage >= 80 ? "text-amber-500 font-medium" :
                          country.percentage >= 50 ? "text-blue-500 font-medium" :
                          "text-muted-foreground"
                        }>
                          {country.status}
                        </span>
                        <span className="text-muted-foreground">{country.daysRemaining} days remaining</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    No significant tax residency risk detected.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="calendar" className="space-y-4">
                {residencyStatus.map((country) => (
                  <div key={country.countryCode} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{country.flagEmoji}</span>
                        <h3 className="font-medium">{country.country}</h3>
                      </div>
                      <span className="text-sm">
                        {country.daysPresent} / {country.threshold} days
                      </span>
                    </div>
                    <Progress 
                      value={country.percentage} 
                      className={
                        country.percentage >= 100 ? "bg-red-100" :
                        country.percentage >= 80 ? "bg-amber-100" :
                        country.percentage >= 50 ? "bg-blue-100" :
                        "bg-muted"
                      } 
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className={
                        country.percentage >= 100 ? "text-red-500 font-medium" :
                        country.percentage >= 80 ? "text-amber-500 font-medium" :
                        country.percentage >= 50 ? "text-blue-500 font-medium" :
                        "text-muted-foreground"
                      }>
                        {country.status}
                      </span>
                      <span className="text-muted-foreground">{country.daysRemaining} days remaining</span>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="fiscal" className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Fiscal year calculations vary by country. This is based on their respective fiscal calendars.
                </div>
                {residencyStatus.map((country) => {
                  const rule = countryRules[country.countryCode];
                  return (
                    <div key={country.countryCode} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{country.flagEmoji}</span>
                          <h3 className="font-medium">{country.country}</h3>
                        </div>
                        <span className="text-sm">
                          {country.daysPresent} / {country.threshold} days
                        </span>
                      </div>
                      <Progress 
                        value={country.percentage} 
                        className={
                          country.percentage >= 100 ? "bg-red-100" :
                          country.percentage >= 80 ? "bg-amber-100" :
                          country.percentage >= 50 ? "bg-blue-100" :
                          "bg-muted"
                        } 
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className={
                          country.percentage >= 100 ? "text-red-500 font-medium" :
                          country.percentage >= 80 ? "text-amber-500 font-medium" :
                          country.percentage >= 50 ? "text-blue-500 font-medium" :
                          "text-muted-foreground"
                        }>
                          {country.status}
                        </span>
                        <span className="text-muted-foreground">
                          {rule && rule.taxYear === 'fiscal' ? 
                            `Fiscal year: ${rule.fiscalYearStart?.split('-')[1]}/${rule.fiscalYearStart?.split('-')[0]}` :
                            'Calendar year'
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>

            {deadlines.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium mb-2">Upcoming Deadlines</h3>
                <div className="space-y-2">
                  {deadlines.slice(0, 3).map((deadline, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span>{deadline!.flagEmoji}</span>
                        <span>{deadline!.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={deadline!.daysRemaining < 30 ? "text-red-500 font-medium" : ""}>{formatDate(deadline!.deadline as Date)}</span>
                        <span className="text-xs text-muted-foreground">({deadline!.daysRemaining} days)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Tax information is for guidance only</AlertTitle>
              <AlertDescription>
                This tool helps track potential tax residency status based on your location history.
                Always consult with a tax professional for definitive advice.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">Setup Tax Profile</Button>
      </CardFooter>
    </Card>
  );
} 