import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  baseCurrency: string;
  dateCreated: Date;
  lastLogin: Date;
  taxResidency: string;
  nationality: string;
}

const UserSchema: Schema = new Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String },
  photoURL: { type: String },
  baseCurrency: { type: String, default: 'USD' },
  dateCreated: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  taxResidency: { type: String, default: 'United States' },
  nationality: { type: String, default: 'United States' }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 