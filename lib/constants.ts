import { 
  ShoppingBag, 
  Coffee, 
  Car, 
  Home, 
  Plane, 
  Smartphone, 
  Zap, 
  AlertTriangle,
  MoreVertical,
  Brain,
  Wallet,
  Tag,
  Calendar,
  TrendingDown,
  ArrowRight,
  CreditCard,
  Receipt,
  Banknote,
  Building
} from "lucide-react";

export const CATEGORIES = {
  "Food & Dining": {
    name: "Food & Dining",
    icon: Coffee,
    color: "#FF6B6B",
    description: "Restaurants, groceries, and food delivery"
  },
  "Transportation": {
    name: "Transportation",
    icon: Car,
    color: "#4ECDC4",
    description: "Gas, public transit, and vehicle maintenance"
  },
  "Housing": {
    name: "Housing",
    icon: Home,
    color: "#45B7D1",
    description: "Rent, mortgage, and utilities"
  },
  "Travel": {
    name: "Travel",
    icon: Plane,
    color: "#96CEB4",
    description: "Flights, hotels, and vacation expenses"
  },
  "Utilities": {
    name: "Utilities",
    icon: Zap,
    color: "#FFEEAD",
    description: "Electricity, water, and internet"
  },
  "Shopping": {
    name: "Shopping",
    icon: ShoppingBag,
    color: "#D4A5A5",
    description: "Clothing, electronics, and general shopping"
  },
  "Entertainment": {
    name: "Entertainment",
    icon: Smartphone,
    color: "#9B59B6",
    description: "Streaming services, games, and events"
  },
  "Healthcare": {
    name: "Healthcare",
    icon: AlertTriangle,
    color: "#E74C3C",
    description: "Medical expenses and insurance"
  },
  "Personal Care": {
    name: "Personal Care",
    icon: MoreVertical,
    color: "#3498DB",
    description: "Grooming, fitness, and wellness"
  },
  "Education": {
    name: "Education",
    icon: Brain,
    color: "#2ECC71",
    description: "Tuition, books, and courses"
  },
  "Financial": {
    name: "Financial",
    icon: Wallet,
    color: "#F1C40F",
    description: "Bank fees, investments, and insurance"
  },
  "Other": {
    name: "Other",
    icon: Tag,
    color: "#95A5A6",
    description: "Miscellaneous expenses"
  }
} as const;

export const DATE_RANGES = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "Last year",
  "all": "All time"
} as const;

export const CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  INR: { symbol: "₹", name: "Indian Rupee" }
} as const;

export const DEFAULT_CURRENCY = "USD";

export const FINANCIAL_HEALTH_SCORE_WEIGHTS = {
  savingsRate: 0.3,
  debtToIncome: 0.3,
  emergencyFund: 0.4
} as const;

export const EMERGENCY_FUND_TARGET_MONTHS = 6; 