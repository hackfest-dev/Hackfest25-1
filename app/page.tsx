"use client";

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, CreditCard, Globe, Shield, Sparkles, ChevronDown, Menu } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useGPSLocation } from '@/hooks/use-gps-location'
import { motion } from "framer-motion"
import { CurrencyRotator } from "@/components/dashboard/CurrencyRotator"

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLocationPrompt(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        if (location && currencyMap[location.country as CountryCode]) {
          setCurrency(currencyMap[location.country as CountryCode]);
        }
      } catch (error) {
        console.error("Error detecting location:", error);
      }
    };

    detectLocation();

    const rotationInterval = setInterval(() => {
      setRotation(prev => ({
        x: (prev.x + 0.2) % 360,
        y: (prev.y + 0.1) % 360
      }));
    }, 50);

    return () => clearInterval(rotationInterval);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-white selection:bg-blue-100">
      {/* Enhanced Navbar */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b border-slate-100 backdrop-blur-lg sticky top-0 z-50 bg-white/80"
      >
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 transition-transform group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg blur-sm opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative flex items-center justify-center w-full h-full bg-white rounded-lg border border-slate-100 shadow-sm">
                <span className="text-blue-600 font-bold text-lg">S</span>
              </div>
            </div>
            <span className="font-semibold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">SpendX</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Login'].map((item) => (
              <Link 
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform"
              >
                {item}
            </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/register">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all"
              >
                Sign Up
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div 
          initial={false}
          animate={{ height: isMenuOpen ? 'auto' : 0 }}
          className="md:hidden overflow-hidden bg-white border-t border-slate-100"
        >
          <nav className="flex flex-col p-4 space-y-4">
            {['Features', 'How It Works', 'Login'].map((item) => (
              <Link 
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50"
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <Separator className="bg-slate-100" />
            <Link 
              href="/register" 
              className="block"
              onClick={() => setIsMenuOpen(false)}
            >
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                Sign Up
              </Button>
            </Link>
          </nav>
        </motion.div>
      </motion.header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 relative overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-50 opacity-50"></div>
            <div className="absolute inset-0 grid grid-cols-[repeat(40,1fr)] grid-rows-[repeat(20,1fr)] opacity-[0.015]">
            {Array(800).fill(0).map((_, i) => (
                <div key={i} className="border-r border-t border-slate-900"></div>
            ))}
            </div>
          </div>
          
          {/* Currency Rotator Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 scale-125 pointer-events-none z-0">
            <CurrencyRotator 
              size="lg" 
              showInfo={false} 
              values={["$100.00", "€85.00", "£75.00", "¥11,000"]} 
            />
          </div>

          {/* Hero Content */}
          <div className="container px-4 relative z-10">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto"
            >
              <Badge 
                variant="outline" 
                className="text-sm font-medium py-1 px-3 border-blue-200 bg-blue-50 text-blue-600"
              >
                Multi-Currency Budgeting for Digital Nomads
            </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight relative">
                Your Global{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                  Financial HQ
                </span>
            </h1>

              <p className="text-lg text-slate-600 max-w-[42rem] leading-relaxed relative">
                Manage your finances across borders with confidence. Track expenses in multiple currencies, 
                monitor tax obligations, and make smarter relocation decisions.
              </p>

              <motion.div 
                className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <Link href="/register" className="w-full">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all" 
                    size="lg"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
                <Link href="#features" className="w-full">
                  <Button 
                    variant="outline" 
                    className="w-full border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600" 
                    size="lg"
                  >
                    Learn More
                </Button>
              </Link>
              </motion.div>
            </motion.div>
        </div>

          {/* Enhanced scroll indicator */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
          >
            <span className="text-xs text-slate-500 mb-2 tracking-wider uppercase">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className="h-5 w-5 text-slate-400" />
            </motion.div>
          </motion.div>
      </section>

      {/* Features Section */}
        <section id="features" className="py-20 bg-gradient-to-b from-white to-slate-50">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="container px-4"
          >
            <div className="flex flex-col items-center text-center space-y-4 mb-16">
              <Badge 
                variant="outline" 
                className="text-sm font-medium py-1 px-3 border-blue-200 bg-blue-50 text-blue-600"
              >
                Features
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Essential Tools for Digital Nomads
              </h2>
              <p className="text-slate-600 max-w-[42rem]">
                SpendX provides the features you need to manage your global finances with ease.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: CreditCard,
                  title: "Real-Time Currency Conversion",
                  description: "Set your base currency and instantly see all transactions converted, no matter where you spend."
                },
                {
                  icon: Globe,
                  title: "Location-Based Insights",
                  description: "Auto-tag expenses by location and visualize spending patterns on a global map."
                },
                {
                  icon: Shield,
                  title: "Tax Obligation Tracker",
                  description: "Get alerts for approaching tax thresholds and deadlines in any country you visit."
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="group bg-white/50 backdrop-blur-sm border-slate-200/50 hover:border-blue-200/50 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <feature.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-slate-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                      <p className="text-slate-600 leading-relaxed">
                        {feature.description}
                  </p>
                </CardContent>
              </Card>
                </motion.div>
              ))}
          </div>
          </motion.div>
      </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-white">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="container px-4"
          >
            <div className="flex flex-col items-center text-center space-y-4 mb-16">
              <Badge 
                variant="outline" 
                className="text-sm font-medium py-1 px-3 border-blue-200 bg-blue-50 text-blue-600"
              >
                Process
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                How SpendX Works
              </h2>
              <p className="text-slate-600 max-w-[42rem]">
                A simple workflow designed for your nomadic lifestyle.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Set Your Base Currency",
                  description: "Choose your home currency to ensure all your finances align with your long-term goals.",
                  symbol: "$"
                },
                {
                  step: "2",
                  title: "Track Local Expenses",
                  description: "Log expenses in any local currency while traveling, with automatic conversion.",
                  symbol: "€"
                },
                {
                  step: "3",
                  title: "Monitor & Plan",
                  description: "Get insights on spending patterns and tax implications to make informed decisions.",
                  symbol: "¥"
                }
              ].map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center text-center space-y-4"
                >
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 bg-blue-100 rounded-2xl rotate-3"></div>
                    <div className="absolute inset-0 bg-blue-50 rounded-2xl -rotate-3"></div>
                    <div className="relative h-full w-full rounded-2xl bg-white border border-blue-200 flex items-center justify-center">
                      <span className="text-xl font-bold text-blue-600">{step.step}</span>
                      <span className="absolute -bottom-1 -right-1 text-2xl text-blue-300 opacity-50">
                        {step.symbol}
                      </span>
              </div>
              </div>
                  <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="container px-4"
          >
            <div className="flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50"></div>
                <div className="relative bg-white rounded-full p-4 shadow-sm">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Ready to Simplify Your Global Finances?
              </h2>
              <p className="text-slate-600 max-w-[42rem] leading-relaxed">
                Join thousands of digital nomads using SpendX to make smarter financial decisions, 
                no matter where they are.
              </p>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
              <Link href="/register">
                  <Button 
                    size="lg" 
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
                  >
                  Create Your Account
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
              </motion.div>
          </div>
          </motion.div>
      </section>

      {/* Footer */}
        <footer className="border-t border-slate-100 py-8 bg-white">
          <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-6 h-6">
                    <div className="absolute inset-0 bg-blue-100 rounded-lg blur-sm group-hover:bg-blue-200 transition-colors"></div>
                    <div className="relative flex items-center justify-center w-full h-full bg-white rounded-lg border border-slate-100">
                      <span className="text-blue-600 font-bold text-xs">S</span>
                    </div>
                </div>
                  <span className="font-medium text-slate-900">SpendX</span>
                </Link>
              <Separator orientation="vertical" className="h-4 mx-2 bg-slate-200" />
                <span className="text-sm text-slate-500">© 2025 SpendX. All rights reserved.</span>
            </div>
            <nav className="flex gap-6">
                {['Terms', 'Privacy', 'Contact'].map((item) => (
                  <Link
                    key={item}
                    href="#"
                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {item}
              </Link>
                ))}
            </nav>
          </div>
        </div>
      </footer>
      </main>
    </div>
  );
}

