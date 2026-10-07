import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    name: { type: String, required: true, trim: true },
    planType: {
      type: String,
      enum: ['daypass', 'monthly', 'quarterly', 'halfyearly', 'yearly', 'pt', 'couple', 'custom'],
      default: 'monthly',
    },
    durationDays: { type: Number, required: true, default: 30, min: 1 },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlanSchema.index({ gymId: 1, isActive: 1 });
PlanSchema.index({ gymId: 1, planType: 1 });

export const Plan = mongoose.model('Plan', PlanSchema);
