"use client";

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, CreditCard, Globe, Shield, Sparkles, ChevronDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useGPSLocation } from '@/hooks/use-gps-location'

// Define country code type to fix TypeScript errors
type CountryCode = 'US' | 'CA' | 'GB' | 'EU' | 'JP' | 'CN' | 'KR' | 'IN' | 'AU' | 'RU' | 'BR' | 'ZA';

// Currency symbols mapped to countries
const currencyMap = {
  US: { symbol: "$", name: "USD", rotation: 0 },
  CA: { symbol: "C$", name: "CAD", rotation: 5 },
  GB: { symbol: "£", name: "GBP", rotation: -5 },
  EU: { symbol: "€", name: "EUR", rotation: 10 },
  JP: { symbol: "¥", name: "JPY", rotation: -10 },
  CN: { symbol: "¥", name: "CNY", rotation: 15 },
  KR: { symbol: "₩", name: "KRW", rotation: -15 },
  IN: { symbol: "₹", name: "INR", rotation: 20 },
  AU: { symbol: "A$", name: "AUD", rotation: -20 },
  RU: { symbol: "₽", name: "RUB", rotation: 25 },
  BR: { symbol: "R$", name: "BRL", rotation: -25 },
  ZA: { symbol: "R", name: "ZAR", rotation: 30 },
};

// Default currency if country detection fails
const defaultCurrency = { symbol: "$", name: "USD", rotation: 0 };

export default function LandingPage() {
  const { location, error, loading } = useGPSLocation();
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Show location prompt after a short delay
    const timer = setTimeout(() => {
      setShowLocationPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Function to detect user's country by IP and set currency
    const detectLocation = async () => {
      try {
        if (location && currencyMap[location.country as CountryCode]) {
          setCurrency(currencyMap[location.country as CountryCode]);
          console.log(`Detected location: ${location.city}, ${location.country}, Currency: ${currencyMap[location.country as CountryCode].name}`);
        } else {
          console.log(`Using default currency. Detected: ${location?.country || 'unknown'}`);
        }
      } catch (error) {
        console.error("Error detecting location:", error);
      }
    };

    detectLocation();

    // Add rotation animation effect
    const rotationInterval = setInterval(() => {
      setRotation(prev => ({
        x: (prev.x + 0.5) % 360,
        y: (prev.y + 0.3) % 360
      }));
    }, 50);

    return () => {
      clearInterval(rotationInterval);
    };
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Navbar */}
      <header className="border-b border-slate-200 backdrop-blur-sm sticky top-0 z-50 bg-white/95">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-slate-900/10 rounded-full blur-sm"></div>
              <div className="relative flex items-center justify-center w-full h-full bg-white rounded-full border border-slate-200">
                <span className="text-slate-900 font-bold text-lg">S</span>
              </div>
            </div>
            <span className="font-semibold text-xl">SpendX</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              How It Works
            </Link>
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Login
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/register" className="hidden sm:block">
              <Button variant="outline" size="sm" className="border-slate-300 hover:bg-slate-100 text-slate-900">Sign Up</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">Login</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with 3D Currency Symbol */}
        <section className="py-24 md:py-32 lg:py-40 relative overflow-hidden">
          {/* Animated background grid */}
          <div className="absolute inset-0 grid grid-cols-[repeat(40,1fr)] grid-rows-[repeat(20,1fr)] opacity-[0.03]">
            {Array(800).fill(0).map((_, i) => (
              <div key={i} className="border-r border-t border-slate-300"></div>
            ))}
          </div>
          
          {/* 3D Rotating Currency Symbol */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ perspective: '1000px' }}
          >
            <div className="relative">
              {/* Drop shadow effect */}
              <div 
                className="absolute inset-0 text-[300px] font-bold opacity-10 select-none transform-gpu blur-md text-slate-400"
                style={{ 
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y + (currency.rotation || 0)}deg) translateZ(-10px)`,
                }}
              >
                {loading ? '$' : currency.symbol}
              </div>
              
              {/* Gradient overlay for 3D effect */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-100 opacity-30 mix-blend-overlay"
                style={{ 
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y + (currency.rotation || 0)}deg)`,
                }}
              ></div>
              
              {/* Main currency symbol */}
              <div 
                className="text-[300px] font-bold select-none transform-gpu"
                style={{ 
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y + (currency.rotation || 0)}deg)`,
                  color: 'rgba(15, 23, 42, 0.15)',
                  textShadow: '0 4px 8px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {loading ? '$' : currency.symbol}
              </div>
            </div>
          </div>
          
          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
              <Badge variant="outline" className="text-sm font-medium py-1 px-3 border-slate-200 text-slate-600">
                Multi-Currency Budgeting for Digital Nomads
            </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
                Your Global <span className="text-slate-900">Financial HQ</span>
            </h1>
              <p className="text-lg text-slate-600 max-w-[42rem]">
                Manage your finances across borders with confidence. Track expenses in multiple currencies, monitor tax obligations, and make smarter relocation decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Link href="/register" className="w-full">
                  <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" size="lg">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
                <Link href="#features" className="w-full">
                  <Button variant="outline" className="w-full border-slate-300 hover:bg-slate-100 text-slate-900" size="lg">
                    Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
            <span className="text-xs text-slate-500 mb-2">Scroll to explore</span>
            <ChevronDown className="h-5 w-5 text-slate-500 animate-bounce" />
          </div>
      </section>

      {/* Features Section */}
        <section id="features" className="py-20 bg-slate-100/80">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tighter">
                Essential Tools for Digital Nomads
              </h2>
              <p className="text-slate-600 max-w-[42rem]">
                SpendX provides the features you need to manage your global finances with ease.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CreditCard className="h-10 w-10 text-slate-900 mb-2" />
                  <CardTitle className="text-slate-900">Real-Time Currency Conversion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Set your base currency and instantly see all transactions converted, no matter where you spend.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <Globe className="h-10 w-10 text-slate-900 mb-2" />
                  <CardTitle className="text-slate-900">Location-Based Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Auto-tag expenses by location and visualize spending patterns on a global map.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <Shield className="h-10 w-10 text-slate-900 mb-2" />
                  <CardTitle className="text-slate-900">Tax Obligation Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Get alerts for approaching tax thresholds and deadlines in any country you visit.
                  </p>
                </CardContent>
              </Card>
          </div>
        </div>
      </section>

        {/* How It Works Section with Currency Icons */}
        <section id="how-it-works" className="py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tighter">
                How SpendX Works
              </h2>
              <p className="text-slate-600 max-w-[42rem]">
                A simple workflow designed for your nomadic lifestyle.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-900 border border-slate-200 relative overflow-hidden">
                  <span className="relative z-10 font-bold text-xl">1</span>
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-3xl opacity-15">$</div>
              </div>
                <h3 className="text-xl font-semibold">Set Your Base Currency</h3>
                <p className="text-slate-600">
                  Choose your home currency to ensure all your finances align with your long-term goals.
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-900 border border-slate-200 relative overflow-hidden">
                  <span className="relative z-10 font-bold text-xl">2</span>
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-3xl opacity-15">€</div>
              </div>
                <h3 className="text-xl font-semibold">Track Local Expenses</h3>
                <p className="text-slate-600">
                  Log expenses in any local currency while traveling, with automatic conversion.
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-900 border border-slate-200 relative overflow-hidden">
                  <span className="relative z-10 font-bold text-xl">3</span>
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-3xl opacity-15">¥</div>
                </div>
                <h3 className="text-xl font-semibold">Monitor & Plan</h3>
                <p className="text-slate-600">
                  Get insights on spending patterns and tax implications to make informed decisions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 border-t border-slate-200 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
              <div className="relative h-16 w-16 flex items-center justify-center">
                <Sparkles className="h-12 w-12 text-slate-900" />
                <div className="absolute -right-3 -bottom-2 bg-slate-100 rounded-full h-8 w-8 flex items-center justify-center border border-slate-200 text-slate-700 text-lg font-medium">
                  {currency.symbol}
                </div>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter">
                Ready to Simplify Your Global Finances?
              </h2>
              <p className="text-slate-600 max-w-[42rem]">
                Join thousands of digital nomads using SpendX to make smarter financial decisions, no matter where they are.
              </p>
              <Link href="/register">
                <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800">
                  Create Your Account
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 md:py-8">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 bg-slate-900/10 rounded-full blur-sm"></div>
                <div className="relative flex items-center justify-center w-full h-full bg-white rounded-full border border-slate-200">
                  <span className="text-slate-900 font-bold text-xs">S</span>
                </div>
              </div>
              <span className="font-medium">SpendX</span>
              <Separator orientation="vertical" className="h-4 mx-2 bg-slate-200" />
              <span className="text-sm text-slate-500">© 2023 SpendX. All rights reserved.</span>
            </div>
            <nav className="flex gap-6">
              <Link href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
