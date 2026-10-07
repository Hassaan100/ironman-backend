import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    memberId: { type: String, required: true },
    memberName: { type: String, required: true },
    checkInTime: { type: Date, default: Date.now },
    dateStr: { type: String, required: true, index: true }, // YYYY-MM-DD
    statusSnapshot: { type: String, default: 'active' },
  },
  { timestamps: true }
);

AttendanceSchema.index({ gymId: 1, dateStr: 1 });

export const Attendance = mongoose.model('Attendance', AttendanceSchema);
