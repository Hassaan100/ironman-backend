import { Trainer } from '../models/Trainer.js';

export const getTrainers = async (req, res) => {
  try {
    const gymId = req.gymId;
    const trainers = await Trainer.find({ gymId }).sort({ createdAt: -1 });
    res.json({ success: true, count: trainers.length, trainers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTrainer = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { name, phone, email, specialty, salary, commissionPercent, photoUrl } = req.body;

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
