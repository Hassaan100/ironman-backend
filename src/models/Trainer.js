import mongoose from 'mongoose';

const TrainerSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    specialty: { type: String, default: 'General Fitness / Bodybuilding' },
    salary: { type: Number, default: 0 },
    commissionPercent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_leave'],
      default: 'active',
    },
    experienceYears: { type: Number, default: 1 },
    photoUrl: { type: String, default: '' },
    assignedClientsCount: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Trainer = mongoose.model('Trainer', TrainerSchema);
