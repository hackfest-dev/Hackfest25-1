"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useUserSettings from "@/hooks/use-user-settings";
import { useGPSLocation } from "@/hooks/use-gps-location";
import { COUNTRIES } from "@/lib/countries";
import { CURRENCIES, Currency } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, User, Globe, Shield, Paintbrush, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Define theme as a specific type to fix linter error
type Theme = "light" | "dark" | "system";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { settings, loading, error, updateSettings } = useUserSettings();
  const { location: gpsLocation, loading: gpsLoading, error: gpsError } = useGPSLocation();
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [theme, setTheme] = useState<Theme>("dark");
  const [location, setLocation] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [residencyLocation, setResidencyLocation] = useState("");
  const [residencyLocationCode, setResidencyLocationCode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize form with user settings when loaded
  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName || "");
      setBaseCurrency(settings.baseCurrency || "USD");
      setTheme((settings.theme as Theme) || "dark");
      setLocation(settings.location || "");
      setLocationCode(settings.locationCode || "");
      setResidencyLocation(settings.residencyLocation || "");
      setResidencyLocationCode(settings.residencyLocationCode || "");
    }
    
    if (user) {
      setEmail(user.email || "");
    }
  }, [settings, user]);

  // Apply GPS location when detected
  const setLocationFromGPS = () => {
    if (gpsLocation) {
      setLocation(`${gpsLocation.city}, ${gpsLocation.country}`);
      setLocationCode(gpsLocation.country_code);
      // Find the matching currency from the country code
      const country = COUNTRIES.find(c => c.code === gpsLocation.country_code.toUpperCase());
      if (country && country.currency) {
        setBaseCurrency(country.currency);
      }
      toast({
        title: "Location updated",
        description: `Location set to ${gpsLocation.city}, ${gpsLocation.country}`,
      });
    } else if (gpsError) {
      toast({
        title: "Location detection failed",
        description: "Please enter your location manually",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Detecting location...",
        description: "Please wait while we detect your location",
      });
    }
  };

  if (!user) {
    router.push("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true);
      await updateSettings({
        displayName,
      });
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setIsUpdating(true);
      await updateSettings({
        theme,
      });
      toast({
        title: "Preferences updated",
        description: "Your preferences have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to update preferences",
        description: "There was an error updating your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCurrency = async () => {
    try {
      setIsUpdating(true);
      await updateSettings({
        baseCurrency,
        location,
        locationCode,
        residencyLocation,
        residencyLocationCode,
      });
      toast({
        title: "Settings updated",
        description: "Your currency and location settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to update settings",
        description: "There was an error updating your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle theme change with explicit typing
  const handleThemeChange = (value: string) => {
    setTheme(value as Theme);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Paintbrush className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="currency" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Currency & Location</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.photoURL || `https://ui-avatars.com/api/?name=${displayName}`} alt={displayName} />
                    <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Profile Picture</p>
                    <p className="text-xs text-muted-foreground">
                      Your profile picture is managed by your authentication provider
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={email}
                      disabled
                      placeholder="Your email address"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Preferences Settings */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your app experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={handleThemeChange}>
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePreferences} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Currency & Location Settings */}
        <TabsContent value="currency">
          <Card>
            <CardHeader>
              <CardTitle>Currency & Location</CardTitle>
              <CardDescription>
                Set your base currency and location preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="baseCurrency">Base Currency</Label>
                  <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                    <SelectTrigger id="baseCurrency">
                      <SelectValue placeholder="Select a currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Current Location</Label>
                      <p className="text-sm text-muted-foreground">
                        Your current physical location
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={setLocationFromGPS}
                      disabled={gpsLoading}
                      className="flex items-center gap-2"
                    >
                      {gpsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      Detect Location
                    </Button>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., New York, USA"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="locationCode">Country Code</Label>
                    <Input
                      id="locationCode"
                      value={locationCode}
                      onChange={(e) => setLocationCode(e.target.value)}
                      placeholder="e.g., US"
                      maxLength={2}
                      disabled={!!location}
                    />
                    <p className="text-xs text-muted-foreground">
                      This is automatically set when you select a location.
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tax Residency</Label>
                      <p className="text-sm text-muted-foreground">
                        Your primary tax residence
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="residencyLocation">Location</Label>
                    <Input
                      id="residencyLocation"
                      value={residencyLocation}
                      onChange={(e) => setResidencyLocation(e.target.value)}
                      placeholder="e.g., New York, USA"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="residencyLocationCode">Country Code</Label>
                    <Input
                      id="residencyLocationCode"
                      value={residencyLocationCode}
                      onChange={(e) => setResidencyLocationCode(e.target.value)}
                      placeholder="e.g., US"
                      maxLength={2}
                      disabled={!!residencyLocation}
                    />
                    <p className="text-xs text-muted-foreground">
                      This is automatically set when you select a tax residency.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveCurrency} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 