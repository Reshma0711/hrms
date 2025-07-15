const mongoose = require("mongoose");

const employeeLeaveDatesSchema = mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    code: { type: String, required: true },
    day: { type: String, enum: ["full", "half"], required: true },
    application_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "leaveApplication",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("employeeLeaveDates", employeeLeaveDatesSchema);
