import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface CountryTaxRule {
  country: string;
  countryCode: string;
  flagEmoji: string;
  taxYear: string;
  fiscalYearStart?: string;
  residencyThresholdDays: number;
  description: string;
  taxFilingMonth: number;
  taxFilingDay: number;
  specialRules?: string[];
  currencyCode: string;
  hasIncomeThreshold: boolean;
  incomeThresholdAmount?: number;
  incomeThresholdCurrency?: string;
  taxTreaties?: string[];
  hasTaxationTypes?: {
    worldwide: boolean;
    territorial: boolean;
    remittance: boolean;
  };
}

// Default Tax Rules for some common countries (for demo/fallback)
const DEFAULT_TAX_RULES: Record<string, CountryTaxRule> = {
  'US': {
    country: 'United States',
    countryCode: 'US',
    flagEmoji: '🇺🇸',
    taxYear: 'calendar',
    residencyThresholdDays: 183,
    description: 'US citizens are taxed on worldwide income regardless of residence. Non-US citizens may be subject to tax if they meet the Substantial Presence Test.',
    taxFilingMonth: 4,
    taxFilingDay: 15,
    specialRules: [
      'Substantial Presence Test',
      'Foreign Earned Income Exclusion',
      'Foreign Tax Credit',
      'FBAR filing requirements'
    ],
    currencyCode: 'USD',
    hasIncomeThreshold: true,
    incomeThresholdAmount: 12550,
    incomeThresholdCurrency: 'USD',
    taxTreaties: ['UK', 'CA', 'DE', 'FR', 'JP'],
    hasTaxationTypes: {
      worldwide: true,
      territorial: false,
      remittance: false
    }
  },
  'UK': {
    country: 'United Kingdom',
    countryCode: 'UK',
    flagEmoji: '🇬🇧',
    taxYear: 'fiscal',
    fiscalYearStart: '04-06',
    residencyThresholdDays: 183,
    description: 'UK residents are typically taxed on worldwide income, with non-domiciled residents having the option for the remittance basis of taxation.',
    taxFilingMonth: 1,
    taxFilingDay: 31,
    specialRules: [
      'Statutory Residence Test',
      'Remittance basis taxation for non-domiciles',
      'UK/US dual taxation treaty'
    ],
    currencyCode: 'GBP',
    hasIncomeThreshold: true,
    incomeThresholdAmount: 12570,
    incomeThresholdCurrency: 'GBP',
    taxTreaties: ['US', 'CA', 'DE', 'FR', 'JP'],
    hasTaxationTypes: {
      worldwide: true,
      territorial: false,
      remittance: true
    }
  },
  'PT': {
    country: 'Portugal',
    countryCode: 'PT',
    flagEmoji: '🇵🇹',
    taxYear: 'calendar',
    residencyThresholdDays: 183,
    description: 'Portugal offers the Non-Habitual Resident (NHR) regime which provides tax benefits for new residents for 10 years.',
    taxFilingMonth: 6,
    taxFilingDay: 30,
    specialRules: [
      'Non-Habitual Resident (NHR) regime',
      'Reduced tax rates for certain professions',
      'Foreign pension income can be exempt under NHR'
    ],
    currencyCode: 'EUR',
    hasIncomeThreshold: false,
    taxTreaties: ['US', 'UK', 'DE', 'ES', 'FR'],
    hasTaxationTypes: {
      worldwide: true,
      territorial: false,
      remittance: false
    }
  },
  'TH': {
    country: 'Thailand',
    countryCode: 'TH',
    flagEmoji: '🇹🇭',
    taxYear: 'calendar',
    residencyThresholdDays: 180,
    description: 'Thailand taxes residents on income from Thailand sources. Foreign-source income is only taxed if remitted to Thailand in the same year it is earned.',
    taxFilingMonth: 3,
    taxFilingDay: 31,
    specialRules: [
      'Foreign-source income only taxed if remitted in the same year',
      'Progressive income tax rates from 0-35%'
    ],
    currencyCode: 'THB',
    hasIncomeThreshold: true,
    incomeThresholdAmount: 150000,
    incomeThresholdCurrency: 'THB',
    taxTreaties: ['US', 'UK', 'DE', 'FR', 'JP'],
    hasTaxationTypes: {
      worldwide: false,
      territorial: true,
      remittance: true
    }
  }
};

export default function useCountryTaxRules() {
  const [rules, setRules] = useState<Record<string, CountryTaxRule>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch all tax rules
  const fetchAllRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/tax-rules');
      
      if (response.data && response.data.taxRules) {
        // Convert array to a map for easier lookup
        const rulesMap: Record<string, CountryTaxRule> = {};
        response.data.taxRules.forEach((rule: CountryTaxRule) => {
          rulesMap[rule.countryCode] = rule;
        });
        
        // If we don't have any rules in the database yet, use our defaults
        if (Object.keys(rulesMap).length === 0) {
          setRules(DEFAULT_TAX_RULES);
        } else {
          setRules(rulesMap);
        }
      } else {
        setRules(DEFAULT_TAX_RULES);
      }
    } catch (err: any) {
      console.error('Error fetching tax rules:', err);
      setError(err);
      // Use defaults as fallback
      setRules(DEFAULT_TAX_RULES);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch tax rules for a specific country
  const fetchCountryRules = useCallback(async (countryCode: string) => {
    // If we already have it in our cache, return it
    if (rules[countryCode]) {
      return rules[countryCode];
    }
    
    // Check if we have a default for this country
    if (DEFAULT_TAX_RULES[countryCode]) {
      // Add to our state
      setRules(prev => ({
        ...prev,
        [countryCode]: DEFAULT_TAX_RULES[countryCode]
      }));
      
      return DEFAULT_TAX_RULES[countryCode];
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/tax-rules?countryCode=${countryCode}`);
      
      if (response.data && !response.data.error) {
        // Add to our cache
        setRules(prev => ({
          ...prev,
          [countryCode]: response.data
        }));
        
        return response.data;
      }
      
      return null;
    } catch (err: any) {
      console.error(`Error fetching tax rules for ${countryCode}:`, err);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [rules]);
  
  // Add a new tax rule (admin function)
  const addTaxRule = useCallback(async (rule: Omit<CountryTaxRule, '_id'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/tax-rules', rule);
      
      if (response.data && !response.data.error) {
        // Add to our cache
        setRules(prev => ({
          ...prev,
          [rule.countryCode]: rule
        }));
        
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to add tax rule');
      }
    } catch (err: any) {
      console.error('Error adding tax rule:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Get the next tax filing date for a country
  const getNextFilingDate = useCallback((countryCode: string) => {
    const rule = rules[countryCode] || DEFAULT_TAX_RULES[countryCode];
    
    if (!rule) return null;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Create the filing date for this year
    const thisYearDate = new Date(currentYear, rule.taxFilingMonth - 1, rule.taxFilingDay);
    
    // If this year's date is in the future, return it
    if (thisYearDate > now) {
      return thisYearDate;
    }
    
    // Otherwise, return next year's date
    return new Date(currentYear + 1, rule.taxFilingMonth - 1, rule.taxFilingDay);
  }, [rules]);
  
  // Load all rules on mount
  useEffect(() => {
    fetchAllRules();
  }, [fetchAllRules]);
  
  return {
    rules,
    DEFAULT_TAX_RULES,
    loading,
    error,
    fetchAllRules,
    fetchCountryRules,
    addTaxRule,
    getNextFilingDate
  };
} 