import { Payment } from '../models/Payment.js';
import { Member } from '../models/Member.js';

export const getPayments = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { method, paymentType, search, limit = 50, page = 1 } = req.query;
    const filter = { gymId };

    if (method && method !== 'all') filter.method = method;
    if (paymentType && paymentType !== 'all') filter.paymentType = paymentType;
    if (search) {
      filter.$or = [
        { memberName: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total, totalSum] = await Promise.all([
      Payment.find(filter).sort({ paidOn: -1 }).skip(skip).limit(Number(limit)),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      total,
      totalCollected: totalSum[0]?.total || 0,
      count: payments.length,
      payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { memberId, amount, method = 'cash', paymentType = 'membership', plan, notes } = req.body;

    if (!memberId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid memberId and positive amount are required' });
    }

    const member = await Member.findOne({ gymId, memberId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const payment = await Payment.create({
      gymId,
      memberId: member.memberId,
      memberName: member.name,
      amount: Number(amount),
      method,
      paymentType,
      plan: plan || member.plan,
      invoiceNo,
      receivedBy: req.user?.name || 'Admin',
      paidOn: new Date(),
      notes: notes || '',
    });

    // Update member's financials
    member.paidAmount += Number(amount);
    member.dueAmount = Math.max(0, member.dueAmount - Number(amount));
    if (member.dueAmount === 0 && member.status === 'due') {
      member.status = 'active';
    }
    await member.save();

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      memberDueRemaining: member.dueAmount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
