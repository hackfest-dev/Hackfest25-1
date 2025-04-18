import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export interface TaxProfileData {
  _id?: string;
  userId: string;
  taxHome: string;
  taxHomeCode: string;
  citizenship: string[];
  additionalTaxObligations: Array<{
    country: string;
    countryCode: string;
    reason: string;
  }>;
  declareTaxIn: string[];
  userSettings: {
    baseYear: number;
    homeFilingDate?: Date | string;
    preferredCurrency: string;
    trackIncome: boolean;
  };
}

export interface TaxRuleData {
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

interface ResidencyStatus {
  country: string;
  countryCode: string;
  flagEmoji: string;
  daysPresent: number;
  threshold: number;
  percentage: number;
  status: string;
  alert: boolean;
  daysRemaining: number;
}

interface TaxObligationResponse {
  profile: TaxProfileData | null;
  taxRules: Record<string, TaxRuleData>;
  residencyStatus: ResidencyStatus[];
  hasProfile: boolean;
  loading: boolean;
  error: Error | null;
}

export default function useTaxProfile() {
  const { user } = useAuth();
  const [taxProfile, setTaxProfile] = useState<TaxProfileData | null>(null);
  const [taxRules, setTaxRules] = useState<Record<string, TaxRuleData>>({});
  const [residencyStatus, setResidencyStatus] = useState<ResidencyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user tax profile and relevant tax rules
  const fetchTaxProfile = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user tax profile
      try {
        const profileResponse = await axios.get(`/api/user-tax-profile?userId=${user.uid}`);
        
        if (profileResponse.data && !profileResponse.data.error) {
          setTaxProfile(profileResponse.data);
          
          // If we have a tax profile, fetch tax rules for relevant countries
          const relevantCountries = [
            profileResponse.data.taxHomeCode,
            ...profileResponse.data.citizenship.map((c: string) => c),
            ...profileResponse.data.additionalTaxObligations.map((o: any) => o.countryCode),
            ...profileResponse.data.declareTaxIn
          ].filter((c: string, i: number, self: string[]) => self.indexOf(c) === i); // Remove duplicates
          
          // Fetch tax rules for each country
          const rulesPromises = relevantCountries.map((countryCode: string) => 
            axios.get(`/api/tax-rules?countryCode=${countryCode}`)
          );
          
          const rulesResponses = await Promise.all(rulesPromises);
          
          // Build tax rules object
          const taxRulesObj: Record<string, TaxRuleData> = {};
          rulesResponses.forEach(response => {
            if (response.data && !response.data.error && response.data.countryCode) {
              taxRulesObj[response.data.countryCode] = response.data;
            }
          });
          
          setTaxRules(taxRulesObj);
          
          // Calculate residency status
          await calculateResidencyStatus(profileResponse.data, taxRulesObj);
        }
      } catch (profileError: any) {
        // If it's a 404 error, it just means the user doesn't have a profile yet
        // This is not a real error, so we'll just set the profile to null
        if (profileError.response && profileError.response.status === 404) {
          console.log('No tax profile found for user, this is normal for new users');
          setTaxProfile(null);
        } else {
          // If it's some other error, we'll log it and set the error state
          console.error('Error fetching tax profile:', profileError);
          setError(profileError);
        }
      }
    } catch (err: any) {
      console.error('Error in fetchTaxProfile:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate residency status based on location data
  const calculateResidencyStatus = async (profile: TaxProfileData, rules: Record<string, TaxRuleData>) => {
    if (!user?.uid) return;

    try {
      // Fetch location history from the past year
      const currentYear = new Date().getFullYear();
      const locationResponse = await axios.get(`/api/location-tracking?userId=${user.uid}&year=${currentYear}`);
      
      if (locationResponse.data && locationResponse.data.locationHistory) {
        const locationHistory = locationResponse.data.locationHistory;
        
        // Calculate days spent in each country
        const countriesMap = new Map<string, { days: number, code: string, flag?: string }>();
        
        locationHistory.forEach((entry: any) => {
          const countryCode = entry.countryCode;
          const daysSpent = entry.daysSpent || 0;
          
          if (countriesMap.has(countryCode)) {
            const current = countriesMap.get(countryCode);
            if (current) {
              countriesMap.set(countryCode, { 
                ...current, 
                days: current.days + daysSpent 
              });
            }
          } else {
            countriesMap.set(countryCode, { 
              days: daysSpent, 
              code: countryCode,
              flag: '🏳️' // Default flag
            });
          }
        });
        
        // Convert to residency status array
        const statusArray: ResidencyStatus[] = [];
        
        for (const [countryCode, data] of countriesMap.entries()) {
          // Get tax rules for this country
          const countryRules = rules[countryCode] || await fetchCountryRules(countryCode);
          
          if (countryRules) {
            const threshold = countryRules.residencyThresholdDays;
            const percentage = Math.round((data.days / threshold) * 100);
            let status = 'Non-resident';
            let alert = false;
            
            if (percentage >= 100) {
              status = 'Tax resident';
              alert = true;
            } else if (percentage >= 80) {
              status = 'Approaching residency';
              alert = true;
            } else if (percentage >= 50) {
              status = 'Significant presence';
              alert = false;
            }
            
            statusArray.push({
              country: countryRules.country,
              countryCode,
              flagEmoji: countryRules.flagEmoji,
              daysPresent: data.days,
              threshold,
              percentage,
              status,
              alert,
              daysRemaining: threshold - data.days
            });
          }
        }
        
        // Sort by percentage (highest first)
        statusArray.sort((a, b) => b.percentage - a.percentage);
        
        setResidencyStatus(statusArray);
      }
    } catch (error) {
      console.error('Error calculating residency status:', error);
    }
  };

  // Fetch tax rules for a specific country
  const fetchCountryRules = async (countryCode: string): Promise<TaxRuleData | null> => {
    try {
      const response = await axios.get(`/api/tax-rules?countryCode=${countryCode}`);
      
      if (response.data && !response.data.error) {
        // Add to the cache
        setTaxRules(prev => ({
          ...prev,
          [countryCode]: response.data
        }));
        
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching tax rules for ${countryCode}:`, error);
      return null;
    }
  };

  // Create or update tax profile
  const saveTaxProfile = async (data: Omit<TaxProfileData, '_id'>) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      // Make sure additionalTaxObligations is an array
      if (!data.additionalTaxObligations) {
        data.additionalTaxObligations = [];
      }
      
      // Make sure declareTaxIn is an array
      if (!data.declareTaxIn || !Array.isArray(data.declareTaxIn)) {
        data.declareTaxIn = data.taxHomeCode ? [data.taxHomeCode] : [];
      }
      
      const response = await axios.post('/api/user-tax-profile', {
        ...data,
        userId: user.uid
      });

      if (response.data.status === 'success') {
        // Refresh data
        await fetchTaxProfile();
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to save tax profile');
      }
    } catch (error) {
      console.error('Error saving tax profile:', error);
      throw error;
    }
  };

  // Update specific fields of the tax profile
  const updateTaxProfile = async (updates: Partial<TaxProfileData>) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      const response = await axios.patch('/api/user-tax-profile', {
        userId: user.uid,
        updates
      });

      if (response.data.status === 'success') {
        // Refresh data
        await fetchTaxProfile();
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to update tax profile');
      }
    } catch (error) {
      console.error('Error updating tax profile:', error);
      throw error;
    }
  };

  // Fetch profile and rules on mount or when user changes
  useEffect(() => {
    if (user?.uid) {
      fetchTaxProfile();
    }
  }, [user?.uid]);

  return {
    profile: taxProfile,
    taxRules,
    residencyStatus,
    hasProfile: !!taxProfile,
    loading,
    error,
    fetchTaxProfile,
    saveTaxProfile,
    updateTaxProfile,
    calculateResidencyStatus
  };
} 