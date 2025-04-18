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
import { Loader2, Save, User, Bell, Globe, Shield, Paintbrush, MapPin } from "lucide-react";
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
  const [avatar, setAvatar] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [theme, setTheme] = useState<Theme>("dark");
  const [location, setLocation] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [residencyLocation, setResidencyLocation] = useState("");
  const [residencyLocationCode, setResidencyLocationCode] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [budgetNotifications, setBudgetNotifications] = useState(true);
  const [taxNotifications, setTaxNotifications] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize form with user settings when loaded
  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName || "");
      setAvatar(settings.avatar || "");
      setBaseCurrency(settings.baseCurrency || "USD");
      setTheme((settings.theme as Theme) || "dark");
      setLocation(settings.location || "");
      setLocationCode(settings.locationCode || "");
      setResidencyLocation(settings.residencyLocation || "");
      setResidencyLocationCode(settings.residencyLocationCode || "");
      setEmailNotifications(settings.notificationSettings?.email ?? true);
      setBudgetNotifications(settings.notificationSettings?.budget ?? true);
      setTaxNotifications(settings.notificationSettings?.tax ?? true);
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
        avatar,
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
        theme: theme as "light" | "dark" | "system",
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
        title: "Currency settings updated",
        description: "Your currency and location settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to update currency settings",
        description: "There was an error updating your currency settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsUpdating(true);
      await updateSettings({
        notificationSettings: {
          email: emailNotifications,
          budget: budgetNotifications,
          tax: taxNotifications,
        },
      });
      toast({
        title: "Notification settings updated",
        description: "Your notification settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to update notification settings",
        description: "There was an error updating your notification settings. Please try again.",
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
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
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
                Update your profile information and how others see you in the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatar || `https://ui-avatars.com/api/?name=${displayName}`} />
                    <AvatarFallback>{displayName?.substring(0, 2) || user?.email?.substring(0, 2) || "U"}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                </div>
                <div className="space-y-4 flex-1">
                  <div className="grid gap-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={email}
                      disabled
                      placeholder="Your email"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your email is managed via your authentication provider and cannot be changed here.
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
                Customize your app experience and appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={theme}
                  onValueChange={handleThemeChange}
                >
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
                Set your base currency and current location for accurate financial tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="baseCurrency">Base Currency</Label>
                <Select
                  value={baseCurrency}
                  onValueChange={setBaseCurrency}
                >
                  <SelectTrigger id="baseCurrency">
                    <SelectValue placeholder="Select your base currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency: Currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.flag && <span className="mr-2">{currency.flag}</span>}
                        {currency.code} - {currency.name} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This is the currency all your transactions will be converted to for reporting.
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Current Location</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={setLocationFromGPS} 
                    disabled={gpsLoading}
                    className="flex items-center gap-2"
                  >
                    {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    <span>Use GPS Location</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Bangkok, Thailand"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="locationCode">Country Code</Label>
                    <Input
                      id="locationCode"
                      value={locationCode}
                      onChange={(e) => setLocationCode(e.target.value)}
                      placeholder="e.g., TH"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tax Residency</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="residencyLocation">Tax Residency</Label>
                    <Select
                      value={residencyLocation}
                      onValueChange={(value) => {
                        setResidencyLocation(value);
                        const country = COUNTRIES.find(c => c.name === value);
                        if (country) {
                          setResidencyLocationCode(country.code);
                        }
                      }}
                    >
                      <SelectTrigger id="residencyLocation">
                        <SelectValue placeholder="Select your tax residency" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.name} ({country.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="budgetNotifications">Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you're approaching your budget limits
                    </p>
                  </div>
                  <Switch
                    id="budgetNotifications"
                    checked={budgetNotifications}
                    onCheckedChange={setBudgetNotifications}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="taxNotifications">Tax Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about tax deadlines and obligations
                    </p>
                  </div>
                  <Switch
                    id="taxNotifications"
                    checked={taxNotifications}
                    onCheckedChange={setTaxNotifications}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} disabled={isUpdating}>
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
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and authentication options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Password</h3>
                <p className="text-sm text-muted-foreground">
                  Password management is handled through your authentication provider.
                </p>
                <Button variant="outline">
                  Reset Password
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Your account is currently authenticated via Firebase.
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Account Deletion</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data.
                </p>
                <Button variant="destructive">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 