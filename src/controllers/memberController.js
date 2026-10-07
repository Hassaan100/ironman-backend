import { Member } from '../models/Member.js';
import { Payment } from '../models/Payment.js';

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
      plan,
      durationDays = 30,
      totalAmount = 0,
      paidAmount = 0,
      paymentMethod = 'cash',
      withTrainer,
      trainerId,
      trainerName,
      photoUrl,
      notes,
    } = req.body;

    const dueAmount = Math.max(0, Number(totalAmount) - Number(paidAmount));
    const now = new Date();
    const expiryDate = new Date(now.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    // Auto generate memberId if not given
    const count = await Member.countDocuments({ gymId });
    const memberId = req.body.memberId || `M-${String(count + 1001)}`;

    const member = await Member.create({
      gymId,
      memberId,
      name,
      phone,
      cnic,
      address,
      emergencyContact,
      plan: plan || 'monthly',
      withTrainer: Boolean(withTrainer),
      trainerId: trainerId || undefined,
      trainerName: trainerName || '',
      startDate: now,
      expiryDate,
      status: dueAmount > 0 ? 'due' : 'active',
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount),
      dueAmount,
      photoUrl: photoUrl || '',
      notes: notes || '',
    });

    // If initial payment was made, log transaction in Payment ledger
    if (Number(paidAmount) > 0) {
      await Payment.create({
        gymId,
        memberId: member.memberId,
        memberName: member.name,
        amount: Number(paidAmount),
        method: paymentMethod || 'cash',
        paymentType: 'membership',
        plan: member.plan,
        invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
        receivedBy: req.user?.name || 'Admin',
        paidOn: now,
        notes: 'Initial admission fee payment',
      });
    }

    res.status(201).json({ success: true, message: 'Member created successfully', member });
  } catch (error) {
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
    const { plan, durationDays = 30, amount = 0, paymentMethod = 'cash' } = req.body;
    const member = await Member.findOne({ _id: req.params.id, gymId: req.gymId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const currentExpiry = new Date(member.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    member.plan = plan || member.plan;
    member.expiryDate = newExpiry;
    member.status = 'active';
    member.paidAmount += Number(amount);
    await member.save();

    if (Number(amount) > 0) {
      await Payment.create({
        gymId: req.gymId,
        memberId: member.memberId,
        memberName: member.name,
        amount: Number(amount),
        method: paymentMethod || 'cash',
        paymentType: 'renewal',
        plan: member.plan,
        invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
        receivedBy: req.user?.name || 'Admin',
        paidOn: new Date(),
        notes: `Membership renewal for ${durationDays} days`,
      });
    }

    res.json({ success: true, message: 'Membership renewed successfully', member });
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
