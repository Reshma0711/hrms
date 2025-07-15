const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Leave = require("../models/leave");


const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    userid: { type: String, unique: true },
    password: { type: String }, // password for login
    isFirstLogin: { type: Boolean, default: true },
    oneTimePassword: { type: String },
    otpExpiresAt: { type: Date }, 
    mobileNumber: { type: String },
    empId: { type: String, required: true, unique: true },
    dob: { type: Date },
    departmentName: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    designationName: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other", ""] },
    maritalStatus: { type: String, enum: ["Single", "Married", ""]},
    role: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
    specialPermissions: {
      allow: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
      deny: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: "",
    },
    dependency: {
      name: String,
      mobileNumber: String,
    },
    permanentAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: String,
      country: String,
    },
    // ✅ New workDetails object
    workDetails: {
      doj: { type: Date }, // Date of joining
      employmentStage: {
        type: String,
        enum: [
          "Probation(3months)",
          "Probation(6months)",
          "NoticePeriod(1month)",
          "NoticePeriod(3months)",
          "Confirmed",
          "Terminated",
          "",
        ],
        default: "",
      }, // e.g. "probation", "confirmed"
      employmentType: {
        type: String,
        enum: ["Internship", "Fulltime", "Contract", "PartTime", ""],
        default: "",
      }, // e.g. "full-time", "part-time", "contract"
      probationEndDate: { type: Date, default: null },
      noticePeriodStartDate: { type: Date, default: null },
      exitDate: { type: Date, default: null },
      shift: { type: mongoose.Schema.Types.ObjectId, ref: "shift" },
      workLocation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
      },
      
    },
    bankDetails: {
      bankName: {
        type: String,
        trim: true,
      },
      accountHolderName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
      },
    },
    leaveBalance: [
      {
        name: { type: String },
        code: { type: String },
        totalLeaves: { type: Number },
        balance: { type: Number },
        used: { type: Number },
        additionalLeaves:{type:Number},
        leaveTypeId:{type:mongoose.Schema.Types.ObjectId,ref:"LeaveType"},
        _id: false,
      },
    ],
    isActive: { type: Boolean, default: true },
    leaveIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "leaveType" }],
    customFields: { type: mongoose.Schema.Types.Mixed },
    attendance: [{ type: mongoose.Schema.Types.ObjectId, ref: "attendance" }],
  },

  { timestamps: true }
);

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.pre("save", async function (next) {
  if (this.userid) return next();
  const lastUser = await this.constructor.findOne().sort({ userid: -1 });
  let newId = 101;

  if (lastUser && lastUser.userid) {
    const lastNumber = parseInt(lastUser.userid.substring(1), 10);
    newId = lastNumber + 1;
  }

  this.userid = `E${newId}`;
  next();
});

module.exports = mongoose.model("User", userSchema);

// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true
//   },
//   password: {
//     type: String,
//     required: true,

//   },
//   role: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Role',
//     required: true
//   }
// }, { timestamps: true });

// // Pre-save middleware to hash the password
// userSchema.pre('save', async function (next) {
//   // Only hash the password if it has been modified (or is new)
//   if (!this.isModified('password')) return next();

//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (err) {
//     next(err);
//   }
// });

// // Optional: method to compare entered password with stored hashed password
// userSchema.methods.comparePassword = async function (candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// const User = mongoose.model('User', userSchema);

// module.exports = User;
