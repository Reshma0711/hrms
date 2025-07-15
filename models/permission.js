const mongoose = require("mongoose");

const actionLogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  module: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    enum: [
      "role",
      "admin",
      "location",
      "employees",
      "attendance",
      "department",
      "leaves",
      "sidebar",
      "space",
      "profile",
      "holidays",
      "documents",
      "payroll",
      "shift",
      "attendancemode",
    ],
  },
  action: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    enum: [
      "create",
      "delete",
      "view",
      "update",
      "checkin",
      "selfview",
      "checkout",
      "approve",
      "reject",
      "viewdashboard",
      "viewprofile",
      "viewattendance",
      "viewholidays",
      "viewleaves",
      "viewpayrolls",
      "viewmanage",
      "viewadminspace",
      "web",
      "mobile",
      "biometric",
    ],
  },
  description: {
    type: String,
    trim: true,
  },
});

// ✅ Correct naming: define schema and model separately
const Permission = mongoose.model("Permission", actionLogSchema);

// ✅ Export model (not schema)
module.exports = Permission;
