import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    memberId: { type: String, required: true },
    memberName: { type: String, required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'jazzcash', 'easypaisa', 'bank_transfer', 'card'],
      default: 'cash',
    },
    paymentType: {
      type: String,
      enum: ['membership', 'renewal', 'due_clearance', 'pt_fee', 'other'],
      default: 'membership',
    },
    plan: { type: String, default: 'monthly' },
    invoiceNo: { type: String, required: true },
    receivedBy: { type: String, default: 'Admin' },
    paidOn: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', PaymentSchema);
