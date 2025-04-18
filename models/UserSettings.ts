import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSettings extends Document {
  userId: string;
  displayName: string;
  avatar: string;
  baseCurrency: string;
  theme: 'light' | 'dark' | 'system';
  location: string;
  locationCode: string;
  residencyLocation: string;
  residencyLocationCode: string;
  residencyStartDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, default: '' },
  avatar: { type: String, default: '' },
  baseCurrency: { type: String, default: 'USD' },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  location: { type: String, default: '' },
  locationCode: { type: String, default: '' },
  residencyLocation: { type: String, default: '' },
  residencyLocationCode: { type: String, default: '' },
  residencyStartDate: { type: Date },
}, {
  timestamps: true
});

export default mongoose.models.UserSettings || mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema); 