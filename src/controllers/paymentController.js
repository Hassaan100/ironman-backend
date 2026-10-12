import { Payment } from '../models/Payment.js';
import { Member } from '../models/Member.js';
import { Plan } from '../models/Plan.js';

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
    const { memberId, amount, method = 'cash', paymentType = 'due_clearance', plan, notes } = req.body;

    if (!memberId || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid memberId and positive amount are required' });
    }

    const cleanMemberId = String(memberId).trim();
    const member = await Member.findOne({ gymId, memberId: cleanMemberId });
    if (!member) {
      return res.status(404).json({ success: false, message: `Member with ID "${cleanMemberId}" not found` });
    }

    const paidNum = Number(amount);

    // Prevent duplicate payment submissions within 5 seconds for same member, type & amount
    if (paymentType === 'renewal' || paymentType === 'due_clearance') {
      const recentDuplicate = await Payment.findOne({
        gymId,
        memberId: member.memberId,
        paymentType,
        amount: paidNum,
        createdAt: { $gte: new Date(Date.now() - 5000) },
      });
      if (recentDuplicate) {
        return res.status(409).json({
          success: false,
          message: `A ${paymentType === 'renewal' ? 'renewal' : 'due clearance'} payment for this member was just recorded a few seconds ago. Duplicate submission prevented.`,
        });
      }
    }

    // Validate due clearance amounts against member's actual outstanding dues
    if (paymentType === 'due_clearance') {
      const currentDues = Number(member.dueAmount) || 0;
      if (currentDues <= 0) {
        return res.status(400).json({
          success: false,
          message: `Member "${member.name}" (${member.memberId}) has no outstanding dues to clear.`,
        });
      }
      if (paidNum > currentDues) {
        return res.status(400).json({
          success: false,
          message: `Amount received (PKR ${paidNum}) cannot exceed total pending dues (PKR ${currentDues}).`,
        });
      }
    }

    let renewalFee = paidNum;
    let newExpiry = null;
    let durationDays = 30;

    if (paymentType === 'renewal') {
      // 1. Look up plan duration based on existing member plan (or passed plan)
      let planRecord = null;
      const targetPlanType = plan || member.plan;
      if (targetPlanType) {
        planRecord = await Plan.findOne({ gymId, planType: targetPlanType, isActive: true });
        if (!planRecord) {
          planRecord = await Plan.findOne({ gymId, planType: targetPlanType });
        }
        if (!planRecord) {
          planRecord = await Plan.findOne({ gymId, name: targetPlanType });
        }
      }

      const defaultDurationMap = {
        daypass: 1,
        monthly: 30,
        quarterly: 90,
        halfyearly: 180,
        yearly: 365,
        pt: 30,
      };

      durationDays = planRecord?.durationDays || defaultDurationMap[targetPlanType] || 30;

      // 2. Determine base date for renewal:
      // If current membership is still active, extend from current expiryDate.
      // If membership has already expired, calculate from today's date.
      const now = new Date();
      const currentExpiry = member.expiryDate ? new Date(member.expiryDate) : null;
      const isStillActive = currentExpiry && !isNaN(currentExpiry.getTime()) && currentExpiry.getTime() > now.getTime();
      const baseDate = isStillActive ? currentExpiry : now;
      newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // 3. Financial calculations for renewal
      const planPrice = Number(planRecord?.price) || 0;
      const ptFee = member.withTrainer ? Number(member.trainerFee || 0) : 0;
      const fullCycleFee = planPrice + ptFee;

      let renewalDue = 0;
      if (fullCycleFee > 0 && paidNum < fullCycleFee) {
        renewalFee = fullCycleFee;
        renewalDue = fullCycleFee - paidNum;
      } else {
        renewalFee = paidNum;
        renewalDue = 0;
      }

      const previousDue = Number(member.dueAmount) || 0;
      const updatedDueAmount = previousDue + renewalDue;

      if (plan && plan !== member.plan) {
        member.plan = plan;
      }
      member.expiryDate = newExpiry;
      member.totalAmount = (Number(member.totalAmount) || 0) + renewalFee;
      member.paidAmount = (Number(member.paidAmount) || 0) + paidNum;
      member.dueAmount = updatedDueAmount;
      member.status = updatedDueAmount > 0 ? 'due' : 'active';
    } else {
      // Non-renewal payments (e.g. due clearance, pt fee) - do NOT extend expiry date
      member.paidAmount = (Number(member.paidAmount) || 0) + paidNum;
      member.dueAmount = Math.max(0, (Number(member.dueAmount) || 0) - paidNum);
      if (member.dueAmount === 0 && member.status === 'due') {
        const isExpired = member.expiryDate && new Date(member.expiryDate) < new Date();
        member.status = isExpired ? 'expired' : 'active';
      }
    }

    await member.save();

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const paymentNotes = notes || (
      paymentType === 'renewal'
        ? `Subscription renewal (${durationDays} days)`
        : paymentType === 'due_clearance'
        ? `Due clearance payment (Remaining dues: PKR ${member.dueAmount})`
        : ''
    );

    const payment = await Payment.create({
      gymId,
      memberId: member.memberId,
      memberName: member.name,
      amount: paidNum,
      method,
      paymentType,
      plan: plan || member.plan,
      invoiceNo,
      receivedBy: req.user?.name || 'Admin',
      paidOn: new Date(),
      notes: paymentNotes,
      originalFee: paymentType === 'renewal' ? renewalFee : paidNum,
    });

    let successMsg = 'Payment recorded successfully';
    if (paymentType === 'renewal') {
      successMsg = `Subscription renewed successfully. Expiry extended to ${newExpiry.toISOString().split('T')[0]}`;
    } else if (paymentType === 'due_clearance') {
      successMsg = member.dueAmount === 0
        ? `All pending dues cleared for ${member.name}. Member status updated to active.`
        : `Dues payment of PKR ${paidNum} recorded. Remaining dues: PKR ${member.dueAmount}.`;
    }

    res.status(201).json({
      success: true,
      message: successMsg,
      payment,
      member: {
        memberId: member.memberId,
        name: member.name,
        expiryDate: member.expiryDate,
        status: member.status,
        paidAmount: member.paidAmount,
        dueAmount: member.dueAmount,
      },
      memberDueRemaining: member.dueAmount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
