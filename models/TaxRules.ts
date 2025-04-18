import mongoose, { Schema, Document } from 'mongoose';

export interface ITaxRules extends Document {
  country: string;
  countryCode: string;
  flagEmoji: string;
  taxYear: string; // "calendar" or "fiscal"
  fiscalYearStart?: string; // Month-Day format (MM-DD) if applicable
  residencyThresholdDays: number;
  description: string;
  taxFilingMonth: number; // 1-12
  taxFilingDay: number; // 1-31
  specialRules?: string[];
  currencyCode: string;
  hasIncomeThreshold: boolean;
  incomeThresholdAmount?: number;
  incomeThresholdCurrency?: string;
  taxTreaties?: string[]; // Array of country codes with tax treaties
  hasTaxationTypes?: {
    worldwide: boolean;
    territorial: boolean;
    remittance: boolean;
  };
}

const TaxRulesSchema: Schema = new Schema({
  country: { type: String, required: true, unique: true },
  countryCode: { type: String, required: true, unique: true },
  flagEmoji: { type: String, required: true },
  taxYear: { type: String, required: true, enum: ['calendar', 'fiscal'] },
  fiscalYearStart: { type: String },
  residencyThresholdDays: { type: Number, required: true },
  description: { type: String, required: true },
  taxFilingMonth: { type: Number, required: true, min: 1, max: 12 },
  taxFilingDay: { type: Number, required: true, min: 1, max: 31 },
  specialRules: [{ type: String }],
  currencyCode: { type: String, required: true },
  hasIncomeThreshold: { type: Boolean, default: false },
  incomeThresholdAmount: { type: Number },
  incomeThresholdCurrency: { type: String },
  taxTreaties: [{ type: String }],
  hasTaxationTypes: {
    worldwide: { type: Boolean, default: false },
    territorial: { type: Boolean, default: false },
    remittance: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

export default mongoose.models.TaxRules || mongoose.model<ITaxRules>('TaxRules', TaxRulesSchema); 