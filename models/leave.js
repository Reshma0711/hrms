const mongoose = require("mongoose");

const leaveTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    maxApplicable: { type: Number, required: true, default: 5 },
    totalLeavesPerYear: { type: Number, required: true },
    carryForward: { type: Boolean, default: false },
    maxCarryForward: { type: Number, default: 0 },
    encashable: { type: Boolean, default: false },
    assignLeavesPer: { type: Number, enum: [12, 6, 3, 1], default: 12 },
    description: { type: String },
    label: { type: String },
    additionalLeaves: { type: Number, default: 0.0 },
    allocationLeaves: { type: Number, default: 0.0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveType", leaveTypeSchema);
