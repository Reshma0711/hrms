const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true }, // NEW FIELD: title for short summary
  message: { type: String, required: true }, // existing detailed message

  module: {
    type: String,
    required: true,
    enum: ["user", "attendance", "leaves", "payroll", "holiday", "project", ""],
  },

  type: {
    type: String,
    required: true,
    enum: [
      "employee_delete_request",
      "clockIn-request",
      "wfh-request",
      "attendanceUpdate-request",
      "attendance_missing",
      "leave_request",
      "leave_approved",
      "payroll_generated",
      "deactivation_response",
      "",
    ],
  },

  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who triggered the action
  requesteduserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deleteUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // target employee
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // superadmin
  attendanceRequestDetails: {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    hrApprovers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    date: Date,
    clockInTime: String,
    clockOutTime: String,
    reason: String,
    shift:{type: mongoose.Schema.Types.ObjectId, ref: "shift"},
    workMode: {
      type: String,
      enum: ["wfo", "wfh", "onsite", ""],
    },
    adminNote: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", ""],
    default: "pending",
  },

  isOpen: {
    type: Boolean,
    default: false,
  },

  to: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // recipient of the notification

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
