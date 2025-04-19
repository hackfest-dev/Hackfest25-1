"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import useUserSettings from "@/hooks/use-user-settings";
import { useGPSLocation } from "@/hooks/use-gps-location";
import { COUNTRIES } from "@/lib/countries";
import { CURRENCIES, Currency } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, Save, User, Globe, Shield, Paintbrush, MapPin, 
  Moon, Sun, Monitor, Lock, CreditCard, Home
} from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("profile");

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

  const handleThemeChange = (value: Theme) => {
    setTheme(value);
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      if (value !== "system") {
        root.classList.add(value);
      }
    }
  };

  const handleSaveSettings = async (section: "profile" | "preferences" | "currency" | "location") => {
    if (!user) return;
    setIsUpdating(true);

    try {
      const updates: Record<string, any> = {};
      
      switch (section) {
        case "profile":
          updates.displayName = displayName;
          break;
        case "preferences":
          updates.theme = theme;
          break;
        case "currency":
          updates.baseCurrency = baseCurrency;
          break;
        case "location":
          updates.location = location;
          updates.locationCode = locationCode;
          updates.residencyLocation = residencyLocation;
          updates.residencyLocationCode = residencyLocationCode;
          break;
      }

      await updateSettings(updates);
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account preferences and settings
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Navigation Sidebar */}
            <nav className="md:col-span-3 space-y-1">
              <Button
                variant={activeTab === "profile" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab("profile")}
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
              <Button
                variant={activeTab === "appearance" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab("appearance")}
              >
                <Paintbrush className="h-4 w-4" />
                Appearance
              </Button>
              <Button
                variant={activeTab === "currency" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab("currency")}
              >
                <CreditCard className="h-4 w-4" />
                Currency
              </Button>
              <Button
                variant={activeTab === "location" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab("location")}
              >
                <MapPin className="h-4 w-4" />
                Location
              </Button>
              <Button
                variant={activeTab === "security" ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setActiveTab("security")}
              >
                <Lock className="h-4 w-4" />
                Security
              </Button>
            </nav>

            {/* Content Area */}
            <div className="md:col-span-9">
              <Card className="border-0 shadow-none">
                {/* Profile Section */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-medium">Profile Information</h2>
                      <p className="text-sm text-muted-foreground">
                        Update your personal information and how others see you
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Avatar className="h-16 w-16">
                        <AvatarImage 
                          src={user?.photoURL || `https://ui-avatars.com/api/?name=${displayName}`} 
                          alt={displayName} 
                        />
                        <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{displayName || email}</p>
                        <p className="text-sm text-muted-foreground truncate">{email}</p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your display name"
                          className="max-w-md"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleSaveSettings("profile")}
                      disabled={isUpdating}
                      className="gap-2"
                    >
                      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}

                {/* Appearance Section */}
                {activeTab === "appearance" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-medium">Appearance</h2>
                      <p className="text-sm text-muted-foreground">
                        Customize how SpendX looks on your device
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Theme</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant={theme === "light" ? "secondary" : "outline"}
                            className="gap-2"
                            onClick={() => handleThemeChange("light")}
                          >
                            <Sun className="h-4 w-4" />
                            Light
                          </Button>
                          <Button
                            variant={theme === "dark" ? "secondary" : "outline"}
                            className="gap-2"
                            onClick={() => handleThemeChange("dark")}
                          >
                            <Moon className="h-4 w-4" />
                            Dark
                          </Button>
                          <Button
                            variant={theme === "system" ? "secondary" : "outline"}
                            className="gap-2"
                            onClick={() => handleThemeChange("system")}
                          >
                            <Monitor className="h-4 w-4" />
                            System
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleSaveSettings("preferences")}
                      disabled={isUpdating}
                      className="gap-2"
                    >
                      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}

                {/* Currency Section */}
                {activeTab === "currency" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-medium">Currency Settings</h2>
                      <p className="text-sm text-muted-foreground">
                        Set your preferred currency for transactions and reports
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="currency">Base Currency</Label>
                        <Select
                          value={baseCurrency}
                          onValueChange={setBaseCurrency}
                        >
                          <SelectTrigger className="max-w-md">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <span className="flex items-center gap-2">
                                  <span>{currency.flag}</span>
                                  <span>{currency.name} ({currency.code})</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleSaveSettings("currency")}
                      disabled={isUpdating}
                      className="gap-2"
                    >
                      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}

                {/* Location Section */}
                {activeTab === "location" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-medium">Location Settings</h2>
                      <p className="text-sm text-muted-foreground">
                        Update your current and residency locations
                      </p>
                    </div>

                    <div className="grid gap-6">
                      <div className="grid gap-4">
                        <Label>Current Location</Label>
                        <div className="flex gap-2">
                          <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Enter your current location"
                            className="flex-1 max-w-md"
                          />
                          <Button
                            variant="outline"
                            onClick={setLocationFromGPS}
                            disabled={gpsLoading}
                            className="gap-2"
                          >
                            {gpsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MapPin className="h-4 w-4" />
                            )}
                            Detect
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <Label>Tax Residency</Label>
                        <Select
                          value={residencyLocationCode}
                          onValueChange={setResidencyLocationCode}
                        >
                          <SelectTrigger className="max-w-md">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                <span className="flex items-center gap-2">
                                  <span>{country.flag}</span>
                                  <span>{country.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleSaveSettings("location")}
                      disabled={isUpdating}
                      className="gap-2"
                    >
                      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}

                {/* Security Section */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-medium">Security Settings</h2>
                      <p className="text-sm text-muted-foreground">
                        Manage your account security and authentication
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="grid gap-1">
                          <Label>Two-Factor Authentication</Label>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Switch />
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleSaveSettings("preferences")}
                      disabled={isUpdating}
                      className="gap-2"
                    >
                      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 