import mongoose from 'mongoose';

const GymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    branchCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    subscriptionPlan: {
      type: String,
      enum: ['starter', 'pro', 'enterprise'],
      default: 'pro',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trial', 'past_due', 'suspended'],
      default: 'active',
    },
    mrrAmount: { type: Number, default: 4999 },
    currency: { type: String, default: 'PKR' },
    validUntil: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    settings: {
      taxRate: { type: Number, default: 0 },
      allowPartialPayments: { type: Boolean, default: true },
      freezeFee: { type: Number, default: 500 },
      gracePeriodDays: { type: Number, default: 3 },
    },
  },
  { timestamps: true }
);

export const Gym = mongoose.model('Gym', GymSchema);
