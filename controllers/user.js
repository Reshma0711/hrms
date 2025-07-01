const User = require("../models/user");
const { generateAccessAndRefreshTokens } = require("../middlewares/auth");
const crypto = require("crypto");
const Role = require("../models/role");
const { sendEmail } = require("../utils/sendEmail");
const { generateEmployeeId } = require("../utils/generateEmployeeId");
const {
  welcomeEmailTemplate,
  otpEmailTemplate,
} = require("../utils/emailTemplates");
const { generateOtp } = require("../utils/generateOtp");
const { comparePassword } = require("../utils/comparePassword");
const user = require("../models/user");
const { aggregatePipeline } = require("../utils/aggregations");
const Department = require("../models/department");
const createLeaveBalance = require("../utils/createLeaveBalance");
const { mergeUserPermissions } = require("../utils/mergePermissions");
const reorderUserFields = require("../utils/reOrder");
const Shift = require("../models/shift");

// HRMS Login Controller
exports.Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }
    // Find user and populate role and permissions
    const user = await User.findOne({ email })
      .populate({ path: "departmentName", model: "Department" })
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      })
      .populate({ path: "workDetails.shift", model: Shift });

    console.log("uuuuuuuuuuuuuuuu", user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "User is deactivated. Please contact the administrator.",
      });
    }
    if (user.isFirstLogin) {
      return res.status(400).json({
        success: false,
        message: "User needs to reset password.",
      });
    }
    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Password mismatch" });
    }
    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user
    );
    console.log("roleeeeeeeee", user.role);
    if (user.role && user.role.permissions) {
      console.log("prmmmmmmmmmmmm", user.role.permissions);
      user.role[0].permissions = mergeUserPermissions(user);
    }
    // Optionally add top-level permissions
    // userObj.permissions = finalPermissions;

    // Remove specialPermissions
    delete user.specialPermissions;
    // Remove password before sending response
    delete user.password;
    // Set cookies
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "Strict" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    const userObj = reorderUserFields(user);
    console.log("checkkkkkkkkkkk", userObj);

    // console.log("idddddddddd", userObj._id);
    res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .cookie("userId", user._id.toString())
      .json({
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        user: userObj,
      });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  const {
    email,
    temporaryPassword,
    oneTimePassword,
    newPassword,
    confirmPassword,
  } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    // :closed_lock_with_key: First-Time Login: check temporary password
    if (user.isFirstLogin) {
      if (!temporaryPassword) {
        return res
          .status(400)
          .json({ message: "Temporary password is required for first login." });
      }
      const isMatch = await comparePassword(temporaryPassword, user.password);
      // console.log("dfasdf",isMatch,temporaryPassword);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid temporary password." });
      }
      user.password = newPassword;
      user.isFirstLogin = false;
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Password reset successful (first login).",
      });
    }
    // :closed_lock_with_key: Forgot Password Flow: Verify OTP
    // if (!oneTimePassword || user.oneTimePassword !== oneTimePassword) {
    //   return res.status(400).json({ message: "Invalid OTP." });
    // }
    // if (Date.now() > user.otpExpiresAt) {
    //   return res.status(400).json({ message: "OTP has expired." });
    // }
    // user.password = newPassword;
    // user.oneTimePassword = null;
    // user.otpExpiresAt = null;
    // await user.save();
    // return res.status(200).json({
    //   success: true,
    //   message: "Password reset successful (OTP).",
    // });
  } catch (err) {
    next(err);
  }
};

exports.sendOTP = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.isFirstLogin) {
      return res
        .status(404)
        .json({ message: "User not found or not yet activated." });
    }
    const { otp, otpExpiresAt } = await generateOtp();
    user.oneTimePassword = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    sendEmail({
      to: email,
      subject: "Reset Your Password - OTP Verification",
      html: otpEmailTemplate({ fullName: user.fullName, otp }),
    });
    res.status(200).json({
      success: true,
      message: "OTP sent to email.",
    });
  } catch (err) {
    next(err);
  }
};

// exports.verifyForgotPasswordOTP = async (req, res, next) => {
//   const { email, oneTimePassword } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     if (
//       !user.oneTimePassword ||
//       user.oneTimePassword !== oneTimePassword ||
//       Date.now() > user.otpExpiresAt
//     ) {
//       return res.status(400).json({ message: "Invalid or expired OTP." });
//     }
//     return res.status(200).json({
//       success: true,
//       message: "OTP verified. You may now reset your password.",
//     });
//   } catch (err) {
//     next(err);
//   }
// };
// crud for employeee

exports.createEmployee = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      roleName,
      dob,
      gender,
      maritalStatus,
      bloodGroup,
      department,
      designation,
      mobileNumber,
      dependency,
      workDetails,
      customFields,
      leave_ids,
      permanentAddress, // ✅ Now destructuring this as a nested object
      bankDetails,
    } = req.body;
    console.log("req body =>", req.body);
    // :white_check_mark: Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !mobileNumber ||
      !roleName ||
      !department ||
      !designation
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (firstName, lastName, email, mobileNumber, role, department, designation) are required.",
      });
    }
    // :white_check_mark: Check if email already exists
    const existingUser = await user.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }
    // :white_check_mark: Check role
    const roleDoc = await Role.findById({ _id: roleName });
    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: `Role has not found.`,
      });
    }
    // :white_check_mark: Check department and designation
    const departmentDoc = await Department.findById({
      _id: department,
    });
    if (!departmentDoc) {
      return res.status(400).json({
        success: false,
        message: `Department is not found.`,
      });
    }
    if (!departmentDoc.designations.includes(designation)) {
      return res.status(400).json({
        success: false,
        message: `Designation "${designation}" does not exist in department "${department}".`,
      });
    }
    const shiftDoc = await Shift.findById({ _id: workDetails.shift });
    if (!shiftDoc) {
      return res.status(400).json({
        success: false,
        message: `Shift is not found.`,
      });
    }
    const fullName = `${firstName} ${lastName}`;
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const empId = await generateEmployeeId();
    // :white_check_mark: Create the new user object
    const newUser = new User({
      firstName,
      lastName,
      fullName,
      email,
      empId,
      mobileNumber,
      dob,
      departmentName: departmentDoc._id,
      designationName: designation,
      permanentAddress: {
        street: permanentAddress?.street,
        city: permanentAddress?.city,
        state: permanentAddress?.state,
        country: permanentAddress?.country,
        pincode: permanentAddress?.pincode,
      },
      role: roleDoc._id,
      gender,
      maritalStatus,
      bloodGroup,
      dependency,
      password: tempPassword,
      workDetails: {
        doj: workDetails?.doj,
        employmentStage: workDetails?.employmentStage,
        employmentType: workDetails?.employmentType,
        probationEndDate: workDetails?.probationEndDate,
        noticePeriodStartDate: workDetails?.noticePeriodStartDate,
        exitDate: workDetails?.exitDate,
        workLocation: workDetails?.workLocation,
        shift: workDetails?.shift,
      },
      bankDetails: {
        bankName: bankDetails?.bankName,
        accountHolderName: bankDetails?.accountHolderName,
        accountNumber: bankDetails?.accountNumber,
        ifscCode: bankDetails?.ifscCode,
      },
      isFirstLogin: true,
      customFields: { ...customFields },
    });
    await newUser.save();
    // :white_check_mark: Send welcome email
    sendEmail({
      to: email,
      subject: "Welcome to Ratnam Solutions Pvt Ltd - Temporary Login",
      html: welcomeEmailTemplate({ fullName, email, tempPassword }),
    });
    console.log(newUser, leave_ids);
    await createLeaveBalance(newUser._id, leave_ids);
    // console.log(newUser._id,leave_ids)

    res.status(201).json({
      success: true,
      message: "Employee created and email sent.",
      empId,
    });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};

exports.getAllEmployees = async (req, res, next) => {
  try {
    const superadminRole = await Role.findOne({ roleName: "superadmin" });
    const users = await User.find({
      role: { $nin: [superadminRole?._id] },
    })
      .populate({
        path: "role",
        populate: { path: "permissions", model: "Permission" },
      })
      .populate("specialPermissions.allow")
      .populate("specialPermissions.deny")
      .populate("departmentName")
      .select("-password");
    const employees = users.map((user) => {
      const mergedPermissions = mergeUserPermissions(user); // Must return full permission objects
      const userObj = user.toObject();
      // Replace role.permissions with final merged permissions
      if (userObj.role && Array.isArray(userObj.role) && userObj.role[0]) {
        userObj.role[0].permissions = mergedPermissions;
      }
      // Clean response
      delete userObj.specialPermissions;
      delete userObj.password;
      return userObj;
    });
    res.status(200).json({ success: true, data: employees });
  } catch (err) {
    console.error("Error fetching employees:", err);
    next(err);
  }
};

exports.getEmployeeById = async (req, res, next) => {
  try {
    const employee = await User.findById(req.params.id)
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      })
      .populate("specialPermissions.allow")
      .populate("specialPermissions.deny")
      .populate("departmentName")
      .populate({ path: "workDetails.shift", model: "Shift" })
      .populate({ path: "workDetails.workLocation", model: "Location" })
      .select("-password");

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const mergedPermissions = mergeUserPermissions(employee);
    // console.log("nameeee",employee.role.roleName)
    const userObj = {
      id: employee._id,
      fullName: employee.fullName,
      roleName: employee.role[0].roleName,
      permissions: mergedPermissions,
    };
    res.status(200).json({ success: true, data: userObj });
  } catch (err) {
    console.error("Error fetching employee:", err);
    next(err);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }
    const updateData = { ...req.body };
    // Always recalculate fullName from updated or existing values
    updateData.fullName = `${req.body.firstName || existingUser.firstName} ${
      req.body.lastName || existingUser.lastName
    }`;
    // Directly replace nested objects as-is from frontend (overwrite)
    if (req.body.permanentAddress) {
      updateData.permanentAddress = req.body.permanentAddress;
    }
    if (req.body.dependency) {
      updateData.dependency = req.body.dependency;
    }
    if (req.body.workDetails) {
      updateData.workDetails = req.body.workDetails;
    }
    if (req.body.roleName) {
      updateData.role = req.body.roleName;
    }
    if (req.body.department) {
      updateData.departmentName = req.body.department;
    }
    if (req.body.designation) {
      updateData.designationName = req.body.designation;
    }
    if (req.body.specialPermissions) {
      updateData.specialPermissions = {
        allow: [
          ...(existingUser.specialPermissions?.allow || []),
          ...(req.body.specialPermissions.allow || []),
        ],
        deny: [
          ...(existingUser.specialPermissions?.deny || []),
          ...(req.body.specialPermissions.deny || []),
        ],
      };

      // Remove duplicates
      let allow = [
        ...new Set(
          updateData.specialPermissions.allow.map((id) => id.toString())
        ),
      ];
      let deny = [
        ...new Set(
          updateData.specialPermissions.deny.map((id) => id.toString())
        ),
      ];

      // Step 1: If a permission exists in both, keep only the one in the latest update
      const latestAllow = new Set(
        req.body.specialPermissions.allow?.map((id) => id.toString()) || []
      );
      const latestDeny = new Set(
        req.body.specialPermissions.deny?.map((id) => id.toString()) || []
      );

      // Remove overlaps (priority to latest)
      allow = allow.filter((id) => !latestDeny.has(id));
      deny = deny.filter((id) => !latestAllow.has(id));

      updateData.specialPermissions.allow = allow;
      updateData.specialPermissions.deny = deny;

      console.log("FINAL allow:", allow);
      console.log("FINAL deny:", deny);
    }
    const updatedEmployee = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    })
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      })
      .populate("specialPermissions.allow")
      .populate("specialPermissions.deny")
      .populate("departmentName")
      .select("-password")
      .exec();
    const mergedPermissions = mergeUserPermissions(updatedEmployee);
    // console.log("nameeee",employee.role[0].roleName)
    updatedEmployee.role[0].permissions = mergedPermissions;

    console.log("updatedEmployeeeeeeeeeeeee", updatedEmployee);

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      updatedEmployee,
    });
  } catch (error) {
    console.error("Update error:", error);
    next(error);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId)
      .populate({
        path: "role",
        populate: {
          path: "permissions",
          model: "Permission",
        },
      })
      .populate("specialPermissions.allow")
      .populate("specialPermissions.deny")
      .populate("departmentName")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Convert to plain JS object
    const userObj = user.toObject();

    // Merge permissions from role and specialPermissions
    if (userObj.role && Array.isArray(userObj.role) && userObj.role[0]) {
      userObj.role[0].permissions = mergeUserPermissions(user);
    }

    // console.log("permission",userObj.role[0].permissions)

    // Remove special permissions from response
    delete userObj.specialPermissions;

    // Remove password (in case it exists, even though .select("-password") used)
    delete userObj.password;

    // console.log("Final user object:", JSON.stringify(userObj, null, 2)); // ✅ Inspect output

    return res.status(200).json({
      success: true,
      data: userObj,
    });
  } catch (err) {
    console.error("Error in getUserProfile:", err);
    next(err);
  }
};

exports.updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    console.log("upderefjhjooooooooooooooooooo", req.body);

    const allowedFields = new Set([
      "firstName",
      "lastName",
      "mobileNumber",
      "dob",
      "gender",
      "maritalStatus",
      "permanentAddress",
      "dependency",
      "bloodGroup",
      "bankDetails",
      "customFields",
    ]);

    const updateData = {};
    for (const key in req.body) {
      if (allowedFields.has(key)) {
        updateData[key] = req.body[key]; // initial assign, may override later for nested
      }
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Recalculate fullName
    const firstName = updateData.firstName || existingUser.firstName;
    const lastName = updateData.lastName || existingUser.lastName;
    updateData.fullName = `${firstName} ${lastName}`;

    // Merge nested permanentAddress
    if (req.body.permanentAddress) {
      updateData.permanentAddress = {
        ...(existingUser.permanentAddress || {}),
        ...(req.body.permanentAddress || {}),
      };
    }

    // Merge dependency (single object)
    if (req.body.dependency) {
      updateData.dependency = {
        ...(existingUser.dependency || {}),
        ...(req.body.dependency || {}),
      };
    }

    // Bank Details
    if (req.body.bankDetails) {
      updateData.bankDetails = {
        ...(existingUser.bankDetails || {}),
        ...(req.body.bankDetails || {}),
      };
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    next(err);
  }
};

exports.logout = (req, res) => {
  res
    .clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    })
    .status(200)
    .json({ message: "Logged out successfully" });
};

exports.birthdays = async (req, res, next) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

    const birthdays = await User.aggregate([
      {
        $addFields: {
          birthMonth: { $month: "$dob" },
        },
      },
      {
        $match: {
          birthMonth: { $in: [previousMonth, currentMonth, nextMonth] },
        },
      },
      {
        $project: {
          _id: 1,
          empId: 1,
          fullName: 1,
          dob: 1,
        },
      },
    ]);
    return res.status(200).json({ result: birthdays, success: true });
  } catch (error) {
    next(error);
  }
};
