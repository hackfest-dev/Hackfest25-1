import mongoose, { Schema, Document } from 'mongoose';

export interface ITaxDeadline extends Document {
  userId: string;
  country: string;
  flag: string;
  deadline: Date;
  description: string;
  category: string;
  isComplete: boolean;
}

const TaxDeadlineSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  country: { type: String, required: true },
  flag: { type: String },
  deadline: { type: Date, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  isComplete: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.models.TaxDeadline || mongoose.model<ITaxDeadline>('TaxDeadline', TaxDeadlineSchema); 