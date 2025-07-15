const mongoose = require("mongoose");
const shiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    shiftType: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night", ""],
      default: "",
    },
    weekOff: {
      type: [String],
      enum: [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ],
      default: [],
    },
    canLoginBefore: { type: Number, default: 0 },
    shiftPolicy: String,
    shiftEndsNextDay: { type: Boolean, default: false },
    totalHours: { type: Number, required: true },
    weekOff_codes: [{ type: Number }],
  },
  { timestamps: true }
);
module.exports = mongoose.model("shift", shiftSchema);



















