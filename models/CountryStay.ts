import mongoose, { Schema, Document } from 'mongoose';

export interface ICountryStay extends Document {
  userId: string;
  country: string;
  entryDate: Date;
  exitDate: Date | null;
  daysSpent: number;
  taxThreshold: number;
  taxNotes: string;
  flag: string;
}

const CountryStaySchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  country: { type: String, required: true },
  entryDate: { type: Date, required: true },
  exitDate: { type: Date, default: null },
  daysSpent: { type: Number, default: 0 },
  taxThreshold: { type: Number, default: 183 },
  taxNotes: { type: String },
  flag: { type: String }
}, {
  timestamps: true
});

// Calculate days spent when saving
CountryStaySchema.pre('save', function(next) {
  const stay = this as any;
  const now = new Date();
  const end = stay.exitDate || now;
  const start = new Date(stay.entryDate);
  
  const timeDiff = end.getTime() - start.getTime();
  stay.daysSpent = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  next();
});

export default mongoose.models.CountryStay || mongoose.model<ICountryStay>('CountryStay', CountryStaySchema); 