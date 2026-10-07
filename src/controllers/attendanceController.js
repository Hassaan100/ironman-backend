import { Attendance } from '../models/Attendance.js';
import { Member } from '../models/Member.js';

export const checkIn = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { identifier } = req.body; // memberId, phone, or cnic

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Member ID, Phone, or CNIC required' });
    }

    const member = await Member.findOne({
      gymId,
      $or: [
        { memberId: identifier.trim() },
        { phone: identifier.trim() },
        { cnic: identifier.trim() },
      ],
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found in database' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if member already checked in within last 3 hours
    const recentCheckIn = await Attendance.findOne({
      gymId,
      member: member._id,
      dateStr: todayStr,
    }).sort({ checkInTime: -1 });

    const attendance = await Attendance.create({
      gymId,
      member: member._id,
      memberId: member.memberId,
      memberName: member.name,
      checkInTime: new Date(),
      dateStr: todayStr,
      statusSnapshot: member.status,
    });

    res.json({
      success: true,
      message: `Welcome, ${member.name}! Admission approved.`,
      attendance,
      member: {
        id: member._id,
        memberId: member.memberId,
        name: member.name,
        status: member.status,
        plan: member.plan,
        dueAmount: member.dueAmount,
        expiryDate: member.expiryDate,
        photoUrl: member.photoUrl,
      },
      warning:
        member.status === 'expired'
          ? 'Membership Expired!'
          : member.status === 'due'
          ? `Pending Dues: PKR ${member.dueAmount}`
          : member.status === 'frozen'
          ? 'Membership is currently frozen.'
          : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendanceLogs = async (req, res) => {
  try {
    const gymId = req.gymId;
    const { date, limit = 50 } = req.query;
    const dateStr = date || new Date().toISOString().split('T')[0];

    const logs = await Attendance.find({ gymId, dateStr })
      .sort({ checkInTime: -1 })
      .limit(Number(limit));

    const totalToday = await Attendance.countDocuments({ gymId, dateStr });

    res.json({ success: true, date: dateStr, count: logs.length, totalToday, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
