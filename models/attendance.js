const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkIn: { type: Date, default: Date.now },
    date: { type: Date, default: Date.now },
    checkOut: { type: Date, default: null },
    totalWorkTime: { type: Number, default: 0 },
    status: { type: String, default: "present", lowercase: true },
    attendanceMode: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lateBy: { type: Number, default: 0 },
    earlyBy: { type: Number, default: 0 },
    overTime: { type: Number, default: 0 },
    dayDuration: { type: String },
    // ✅ Store full shift snapshot as object
    shift: {
      name: String,
      startTime: String, // "09:30 AM"
      endTime: String, // "07:30 PM"
      totalHours: Number,
      attendancePolicy: String,
      shiftEndsNextDay: Boolean,
      weekOff: {
        type: [String],
      },
      clockInMethod: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("attendance", attendanceSchema);
