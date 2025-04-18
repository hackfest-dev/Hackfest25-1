import { 
  Banknote, 
  UtensilsCrossed, 
  Car, 
  Home, 
  Film, 
  ShoppingBag, 
  Activity, 
  Plane, 
  GraduationCap, 
  Scissors, 
  Briefcase, 
  Gift, 
  Receipt, 
  Wallet, 
  HelpCircle,
  LucideIcon
} from 'lucide-react';

// Transaction categories
export const CATEGORIES = {
  INCOME: 'Income',
  FOOD: 'Food & Dining',
  TRANSPORTATION: 'Transportation',
  HOUSING: 'Housing & Utilities',
  ENTERTAINMENT: 'Entertainment',
  SHOPPING: 'Shopping',
  HEALTH: 'Health & Medical',
  TRAVEL: 'Travel',
  EDUCATION: 'Education',
  PERSONAL: 'Personal Care',
  BUSINESS: 'Business',
  GIFTS: 'Gifts & Donations',
  TAXES: 'Taxes',
  INVESTMENTS: 'Investments',
  OTHER: 'Other',
};

// Keywords to help automatically categorize transactions
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  [CATEGORIES.INCOME]: [
    'salary', 'payroll', 'deposit', 'income', 'revenue', 'wage', 'dividend', 'interest',
  ],
  [CATEGORIES.FOOD]: [
    'restaurant', 'cafe', 'coffee', 'grocery', 'food', 'meal', 'dinner', 'lunch',
    'breakfast', 'bakery', 'bar', 'pub', 'supermarket', 'takeout', 'delivery',
  ],
  [CATEGORIES.TRANSPORTATION]: [
    'gas', 'fuel', 'parking', 'uber', 'lyft', 'taxi', 'train', 'transit', 'bus',
    'subway', 'toll', 'car', 'vehicle', 'auto', 'transport',
  ],
  [CATEGORIES.HOUSING]: [
    'rent', 'mortgage', 'housing', 'apartment', 'utility', 'electric', 'water', 'gas',
    'internet', 'wifi', 'cable', 'home', 'furniture',
  ],
  [CATEGORIES.ENTERTAINMENT]: [
    'movie', 'theatre', 'concert', 'show', 'music', 'spotify', 'netflix', 'hulu',
    'disney', 'amazon prime', 'streaming', 'game', 'entertainment',
  ],
  [CATEGORIES.SHOPPING]: [
    'amazon', 'ebay', 'walmart', 'target', 'shop', 'store', 'mall', 'purchase',
    'clothing', 'apparel', 'shoes', 'electronics',
  ],
  [CATEGORIES.HEALTH]: [
    'doctor', 'medical', 'health', 'clinic', 'hospital', 'pharmacy', 'drug',
    'dental', 'dentist', 'fitness', 'gym', 'insurance',
  ],
  [CATEGORIES.TRAVEL]: [
    'hotel', 'flight', 'airline', 'airbnb', 'vacation', 'travel', 'booking',
    'lodging', 'resort', 'trip',
  ],
  [CATEGORIES.EDUCATION]: [
    'school', 'college', 'university', 'tuition', 'education', 'course', 'book',
    'class', 'seminar', 'workshop', 'student',
  ],
  [CATEGORIES.PERSONAL]: [
    'salon', 'spa', 'haircut', 'beauty', 'barber', 'personal', 'care', 'grooming',
  ],
  [CATEGORIES.BUSINESS]: [
    'business', 'office', 'supplies', 'workspace', 'advertising', 'marketing',
    'consulting', 'professional', 'service',
  ],
  [CATEGORIES.GIFTS]: [
    'gift', 'donation', 'charity', 'present', 'contribute', 'fundraiser',
  ],
  [CATEGORIES.TAXES]: [
    'tax', 'irs', 'government', 'fee',
  ],
  [CATEGORIES.INVESTMENTS]: [
    'investment', 'stock', 'bond', 'etf', 'fund', 'crypto', 'bitcoin', 'trading',
    'broker', 'securities',
  ],
};

/**
 * Guesses a transaction category based on its description
 */
export function guessCategory(description: string): string {
  if (!description) return CATEGORIES.OTHER;
  
  const normalizedDesc = description.toLowerCase();
  
  // Special handling for income transactions
  if (normalizedDesc.includes('income') || normalizedDesc.includes('salary')) {
    return CATEGORIES.INCOME;
  }
  
  // Check other categories by keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedDesc.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return CATEGORIES.OTHER;
}

/**
 * Returns all available categories as an array
 */
export function getAllCategories(): string[] {
  return Object.values(CATEGORIES);
}

/**
 * Groups transactions by category and returns total for each
 */
export function groupTransactionsByCategory(transactions: any[]) {
  const grouped: Record<string, number> = {};

  // Initialize all categories with 0
  Object.values(CATEGORIES).forEach(category => {
    grouped[category] = 0;
  });

  // Sum up transactions by category
  transactions.forEach(transaction => {
    const category = transaction.category || CATEGORIES.OTHER;
    grouped[category] = (grouped[category] || 0) + transaction.amount;
  });

  return grouped;
}

/**
 * Returns a color for each category
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    [CATEGORIES.INCOME]: '#4CAF50',            // Green
    [CATEGORIES.FOOD]: '#FF9800',              // Orange  
    [CATEGORIES.TRANSPORTATION]: '#2196F3',    // Blue
    [CATEGORIES.HOUSING]: '#9C27B0',           // Purple
    [CATEGORIES.ENTERTAINMENT]: '#F44336',     // Red
    [CATEGORIES.SHOPPING]: '#E91E63',          // Pink
    [CATEGORIES.HEALTH]: '#00BCD4',            // Cyan
    [CATEGORIES.TRAVEL]: '#3F51B5',            // Indigo
    [CATEGORIES.EDUCATION]: '#FFEB3B',         // Yellow
    [CATEGORIES.PERSONAL]: '#009688',          // Teal
    [CATEGORIES.BUSINESS]: '#607D8B',          // Blue Gray
    [CATEGORIES.GIFTS]: '#8BC34A',             // Light Green
    [CATEGORIES.TAXES]: '#795548',             // Brown
    [CATEGORIES.INVESTMENTS]: '#673AB7',       // Deep Purple
    [CATEGORIES.OTHER]: '#9E9E9E',             // Gray
  };

  return colors[category] || colors[CATEGORIES.OTHER];
}

/**
 * Returns a Lucide icon component based on the category
 */
export function getCategoryIcon(category: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    [CATEGORIES.INCOME]: Banknote,
    [CATEGORIES.FOOD]: UtensilsCrossed,
    [CATEGORIES.TRANSPORTATION]: Car,
    [CATEGORIES.HOUSING]: Home,
    [CATEGORIES.ENTERTAINMENT]: Film,
    [CATEGORIES.SHOPPING]: ShoppingBag,
    [CATEGORIES.HEALTH]: Activity,
    [CATEGORIES.TRAVEL]: Plane,
    [CATEGORIES.EDUCATION]: GraduationCap,
    [CATEGORIES.PERSONAL]: Scissors,
    [CATEGORIES.BUSINESS]: Briefcase,
    [CATEGORIES.GIFTS]: Gift,
    [CATEGORIES.TAXES]: Receipt,
    [CATEGORIES.INVESTMENTS]: Wallet,
    [CATEGORIES.OTHER]: HelpCircle,
  };

  return icons[category] || icons[CATEGORIES.OTHER];
} 