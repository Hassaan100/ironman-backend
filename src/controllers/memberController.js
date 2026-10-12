import mongoose from 'mongoose';
import { Member } from '../models/Member.js';
import { Payment } from '../models/Payment.js';
import { Plan } from '../models/Plan.js';

export const getMembers = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { q, status, plan, limit = 100, page = 1 } = req.query;

    const filter = { gymId };
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (plan && plan !== 'all') {
      filter.plan = plan;
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { memberId: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { cnic: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [members, total] = await Promise.all([
      Member.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Member.countDocuments(filter),
    ]);

    res.json({ success: true, total, count: members.length, members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, gymId: req.gymId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    const payments = await Payment.find({ memberId: member.memberId, gymId: req.gymId }).sort({ paidOn: -1 });
    res.json({ success: true, member, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMember = async (req, res) => {
  try {
    const gymId = req.gymId;
    const {
      name,
      phone,
      cnic,
      address,
      emergencyContact,
      plan = 'monthly',
      durationDays = 30,
      originalFee,
      discountType = 'none',
      discountValue = 0,
      totalAmount,
      paidAmount = 0,
      paymentMethod = 'cash',
      paymentMode = 'full',
      withTrainer,
      trainerId,
      trainerName,
      photoUrl,
      notes,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    // 1. Authoritative plan lookup and pricing
    let baseFee = 5000;
    let authoritativePlan = null;
    if (plan) {
      authoritativePlan = await Plan.findOne({
        gymId,
        $or: [
          { planType: plan },
          { name: plan },
          ...(mongoose.Types.ObjectId.isValid(plan) ? [{ _id: plan }] : []),
        ],
      });
    }

    if (authoritativePlan) {
      baseFee = Number(authoritativePlan.price);
    } else if (originalFee !== undefined && !isNaN(Number(originalFee))) {
      baseFee = Number(originalFee);
    } else if (totalAmount !== undefined && !isNaN(Number(totalAmount))) {
      baseFee = Number(totalAmount);
    }

    // Support custom pricing if admin explicitly customized the original fee
    if (originalFee !== undefined && !isNaN(Number(originalFee))) {
      baseFee = Number(originalFee);
    }

    if (baseFee < 0) {
      return res.status(400).json({ success: false, message: 'Original fee cannot be negative' });
    }

    // 2. Validate discount type and value
    const normDiscountType = (discountType || 'none').toLowerCase();
    const rawDiscountValue = discountValue;

    if (
      normDiscountType !== 'none' &&
      rawDiscountValue !== undefined &&
      rawDiscountValue !== '' &&
      (isNaN(Number(rawDiscountValue)) || typeof rawDiscountValue === 'boolean')
    ) {
      return res.status(400).json({ success: false, message: 'Please enter a valid discount value' });
    }

    const discountVal = Number(rawDiscountValue) || 0;
    let calculatedDiscountAmount = 0;
    let finalDiscountValue = 0;

    if (normDiscountType === 'percentage') {
      if (discountVal < 0) {
        return res.status(400).json({ success: false, message: 'Discount percentage cannot be negative' });
      }
      if (discountVal > 100) {
        return res.status(400).json({ success: false, message: 'Discount percentage cannot exceed 100%' });
      }
      finalDiscountValue = discountVal;
      calculatedDiscountAmount = Math.round(((baseFee * discountVal) / 100) * 100) / 100;
    } else if (normDiscountType === 'fixed') {
      if (discountVal < 0) {
        return res.status(400).json({ success: false, message: 'Discount amount cannot be negative' });
      }
      if (discountVal > baseFee) {
        return res.status(400).json({ success: false, message: 'Discount amount cannot exceed the original fee' });
      }
      finalDiscountValue = discountVal;
      calculatedDiscountAmount = Math.round(discountVal * 100) / 100;
    } else if (normDiscountType === 'none' || !normDiscountType) {
      finalDiscountValue = 0;
      calculatedDiscountAmount = 0;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid discount type' });
    }

    // 3. Final payable fee calculated on backend
    const finalFee = Math.max(0, Math.round((baseFee - calculatedDiscountAmount) * 100) / 100);

    // 4. Validate payment amount against final payable fee
    const paid = Number(paidAmount) || 0;

    if (paid < 0) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot be negative' });
    }
    if (paid > finalFee) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot exceed the final payable fee' });
    }
    if (paymentMode === 'full' && paid !== finalFee) {
      return res.status(400).json({ success: false, message: 'In Full Payment mode, payment amount must equal the final payable fee' });
    }
    if (paymentMode === 'partial' && finalFee > 0 && paid >= finalFee) {
      return res.status(400).json({ success: false, message: 'In Partial Payment mode, advance payment must be less than the final payable fee' });
    }

    // 5. Calculate outstanding balance
    const dueAmount = Math.max(0, Math.round((finalFee - paid) * 100) / 100);
    const now = new Date();
    const expiryDays = authoritativePlan?.durationDays || Number(durationDays) || 30;
    const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    // Auto generate memberId if not given
    let memberId = req.body.memberId;
    if (!memberId) {
      const existingMembers = await Member.find({ gymId }, { memberId: 1 }).lean();
      let maxNum = 1000;
      for (const m of existingMembers) {
        if (!m.memberId) continue;
        const match = String(m.memberId).match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      let candidateSeq = maxNum + 1;
      while (await Member.exists({ gymId, memberId: `M-${candidateSeq}` })) {
        candidateSeq++;
      }
      memberId = `M-${candidateSeq}`;
    }

    const member = await Member.create({
      gymId,
      memberId,
      name,
      phone,
      cnic,
      address,
      emergencyContact,
      plan: authoritativePlan ? authoritativePlan.planType : (plan || 'monthly'),
      withTrainer: Boolean(withTrainer),
      trainerId: trainerId || undefined,
      trainerName: trainerName || '',
      startDate: now,
      expiryDate,
      status: dueAmount > 0 ? 'due' : 'active',
      originalFee: baseFee,
      discountType: normDiscountType,
      discountValue: finalDiscountValue,
      discountAmount: calculatedDiscountAmount,
      finalFee,
      totalAmount: finalFee,
      paidAmount: paid,
      dueAmount,
      photoUrl: photoUrl || '',
      notes: notes || '',
    });

    // If payment was made (paid > 0), log transaction in Payment ledger
    if (paid > 0) {
      let paymentNotes = dueAmount > 0
        ? 'Initial admission fee payment (partial advance)'
        : 'Initial admission fee payment (full)';
      if (calculatedDiscountAmount > 0) {
        paymentNotes += ` [Discount: PKR ${calculatedDiscountAmount} (${normDiscountType === 'percentage' ? `${finalDiscountValue}%` : 'Fixed Amount'})]`;
      }

      await Payment.create({
        gymId,
        memberId: member.memberId,
        memberName: member.name,
        amount: paid,
        method: paymentMethod || 'cash',
        paymentType: 'membership',
        plan: member.plan,
        invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
        receivedBy: req.user?.name || 'Admin',
        paidOn: now,
        notes: paymentNotes,
        originalFee: baseFee,
        discountType: normDiscountType,
        discountAmount: calculatedDiscountAmount,
      });
    }

    res.status(201).json({ success: true, message: 'Member created successfully', member });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Member with this ID or credentials already exists. Please try again.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMember = async (req, res) => {
  try {
    const member = await Member.findOneAndUpdate(
      { _id: req.params.id, gymId: req.gymId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, message: 'Member updated successfully', member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const renewMembership = async (req, res) => {
  try {
    const {
      plan,
      durationDays = 30,
      renewalFee,
      totalAmount,
      amount,
      paidAmount,
      paymentMethod = 'cash',
      paymentMode = 'full',
      notes,
    } = req.body;

    const member = await Member.findOne({ _id: req.params.id, gymId: req.gymId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const fee = Number(renewalFee !== undefined ? renewalFee : (totalAmount !== undefined ? totalAmount : amount)) || 0;
    const paid = Number(paidAmount !== undefined ? paidAmount : amount) || 0;

    if (fee < 0) {
      return res.status(400).json({ success: false, message: 'Renewal fee cannot be negative' });
    }
    if (paid < 0) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot be negative' });
    }
    if (paid > fee) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot exceed renewal fee' });
    }
    if (paymentMode === 'full' && paid !== fee) {
      return res.status(400).json({ success: false, message: 'In Full Payment mode, payment amount must equal the renewal fee' });
    }
    if (paymentMode === 'partial' && fee > 0 && paid >= fee) {
      return res.status(400).json({ success: false, message: 'In Partial Payment mode, advance payment must be less than the renewal fee' });
    }

    const currentExpiry = new Date(member.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    // Preserve previous outstanding dues and calculate new renewal due
    const previousDue = Number(member.dueAmount) || 0;
    const newRenewalDue = Math.max(0, fee - paid);
    const updatedDueAmount = previousDue + newRenewalDue;

    member.plan = plan || member.plan;
    member.expiryDate = newExpiry;
    member.totalAmount = (Number(member.totalAmount) || 0) + fee;
    member.paidAmount = (Number(member.paidAmount) || 0) + paid;
    member.dueAmount = updatedDueAmount;
    member.status = updatedDueAmount > 0 ? 'due' : 'active';
    await member.save();

    let payment = null;
    if (paid > 0) {
      payment = await Payment.create({
        gymId: req.gymId,
        memberId: member.memberId,
        memberName: member.name,
        amount: paid,
        method: paymentMethod || 'cash',
        paymentType: 'renewal',
        plan: member.plan,
        invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
        receivedBy: req.user?.name || 'Admin',
        paidOn: new Date(),
        notes: notes || (newRenewalDue > 0 ? `Membership renewal (partial advance)` : `Membership renewal for ${durationDays} days`),
      });
    }

    res.json({ success: true, message: 'Membership renewed successfully', member, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findOneAndDelete({ _id: req.params.id, gymId: req.gymId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
