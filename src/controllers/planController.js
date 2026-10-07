import mongoose from 'mongoose';
import { Plan } from '../models/Plan.js';
import { Member } from '../models/Member.js';

export const getPlans = async (req, res) => {
  try {
    const gymId = req.gymId;
    const gymObjectId = mongoose.Types.ObjectId.isValid(gymId)
      ? new mongoose.Types.ObjectId(gymId)
      : gymId;

    const { status, active, q } = req.query;

    const filter = { gymId };

    if (active === 'true' || status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive' || active === 'false') {
      filter.isActive = false;
    }

    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }

    const [plans, memberUsageAgg] = await Promise.all([
      Plan.find(filter).sort({ price: 1 }),
      Member.aggregate([
        { $match: { gymId: gymObjectId } },
        { $group: { _id: '$plan', count: { $sum: 1 }, activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
      ]),
    ]);

    const usageMap = {};
    memberUsageAgg.forEach((m) => {
      if (m._id) {
        usageMap[m._id.toLowerCase()] = { total: m.count, active: m.activeCount };
      }
    });

    const enrichedPlans = plans.map((p) => {
      const planObj = p.toObject();
      const planTypeKey = (p.planType || '').toLowerCase();
      const planNameKey = (p.name || '').toLowerCase();
      const stats = usageMap[planTypeKey] || usageMap[planNameKey] || { total: 0, active: 0 };
      planObj.membersCount = stats.total;
      planObj.activeMembersCount = stats.active;
      return planObj;
    });

    res.json({ success: true, count: enrichedPlans.length, plans: enrichedPlans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findOne({ _id: req.params.id, gymId: req.gymId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const membersCount = await Member.countDocuments({
      gymId: req.gymId,
      $or: [{ plan: plan.planType }, { plan: plan.name }],
    });

    const planObj = plan.toObject();
    planObj.membersCount = membersCount;

    res.json({ success: true, plan: planObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPlan = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { name, planType, durationDays, price, description, features, isActive } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }

    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'Valid non-negative price is required' });
    }

    if (!durationDays || Number(durationDays) < 1) {
      return res.status(400).json({ success: false, message: 'Duration must be at least 1 day' });
    }

    const formattedFeatures = Array.isArray(features)
      ? features.filter((f) => typeof f === 'string' && f.trim() !== '')
      : typeof features === 'string'
      ? features.split(',').map((f) => f.trim()).filter(Boolean)
      : [];

    const plan = await Plan.create({
      gymId,
      name: name.trim(),
      planType: planType || 'monthly',
      durationDays: Number(durationDays || 30),
      price: Number(price),
      description: description || '',
      features: formattedFeatures,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({ success: true, message: 'Membership plan created successfully', plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const { name, planType, durationDays, price, description, features, isActive } = req.body;

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (planType !== undefined) updatePayload.planType = planType;
    if (durationDays !== undefined) updatePayload.durationDays = Math.max(1, Number(durationDays));
    if (price !== undefined) updatePayload.price = Math.max(0, Number(price));
    if (description !== undefined) updatePayload.description = description;
    if (isActive !== undefined) updatePayload.isActive = Boolean(isActive);

    if (features !== undefined) {
      updatePayload.features = Array.isArray(features)
        ? features.filter((f) => typeof f === 'string' && f.trim() !== '')
        : typeof features === 'string'
        ? features.split(',').map((f) => f.trim()).filter(Boolean)
        : [];
    }

    const plan = await Plan.findOneAndUpdate(
      { _id: req.params.id, gymId: req.gymId },
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, message: 'Plan updated successfully', plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findOne({ _id: req.params.id, gymId: req.gymId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.json({
      success: true,
      message: `Plan "${plan.name}" is now ${plan.isActive ? 'active' : 'inactive'}`,
      plan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findOne({ _id: req.params.id, gymId: req.gymId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Check if any member is currently assigned to this plan
    const membersUsingPlan = await Member.countDocuments({
      gymId: req.gymId,
      $or: [{ plan: plan.planType }, { plan: plan.name }],
    });

    if (membersUsingPlan > 0) {
      return res.status(400).json({
        success: false,
        message: `This plan is currently assigned to ${membersUsingPlan} member(s). Please deactivate the plan instead of deleting it to preserve historical records.`,
        membersCount: membersUsingPlan,
      });
    }

    await Plan.findOneAndDelete({ _id: req.params.id, gymId: req.gymId });

    res.json({ success: true, message: `Plan "${plan.name}" removed successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
