import mongoose from 'mongoose';
import { Trainer } from '../models/Trainer.js';
import { Member } from '../models/Member.js';

export const getTrainers = async (req, res) => {
  try {
    const gymId = req.gymId;
    const trainers = await Trainer.find({ gymId }).sort({ createdAt: -1 });

    const now = new Date();
    const gymObjectId = mongoose.Types.ObjectId.isValid(gymId)
      ? new mongoose.Types.ObjectId(gymId)
      : gymId;

    // Calculate active members count assigned to each trainer, excluding expired and inactive
    const activeMembersAgg = await Member.aggregate([
      {
        $match: {
          gymId: gymObjectId,
          withTrainer: true,
          trainerId: { $ne: null },
          status: { $nin: ['expired', 'frozen', 'inactive'] },
          expiryDate: { $gte: now },
        },
      },
      {
        $group: {
          _id: '$trainerId',
          activeMembersCount: { $sum: 1 },
        },
      },
    ]);

    const activeCountMap = {};
    activeMembersAgg.forEach((item) => {
      if (item._id) {
        activeCountMap[item._id.toString()] = item.activeMembersCount;
      }
    });

    const trainersWithActiveCount = trainers.map((t) => {
      const plain = t.toObject ? t.toObject() : { ...t };
      return {
        ...plain,
        fee: plain.fee !== undefined ? plain.fee : 3000,
        activeMembersCount: activeCountMap[t._id.toString()] || 0,
      };
    });

    res.json({ success: true, count: trainersWithActiveCount.length, trainers: trainersWithActiveCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTrainerActiveMembers = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { id } = req.params;

    const trainer = await Trainer.findOne({ _id: id, gymId });
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    const now = new Date();
    // Exclude expired and inactive members
    const members = await Member.find({
      gymId,
      trainerId: id,
      withTrainer: true,
      status: { $nin: ['expired', 'frozen', 'inactive'] },
      expiryDate: { $gte: now },
    })
      .select('name memberId phone plan expiryDate status trainerName startDate paidAmount dueAmount')
      .sort({ expiryDate: 1 });

    res.json({
      success: true,
      trainer: {
        _id: trainer._id,
        name: trainer.name,
        specialty: trainer.specialty,
        fee: trainer.fee !== undefined ? trainer.fee : 3000,
      },
      count: members.length,
      members,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTrainer = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { name, phone, email, specialty, salary, commissionPercent, fee, photoUrl } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Trainer name and phone are required' });
    }

    const trainer = await Trainer.create({
      gymId,
      name,
      phone,
      email: email || '',
      specialty: specialty || 'General Fitness / Strength',
      salary: Number(salary || 0),
      commissionPercent: Number(commissionPercent || 0),
      fee: Number(fee !== undefined ? fee : 3000),
      photoUrl: photoUrl || '',
    });

    res.status(201).json({ success: true, message: 'Trainer added successfully', trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findOneAndUpdate(
      { _id: req.params.id, gymId: req.gymId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }
    res.json({ success: true, message: 'Trainer updated successfully', trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findOneAndDelete({ _id: req.params.id, gymId: req.gymId });
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }
    res.json({ success: true, message: 'Trainer removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
