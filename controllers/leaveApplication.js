const LeaveApplication = require("../models/leaveApplication");
const User = require("../models/user");
const EmployeeLeaveDates = require("../models/employeeLeaveDates");
const Leave = require("../models/leave");

const isLeaveOverlapping = async (user_id, fromDate, toDate) => {
  const overlapping = await LeaveApplication.findOne({
    user_id: user_id,
    status: { $in: ["pending", "accepted"] },
    $or: [
      {
        fromDate: { $lte: toDate },
        toDate: { $gte: fromDate },
      },
    ],
  });
  return !!overlapping; // returns true if overlap exists
};

const createLeaveApplication = async (req, res, next) => {
  try {
    const {
      user_id,
      empId,
      fromDate,
      toDate,
      leaveDates,
      leaveTypeCode,
      numberOfDays,
      reason="",
    } = req.body;

    // 1. Validate required fields
    if (!empId || !fromDate || !toDate || !leaveTypeCode || !numberOfDays) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (empId, fromDate, toDate, leaveTypeCode, numberOfDays) are required.",
      });
    }

        //checking date order
   const checkOrder =  (new Date(fromDate.toString()) <= new Date(toDate.toString()));
    if(!checkOrder){
      return res.status(406).json({success:false,message:"from date should not be less than to date"})
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffInMs = end - start;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24) + 1;

    // checking numberOfDays is equals to the fromDAte and toDate
    if(!(diffInDays === numberOfDays)){
      return res.status(406).json({success:false,message:"number of days are not equal to the dates given"})
    }
         // checking whether leave date is today
    // if((new Date().setHours(0,0,0,0) === new Date(fromDate).setHours(0,0,0,0))){
    //   return res.status(406).json({success:false,message:"from date cannot be today"})
    // }

    // 2. Validate user
    const existingUser = await User.findById(user_id);
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // 3. Check leave balance
    const leaveType = existingUser.leaveBalance.find(
      (lt) => lt.code === leaveTypeCode
    );

    if (!leaveType) {
      return res
        .status(400)
        .json({ success: false, message: "Leave type not found." });
    }

    if (leaveType.balance < numberOfDays) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient leave balance." });
    }

    const maxDays = (await Leave.findOne({ code: leaveTypeCode }))
      .maxApplicable;

    if (numberOfDays > maxDays) {
       return res
        .status(406)
        .json({
          success: false,
          message: `you cannot apply more than ${maxDays} days`,
        });
    }

    const existingLeaveApplications = await LeaveApplication.find({
      user_id,
      leaveTypeCode,
      status:"pending"
    });

    const total =
    numberOfDays + existingLeaveApplications.reduce((acc, el) => acc + el.numberOfDays, 0);

    console.log(total,leaveType.balance)
    if (!(total <= leaveType.balance)) {
      return res.status(406).json({
        success: false,
        message: `you cannot apply the leave. you have already applied ${total - numberOfDays} leaves `,
      });
    }

    const isOverlapping = await isLeaveOverlapping(
      user_id,
      new Date(fromDate),
      new Date(toDate)
    );
    if (isOverlapping) {
      return res.status(400).json({
        success: false,
        message: "Leave application already exists within this days.",
      });
    }

    const newApplication = await LeaveApplication.create({
      user_id,
      empId,
      fromDate,
      toDate,
      leaveTypeCode,
      numberOfDays,
      reason,
      leaveDates,
    });

    return res.status(200).json({
      success: true,
      message: "Leave application submitted.",
      result: newApplication,
    });
  } catch (error) {
    next(error);
  }
};

const getAllApplications = async (req, res, next) => {
  try {
    const allApplications = await LeaveApplication.find().populate(
      "approvedBy",
      "fullName -_id"
    )
    .populate("revokedBy","fullName -_id");
    res.status(200).json({ success: true, result: allApplications });
  } catch (error) {
    next(error);
  }
};

const userSpecificApplications = async (req, res, next) => {
  try {
    const allApplications = await LeaveApplication.findById(req.body.user_id);
    res.status(200).json({ success: true, result: allApplications });
  } catch (error) {
    next(error);
  }
};

const getAllLeaveDates = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const dateArray = [];

  while (start <= end) {
    // Push a **new** date object to avoid reference issues
    dateArray.push(new Date(start).toString());
    start.setDate(start.getDate() + 1);
  }

  return dateArray;
};
 
const acceptApplication = async (req, res, next) => {
  try {
    const { application_id, approvedBy_id, remarks = "" } = req.body;
    const EA = await LeaveApplication.findById(application_id);
   
    if (EA.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Application already ${EA.status}`,
      });
    }

    if (!EA) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }
    // Optional: Check if leave balance is sufficient before deducting
    const user = await User.findById(EA.user_id);
    const leave = user.leaveBalance.find((l) => l.code === EA.leaveTypeCode);

    if (!leave) {
      return res
        .status(400)
        .json({ success: false, message: "Leave type not found for user" });
    }

    if (leave.balance < EA.numberOfDays) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient leave balance" });
    }

    const updateResult = await User.updateOne(
      { _id: user._id, "leaveBalance.code": EA.leaveTypeCode },
      {
        $inc: {
          "leaveBalance.$.balance": -EA.numberOfDays,
          "leaveBalance.$.used": EA.numberOfDays,
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Leave balance update failed" });
    }

    for (obj of EA.leaveDates) {
      await EmployeeLeaveDates.create({
        user_id: EA.user_id,
        date: obj.leaveDate,
        day: obj.day,
        code:EA.leaveTypeCode,
        application_id:EA._id
      });
    }

    EA.status = "accepted";
    EA.approvedBy = approvedBy_id;
    await EA.save();

    return res
      .status(200)
      .json({ success: true, message: "Leave approved and balance updated" });
  } catch (error) {
    next(error);
  }
};

const rejectApplication = async (req, res, next) => {
  try {
    const { application_id, remarks="", approvedBy } = req.body;
    const EA = await LeaveApplication.findById(application_id);

    EA.status = "rejected";
    EA.approvedBy = approvedBy;
    EA.remarks = remarks; 
    await EA.save();
  return res.status(200).json({success:true,message:"leave application rejected"});
  } catch (error) {
    next(error);
  }
};

const revokeApplication = async (req, res, next) => {
  try {
    const { application_id, user_id , revokedBy } = req.body;

    // 1. Fetch the leave application
    const EA = await LeaveApplication.findById(application_id);

    if (!EA) {
      return res.status(404).json({ success: false, message: "Leave application not found" });
    }

    // 2. Allow revoke only if already accepted
    if (EA.status !== "accepted") {
      return res.status(406).json({ success: false, message: "Cannot perform the action. Only 'accepted' leaves can be revoked." });
    }

    // 3. Delete all leave records for that application
    await EmployeeLeaveDates.deleteMany({ user_id, application_id });

    // 4. Reverse leave balance and used count
    const updateResult = await User.updateOne(
      { _id: user_id, "leaveBalance.code": EA.leaveTypeCode },
      {
        $inc: {
          "leaveBalance.$.balance": EA.numberOfDays,
          "leaveBalance.$.used": -EA.numberOfDays,
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ success: false, message: "Leave balance update failed. Leave type may not exist in user's balance." });
    }

    // 5. Set application status back to pending
    EA.status = "pending";
    EA.revokedBy = revokedBy;
    await EA.save();

    return res.status(200).json({ success: true, message: "Revoked leaves successfully" });

  } catch (error) {
    console.error("Error in revokeApplication:", error);
    return next(error); // Proper error middleware flow
  }
};


module.exports = {
  createLeaveApplication,
  getAllApplications,
  userSpecificApplications,
  acceptApplication,
  rejectApplication,
  revokeApplication
};
