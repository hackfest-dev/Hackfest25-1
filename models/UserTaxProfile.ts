import mongoose, { Schema, Document } from 'mongoose';

export interface IUserTaxProfile extends Document {
  userId: string;
  taxHome: string; // Primary country of tax residency
  taxHomeCode: string; // Country code of tax home
  citizenship: string[]; // Array of citizenship countries
  additionalTaxObligations: Array<{
    country: string;
    countryCode: string;
    reason: string; // e.g., "Citizenship", "Green Card", "Substantial Presence"
  }>;
  declareTaxIn: string[]; // Array of countries where user files taxes
  userSettings: {
    baseYear: number; // Current year for tracking
    homeFilingDate?: Date; // Next tax deadline
    preferredCurrency: string; // For displaying tax amounts
    trackIncome: boolean; // Whether to track income for tax purposes
  };
}

const UserTaxProfileSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  taxHome: { type: String, required: true },
  taxHomeCode: { type: String, required: true },
  citizenship: [{ type: String, required: true }],
  additionalTaxObligations: [{
    country: { type: String, required: true },
    countryCode: { type: String, required: true },
    reason: { type: String, required: true }
  }],
  declareTaxIn: [{ type: String, required: true }],
  userSettings: {
    baseYear: { type: Number, required: true, default: new Date().getFullYear() },
    homeFilingDate: { type: Date },
    preferredCurrency: { type: String, required: true, default: 'USD' },
    trackIncome: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

export default mongoose.models.UserTaxProfile || mongoose.model<IUserTaxProfile>('UserTaxProfile', UserTaxProfileSchema); 