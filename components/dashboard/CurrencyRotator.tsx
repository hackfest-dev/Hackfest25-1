"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGPSLocation } from '@/hooks/use-gps-location';
import { cn } from "@/lib/utils";

type CountryCode = 'US' | 'CA' | 'GB' | 'EU' | 'JP' | 'CN' | 'KR' | 'IN' | 'AU' | 'RU' | 'BR' | 'ZA';

interface CurrencyInfo {
  symbol: string;
  name: string;
  rotation: number;
  color?: string;
}

// Map of country codes to currency info
const currencyMap: Record<string, CurrencyInfo> = {
  'US': { symbol: "$", name: "USD", rotation: 0, color: "#2563eb" },
  'CA': { symbol: "C$", name: "CAD", rotation: 5, color: "#dc2626" },
  'GB': { symbol: "£", name: "GBP", rotation: -5, color: "#4f46e5" },
  'EU': { symbol: "€", name: "EUR", rotation: 10, color: "#0891b2" },
  'JP': { symbol: "¥", name: "JPY", rotation: -10, color: "#db2777" },
  'CN': { symbol: "¥", name: "CNY", rotation: 15, color: "#ea580c" },
  'KR': { symbol: "₩", name: "KRW", rotation: -15, color: "#4338ca" },
  'IN': { symbol: "₹", name: "INR", rotation: 20, color: "#15803d" },
  'AU': { symbol: "A$", name: "AUD", rotation: -20, color: "#9333ea" },
  'RU': { symbol: "₽", name: "RUB", rotation: 25, color: "#7c2d12" },
  'BR': { symbol: "R$", name: "BRL", rotation: -25, color: "#059669" },
  'ZA': { symbol: "R", name: "ZAR", rotation: 30, color: "#ca8a04" }
};

const defaultCurrency: CurrencyInfo = { symbol: "$", name: "USD", rotation: 0, color: "#2563eb" };

interface CurrencyRotatorProps {
  size?: 'sm' | 'md' | 'lg';
  showInfo?: boolean;
  className?: string;
  values: string[];
  interval?: number;
}

export function CurrencyRotator({
  size = 'md',
  showInfo = true,
  className = '',
  values,
  interval = 3000,
}: CurrencyRotatorProps) {
  const { location, loading, error } = useGPSLocation();
  const [currency, setCurrency] = useState<CurrencyInfo>(defaultCurrency);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);

  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'w-16 h-16',
      symbol: 'text-4xl',
      info: 'text-xs'
    },
    md: {
      container: 'w-24 h-24',
      symbol: 'text-6xl',
      info: 'text-sm'
    },
    lg: {
      container: 'w-32 h-32',
      symbol: 'text-8xl',
      info: 'text-base'
    }
  };

  useEffect(() => {
    const detectLocation = async () => {
      try {
        if (location) {
          console.log('Location detected:', location); // Debug log
          const countryCode = location.country_code.toUpperCase();
          console.log('Country code:', countryCode); // Debug log
          
          if (currencyMap[countryCode]) {
            console.log('Setting currency for:', countryCode); // Debug log
            setCurrency(currencyMap[countryCode]);
          } else {
            console.log('No currency mapping for:', countryCode); // Debug log
            setCurrency(defaultCurrency);
          }
        }
      } catch (error) {
        console.error("Error detecting location:", error);
        setCurrency(defaultCurrency);
      }
    };

    detectLocation();

    const rotationInterval = setInterval(() => {
      setRotation(prev => ({
        x: (prev.x + 0.2) % 360,
        y: (prev.y + 0.1) % 360
      }));
    }, 50);

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % values.length);
    }, interval);

    return () => {
      clearInterval(rotationInterval);
      clearInterval(timer);
    };
  }, [location, values.length, interval]);

  return (
    <div className={cn("relative", className)}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`relative ${sizeClasses[size].container}`}
        style={{ perspective: '1000px' }}
      >
        {/* Background glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-20"
          style={{ backgroundColor: currency.color }}
        />

        {/* Rotating currency symbol */}
        <div 
          className={`absolute inset-0 flex items-center justify-center font-bold transform-gpu ${sizeClasses[size].symbol}`}
          style={{ 
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y + currency.rotation}deg)`,
            color: currency.color,
            textShadow: `0 2px 4px ${currency.color}40`
          }}
        >
          {loading ? '$' : currency.symbol}
        </div>

        {/* Glass effect overlay */}
        <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm" />
      </motion.div>

      {/* Currency Information */}
      {showInfo && location && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mt-4 text-center ${sizeClasses[size].info}`}
        >
          <p className="font-medium text-slate-900">
            {currency.name}
          </p>
          {location && (
            <p className="text-slate-500">
              {location.city}, {location.country}
            </p>
          )}
        </motion.div>
      )}

      <div className={cn("relative h-6 overflow-hidden", className)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {values[currentIndex]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
} 