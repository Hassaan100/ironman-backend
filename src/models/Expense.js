import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['rent', 'electricity', 'salaries', 'repairs', 'maintenance', 'equipment', 'supplements', 'utilities', 'marketing', 'other'],
      default: 'utilities',
    },
    amount: { type: Number, required: true },
    spentOn: { type: Date, default: Date.now },
    receiptNo: { type: String, default: '' },
    paidBy: { type: String, default: 'Admin' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', ExpenseSchema);
