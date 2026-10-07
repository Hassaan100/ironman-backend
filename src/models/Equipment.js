import mongoose from 'mongoose';

const EquipmentSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['cardio', 'strength', 'free_weights', 'cable_machines', 'accessories', 'other'],
      default: 'strength',
    },
    status: {
      type: String,
      enum: ['working', 'maintenance', 'out_of_order'],
      default: 'working',
    },
    quantity: { type: Number, default: 1 },
    purchaseDate: { type: Date, default: Date.now },
    lastMaintenance: { type: Date, default: Date.now },
    nextMaintenance: { type: Date },
    cost: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Equipment = mongoose.model('Equipment', EquipmentSchema);
