import mongoose from 'mongoose';

const CashClosingSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    dateStr: { type: String, required: true }, // Format: YYYY-MM-DD
    openingCash: { type: Number, default: 0, min: 0 },
    cashIncome: { type: Number, default: 0, min: 0 },
    cashExpenses: { type: Number, default: 0, min: 0 },
    expectedCash: { type: Number, default: 0 },
    countedCash: { type: Number, required: true, min: 0 },
    difference: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['balanced', 'short', 'excess'],
      default: 'balanced',
    },
    notes: { type: String, default: '', trim: true },
    closedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: 'Admin' },
      email: { type: String, default: '' },
      role: { type: String, default: 'owner' },
    },
    closedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CashClosingSchema.index({ gymId: 1, dateStr: 1 }, { unique: true });
CashClosingSchema.index({ gymId: 1, createdAt: -1 });

export const CashClosing = mongoose.model('CashClosing', CashClosingSchema);
export default CashClosing;
