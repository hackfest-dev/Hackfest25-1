export interface Country {
  code: string;
  name: string;
  flagEmoji?: string;
}

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", flagEmoji: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flagEmoji: "🇬🇧" },
  { code: "CA", name: "Canada", flagEmoji: "🇨🇦" },
  { code: "AU", name: "Australia", flagEmoji: "🇦🇺" },
  { code: "NZ", name: "New Zealand", flagEmoji: "🇳🇿" },
  { code: "IE", name: "Ireland", flagEmoji: "🇮🇪" },
  { code: "DE", name: "Germany", flagEmoji: "🇩🇪" },
  { code: "FR", name: "France", flagEmoji: "🇫🇷" },
  { code: "ES", name: "Spain", flagEmoji: "🇪🇸" },
  { code: "IT", name: "Italy", flagEmoji: "🇮🇹" },
  { code: "PT", name: "Portugal", flagEmoji: "🇵🇹" },
  { code: "NL", name: "Netherlands", flagEmoji: "🇳🇱" },
  { code: "BE", name: "Belgium", flagEmoji: "🇧🇪" },
  { code: "CH", name: "Switzerland", flagEmoji: "🇨🇭" },
  { code: "AT", name: "Austria", flagEmoji: "🇦🇹" },
  { code: "SE", name: "Sweden", flagEmoji: "🇸🇪" },
  { code: "NO", name: "Norway", flagEmoji: "🇳🇴" },
  { code: "DK", name: "Denmark", flagEmoji: "🇩🇰" },
  { code: "FI", name: "Finland", flagEmoji: "🇫🇮" },
  { code: "JP", name: "Japan", flagEmoji: "🇯🇵" },
  { code: "SG", name: "Singapore", flagEmoji: "🇸🇬" },
  { code: "HK", name: "Hong Kong", flagEmoji: "🇭🇰" },
  { code: "KR", name: "South Korea", flagEmoji: "🇰🇷" },
  { code: "TW", name: "Taiwan", flagEmoji: "🇹🇼" },
  { code: "AE", name: "United Arab Emirates", flagEmoji: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flagEmoji: "🇸🇦" },
  { code: "QA", name: "Qatar", flagEmoji: "🇶🇦" },
  { code: "BH", name: "Bahrain", flagEmoji: "🇧🇭" },
  { code: "KW", name: "Kuwait", flagEmoji: "🇰🇼" },
  { code: "OM", name: "Oman", flagEmoji: "🇴🇲" },
  { code: "TH", name: "Thailand", flagEmoji: "🇹🇭" },
  { code: "MY", name: "Malaysia", flagEmoji: "🇲🇾" },
  { code: "ID", name: "Indonesia", flagEmoji: "🇮🇩" },
  { code: "PH", name: "Philippines", flagEmoji: "🇵🇭" },
  { code: "VN", name: "Vietnam", flagEmoji: "🇻🇳" },
  { code: "MM", name: "Myanmar", flagEmoji: "🇲🇲" },
  { code: "IN", name: "India", flagEmoji: "🇮🇳" },
  { code: "CN", name: "China", flagEmoji: "🇨🇳" },
  { code: "MX", name: "Mexico", flagEmoji: "🇲🇽" },
  { code: "BR", name: "Brazil", flagEmoji: "🇧🇷" },
  { code: "AR", name: "Argentina", flagEmoji: "🇦🇷" },
  { code: "CL", name: "Chile", flagEmoji: "🇨🇱" },
  { code: "CO", name: "Colombia", flagEmoji: "🇨🇴" },
  { code: "PE", name: "Peru", flagEmoji: "🇵🇪" },
  { code: "ZA", name: "South Africa", flagEmoji: "🇿🇦" },
  { code: "EG", name: "Egypt", flagEmoji: "🇪🇬" },
  { code: "MA", name: "Morocco", flagEmoji: "🇲🇦" },
  { code: "GE", name: "Georgia", flagEmoji: "🇬🇪" },
  { code: "TR", name: "Turkey", flagEmoji: "🇹🇷" },
  { code: "CY", name: "Cyprus", flagEmoji: "🇨🇾" },
];

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(country => country.code === code);
};

export const getCountryNameByCode = (code: string): string => {
  const country = getCountryByCode(code);
  return country ? country.name : code;
};

export const getCountryFlagByCode = (code: string): string => {
  const country = getCountryByCode(code);
  return country?.flagEmoji || "";
};

export const getTopCountries = (): Country[] => {
  return COUNTRIES.filter(country => 
    ["US", "GB", "CA", "AU", "NZ", "DE", "FR", "ES", "IT", "PT"].includes(country.code)
  );
}; 