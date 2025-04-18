import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: Date;
  location: {
    country: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    }
  };
  convertedAmount?: number;
  baseCurrency?: string;
  exchangeRate?: number;
  paymentMethod?: string;
  isRecurring?: boolean;
}

const TransactionSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  location: {
    country: { type: String, required: true },
    city: { type: String, required: true },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  convertedAmount: { type: Number },
  baseCurrency: { type: String },
  exchangeRate: { type: Number },
  paymentMethod: { type: String },
  isRecurring: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema); 