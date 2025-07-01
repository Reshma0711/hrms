const User = require("../models/user");
const Attendance = require("../models/attendance");
const AttendanceRegularize = require("../models/regularizationRequests");
const mongoose = require("mongoose");
const startAndend = require("../utils/getStartAndEnd");

const bulkregularization = async (req, res, next) => {
  try {
    const { user_id, dates } = req.body;

    // Step 1: Check if any regularization requests already exist
    const existingRequests = await AttendanceRegularize.find({
      user_id,
      status: "pending",
      dates: { $in: dates },
    });

    if (existingRequests.length > 0) {
      return res.status(406).json({
        message: "Request already exists for one or more dates",
        conflictDates: existingRequests.map((r) => r.dates[0]),
      });
    }

    // Step 2: Fetch user with shift
    const existingUser = await User.findById(user_id).populate("shift");
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { shift } = existingUser;
    const shiftEndHour = new Date(shift.end).getHours();
    const shiftEndMinute = new Date(shift.end).getMinutes();

    // Step 3: Build queries for all dates
    const updates = [];

    for (const dateStr of dates) {
      const { start, end } = startAndend(dateStr);

      const attendance = await Attendance.findOne({
        user_id,
        createdAt: { $gte: start, $lte: end },
      });

      if (!attendance) {
        console.warn(`No attendance found for user ${user_id} on ${dateStr}`);
        continue;
      }

      const checkoutDate = new Date(dateStr);
      if (shift.shiftEndsNextDay) {
        checkoutDate.setDate(checkoutDate.getDate() + 1);
      }
      checkoutDate.setHours(shiftEndHour, shiftEndMinute, 0, 0);

      updates.push({
        updateOne: {
          filter: { _id: attendance._id },
          update: {
            $set: {
              checkOut: checkoutDate,
              status: "present",
            },
          },
        },
      });
    }

    // Step 4: Bulk update
    if (updates.length > 0) {
      await Attendance.bulkWrite(updates);
    }

    return res.status(200).json({ message: "Regularization completed." });
  } catch (error) {
    next(error);
  }
};

const autoRegularization = async (req, res, next) => {
  try {
    const { user_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const existingUser = await User.findById(user_id).populate("shift");
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    const todayStart = new Date(now).setHours(0, 0, 0, 0);

    const attendanceData = await Attendance.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
          checkOut: null,
          checkIn: { $ne: null, $lt: todayStart },
          createdAt: { $gte: start, $lt: end },
          status: "absent",
        },
      },
    ]);

    if (!attendanceData.length) {
      return res
        .status(404)
        .json({ message: "No attendance records found to regularize." });
    }

    const userShift = existingUser.shift;
    const shiftEndHour = new Date(userShift.end).getHours();
    const shiftEndMinute = new Date(userShift.end).getMinutes();

    const updates = attendanceData.map((doc) => {
      let checkoutDate = new Date(doc.checkIn);
      if (userShift.shiftEndsNextDay) {
        checkoutDate.setDate(checkoutDate.getDate() + 1);
      }
      checkoutDate.setHours(shiftEndHour, shiftEndMinute, 0, 0);

      const TWH = calculateTime(doc.checkIn, checkoutDate).totalMinutes;
      console.log(TWH);
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              checkOut: checkoutDate,
              status: "present",
              totalWorkTime: TWH,
            },
          },
        },
      };
    });

    await Attendance.bulkWrite(updates);

    return res.status(200).json({
      success: true,
      message: "Auto-regularization completed.",
      updated: updates.length,
    });
  } catch (error) {
    console.error("AutoRegularize Error:", error);
    next(error);
  }
};

const applyRegularization = async (req, res, next) => {
  try {
    const { user_id, dates } = req.body;
    const existingUser = await User.findById(user_id);
    if (!existingUser) {
      return res.status(404).json({ message: "user not found" });
    }

    const { start, end } = startAndend(dates[0]);

    // Convert input to YYYY-MM-DD strings
    const inputDateStrings = dates.map(
      (d) => new Date(d).toISOString().split("T")[0]
    );

    // Fetch all pending requests for the user
    const existingRequests = await AttendanceRegularize.find({
      user_id,
      status: "pending",
    });

    // Flatten all stored dates to YYYY-MM-DD strings
    const existingDateStrings = existingRequests.flatMap((doc) =>
      doc.dates.map((d) => new Date(d).toISOString().split("T")[0])
    );

    // Check for overlap
    const conflictDate = inputDateStrings.find((d) =>
      existingDateStrings.includes(d)
    );

    if (conflictDate) {
      return res
        .status(409)
        .json({ message: `Request already exists for date ${conflictDate}` });
    }

    const applied = await AttendanceRegularize.create({
      user_id,
      dates,
      userName: existingUser.fullName,
    });

    return res.status(201).json({
      success: true,
      message: "appiled successfully",
      result: applied,
    });
  } catch (error) {
    next(error);
  }
};

const getRegularizationRequests = async (req, res, next) => {
  const {user_id} = req.body;

  if(user_id){
    const baseDate = new Date();
    const year = baseDate.getFullYear()
    const fromMonth = baseDate.getMonth();
    const toMonth = fromMonth + 2
    const startMonth = new Date(year,fromMonth,1,0,0,0,0);
    const endMonth = new Date(year,toMonth,1,0,0,0,0);
   
          
    const allRequest = await AttendanceRegularize.find({
      user_id,
      createdAt:{$gt:startMonth,$lt:end}
    })
  }else{
    const baseDate = new Date();
    const year = baseDate.getFullYear()
    const fromMonth = baseDate.getMonth();
    const toMonth = fromMonth + 2
    const startMonth = new Date(year,fromMonth,1,0,0,0,0);
    const endMonth = new Date(year,toMonth,1,0,0,0,0);
   
          
    const allRequest = await AttendanceRegularize.find({
      createdAt:{$gt:startMonth,$lt:end}
  })
  return res.status(200).json({result:allRequest})
};}

const revokeRegularization = async (req, res, next) => {
  try {
    const { request_id } = req.body;
    const revokedRequest = await AttendanceRegularize.findByIdAndDelete(
      request_id,
      { new: true }
    );
    return res.status(200).json({ message: "request deleted", revokedRequest });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bulkregularization,
  autoRegularization,
  applyRegularization,
  revokeRegularization,
};
