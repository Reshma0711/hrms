const mongoose = require("mongoose");

const leaveApplicationSchema = mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    leaveTypeCode: { type: String, required: true },
    leaveDate: { type: Date, required: true },
    durationType: { type: String },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedBy:{ type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String, default: "" },
    mainBalance: { type: Number },
    additionalBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("leaveApplication", leaveApplicationSchema);
