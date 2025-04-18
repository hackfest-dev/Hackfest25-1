import mongoose from 'mongoose';

const UserSettingsSchema = new mongoose.Schema({
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
  notificationSettings: {
    email: { type: Boolean, default: true },
    budget: { type: Boolean, default: true },
    tax: { type: Boolean, default: true },
  },
}, {
  timestamps: true
});

const UserSettings = mongoose.models.UserSettings || mongoose.model('UserSettings', UserSettingsSchema);

export default UserSettings; 