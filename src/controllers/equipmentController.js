import { Equipment } from '../models/Equipment.js';

export const getEquipment = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { category, status } = req.query;
    const filter = { gymId };

    if (category && category !== 'all') filter.category = category;
    if (status && status !== 'all') filter.status = status;

    const items = await Equipment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createEquipment = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { name, category, status, quantity, purchaseDate, cost, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Equipment name is required' });
    }

    const item = await Equipment.create({
      gymId,
      name,
      category: category || 'strength',
      status: status || 'working',
      quantity: Number(quantity || 1),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      cost: Number(cost || 0),
      notes: notes || '',
    });

    res.status(201).json({ success: true, message: 'Equipment item added successfully', item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEquipment = async (req, res) => {
  try {
    const item = await Equipment.findOneAndUpdate(
      { _id: req.params.id, gymId: req.gymId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) {
      return res.status(404).json({ success: false, message: 'Equipment item not found' });
    }
    res.json({ success: true, message: 'Equipment item updated successfully', item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEquipment = async (req, res) => {
  try {
    const item = await Equipment.findOneAndDelete({ _id: req.params.id, gymId: req.gymId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Equipment item not found' });
    }
    res.json({ success: true, message: 'Equipment item removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
