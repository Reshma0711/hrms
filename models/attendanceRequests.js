const mongoose = require("mongoose");

const attendanceRequestSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hrApprovers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin or Manager         
      required: true,
    }],
    requestType: {
      type: String,
    },
    date: [{
      type: Date,
      required: true,
    }],
    clockInTime: {
      type: String,
    },
    clockOutTime: {
      type: String,
    },
    reason: {
      type: String,
      trim: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
    },
    workMode: {
      type: String,
      enum: ["wfo","wfh","onsite",""],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // For tracking if admin updated request
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AttendanceRequest", attendanceRequestSchema);
