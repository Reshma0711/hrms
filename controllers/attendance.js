const attendance = require("../models/attendance");
const Attendance = require("../models/attendance");
const User = require("../models/user");
const EmployeeLeaveDates = require("../models/employeeLeaveDates");
const employeeIdList = require("../utils/employeeIdList");
const Leave = require("../models/leave");
const { Types } = require("mongoose");
const mongoose = require("mongoose");
const startAndend = require("../utils/getStartAndEnd");

function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getISOtoMinutes = (x) => {
  const date = new Date(x);
  return date.getHours() * 60 + date.getMinutes();
};

function isWithinShift(currentMinutes, start, end) {
  if (start <= end) {
    // Same day shift (e.g., 9 AM - 5 PM)
    return currentMinutes >= start && currentMinutes <= end;
  } else {
    // Overnight shift (e.g., 11 PM - 7 AM)
    return currentMinutes >= start || currentMinutes <= end;
  }
}

const calculateTime = (start, end) => {
  const date1 = new Date(start);
  const date2 = new Date(end);

  const diffMilliseconds = date2.getTime() - date1.getTime();

  const diffSeconds = diffMilliseconds / 1000;
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = Math.floor(diffSeconds % 60);

  const isNegative = date2 < date1;
  const sign = isNegative ? "-" : "";
  return {
    formatted: `${sign}${hours}h ${minutes}m ${seconds}s`,
    hours,
    minutes,
    seconds,
    totalMinutes: hours * 60 + minutes,
  };
};

function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

const checkIn = async (req, res, next) => {
  try {
    const { empId, user_id, mode, longDistance, latDistance } = req.body;

    // 1. Check if already checked in today
    const today = new Date();
    const { start, end } = startAndend(today);

    const existingAttendance = await Attendance.findOne({
      user_id,
      checkIn: { $gte: start, $lte: end },
    });

    if (existingAttendance) {
      return res.status(406).json({
        success: false,
        message: "Already checked in today.",
      });
    }

    // 2. Validate coordinates
    if (!latDistance || !longDistance) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required for check-in.",
      });
    }

    // 3. Get user and populate shift and location
    const user = await User.findById(user_id).populate([
      { path: "shift", model: "shift" },
      { path: "workDetails.workLocation", model: "Location" },
    ]);

    // if(!(user.checkInModes.includes(logInMode))){
    //   return res.status(404).json({success:false,message:"checkin mode not allowed"})
    // }

    if (!user || !user.shift || !user.workDetails?.workLocation) {
      return res.status(404).json({
        success: false,
        message: "User, shift or location not found.",
      });
    }

    // 4. Optional: Geo-location distance check
    /*
    const { lat, lng } = user.workDetails.workLocation.geo;
    const maxDistance = user.workDetails.workLocation.distance;
    const distance = calculateDistance(latDistance, longDistance, lat, lng);

    if (distance > maxDistance) {
      return res.status(406).json({
        success: false,
        message: "Out of the office range.",
      });
    }
    */

    // 5. Extract shift details
    const { name, canLoginBefore, totalHours, shiftEndsNextDay } = user.shift;

    const shiftStart = new Date(user.shift.start);
    const shiftEnd = new Date(user.shift.end);
    if (shiftEndsNextDay) shiftEnd.setDate(shiftEnd.getDate() + 1);

    const shiftStartMins = getISOtoMinutes(shiftStart);
    const shiftEndMins = getISOtoMinutes(shiftEnd);
    const currentMins = getISOtoMinutes(Date.now());

    // 6. Check if current time is within shift window
    const isWithinShiftWindow = isWithinShift(
      currentMins,
      shiftStartMins - canLoginBefore,
      shiftEndMins
    );

    if (!isWithinShiftWindow) {
      return res.status(405).json({
        success: false,
        message: "Check-in not allowed (not within shift timings).",
      });
    }

    // 7. Calculate late or early
    const lateBy = Math.max(currentMins - shiftStartMins, 0);
    const earlyBy = Math.max(shiftStartMins - currentMins, 0);

    // 8. Mark attendance
    const markedAttendance = await Attendance.create({
      empId,
      user_id,
      mode,
      earlyBy,
      lateBy,
      shiftName: name,
      shiftBegin: formatTime(shiftStart),
      shiftEnds: formatTime(shiftEnd),
      totalShiftHours: totalHours,
    });

    // 9. Update user's attendance array
    await User.findByIdAndUpdate(user_id, {
      $push: { attendance: markedAttendance._id },
    });

    // 10. Success response
    res.status(200).json({ success: true, result: markedAttendance });
  } catch (error) {
    next(error);
  }
};

function checkTimeOrder(checkinT, checkOutT) {
  return new Date(checkinT.toString()) < new Date(checkOutT.toString());
}

function convertDateFormat(inputDateString) {
  const date = new Date(inputDateString); // Parses the string

  // Convert to UTC
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+00:00`;
}

function areDatesSameDay(date1, date2, date3) {
  const DATE1 = new Date(date1.toString());
  const DATE2 = new Date(date2.toString());

  DATE1.setHours(0, 0, 0, 0);
  DATE2.setHours(0, 0, 0, 0);

  if (date3) {
    const DATE3 = new Date(date3.toString());
    DATE3.setHours(0, 0, 0, 0);

    return (
      DATE1.getTime() === DATE2.getTime() && DATE2.getTime() === DATE3.getTime()
    );
  }

  return DATE1.getTime() === DATE2.getTime(); // Compare their timestamps
}

const checkOut = async (req, res, next) => {
  try {
    const { user_id } = req.body;

    // 1. Define start and end of the current day

    const { start, end } = startAndend(Date.now());

    // 2. Find today's check-in document
    const attendance = await Attendance.findOne({
      user_id,
      checkIn: { $gte: start, $lte: end },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Check-in record not found for today.",
      });
    }

    if (attendance.checkOut) {
      return res.status(409).json({
        success: true,
        message: "Already checked out today.",
      });
    }

    // 3. Mark check-out and calculate work time
    const checkOutTime = Date.now();
    const { totalMinutes } = calculateTime(attendance.checkIn, checkOutTime);

    attendance.checkOut = checkOutTime;
    attendance.totalWorkTime = totalMinutes;

    if (totalMinutes > attendance.totalShiftHours) {
      attendance.overTime = totalMinutes - attendance.totalShiftHours;
    }

    await attendance.save();

    res.status(200).json({ success: true, result: attendance });
  } catch (error) {
    next(error);
  }
};

const updateAttendance = async (req, res, next) => {
  try {
    const user_id = req.params.id;
    const {
      updatedCheckInTime,
      updatedCheckOutTime,
      updatedBy_id,
      status,
      mode,
      date,
      leaveTypeCode,
    } = req.body;

    if (status !== "absent" && status !== "present") {
      const { start, end } = startAndend(date);
      const existingAttendance = await Attendance.findOne({
        user_id,
        createdAt: { $gte: start, $lte: end },
      });

      if (!existingAttendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance not found for the given date.",
        });
      }

      if (!updatedBy_id) {
        return res
          .status(400)
          .json({ success: false, message: "UpdatedBy ID is required." });
      }

      if (!leaveTypeCode) {
        return res
          .status(400)
          .json({ success: false, message: "LeaveTypeCode is required." });
      }

      const existingLeaveType = await Leave.findOne({ code: leaveTypeCode });
      if (!existingLeaveType) {
        return res
          .status(400)
          .json({ success: false, message: "no such leave type code exist" });
      }

      const existingUser = await User.findById(user_id);

      let leaveTypeExists = false;

      for (LT of existingUser.leaveBalance) {
        if (LT.code === leaveTypeCode && LT.totalLeaves > 0) {
          leaveTypeExists = true;
        }
      }

      if (!leaveTypeExists) {
        res.status(406).json({
          success: false,
          message: "invalid leaveType code or no leave balance",
        });
      }

      const updateResult = await User.updateOne(
        { _id: user_id, "leaveBalance.code": leaveTypeCode },
        {
          $inc: {
            "leaveBalance.$.balance": -1,
            "leaveBalance.$.used": 1,
          },
        }
      );
      // const x = await User.findById(user_id).populate("shift");
      // console.log(x);
      if (updateResult.modifiedCount === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Leave balance update failed. Leave type may not exist in user's balance.",
        });
      }

      existingAttendance.status = existingLeaveType.name;
      existingAttendance.updatedBy = updatedBy_id;
      await existingAttendance.save();

      return res.status(200).json({
        success: true,
        result: existingAttendance,
        message: "update successful",
      });
    } else {
      const { start, end } = startAndend(date);

      const existingAttendance = await Attendance.findOne({
        user_id,
        createdAt: { $gte: start, $lte: end },
      });

      if (!existingAttendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance not found for the given date.",
        });
      }

      if (!updatedBy_id) {
        return res
          .status(400)
          .json({ success: false, message: "UpdatedBy ID is required." });
      }

      if (status === "absent") {
        existingAttendance.checkIn = null;
        existingAttendance.checkOut = null;
        existingAttendance.mode = null;
        existingAttendance.totalWorkTime = null;
        existingAttendance.status = "absent";
        existingAttendance.updatedBy = updatedBy_id;
        await existingAttendance.save();
        return res
          .status(200)
          .json({ success: true, result: existingAttendance });
      }

      if (updatedCheckInTime && updatedCheckOutTime) {
        // if (!areDatesSameDay(updatedCheckInTime, updatedCheckOutTime)) {
        //   return res.status(401).json({
        //     success: false,
        //     message: "checkin and checkout dates are not same",
        //   });
        // }

        // if (!checkTimeOrder(updatedCheckInTime, updatedCheckOutTime)) {
        //   return res.status(401).json({
        //     success: false,
        //     message: "checkin time is greater than checkout time",
        //   });
        // }

        // if (!areDatesSameDay(updatedCheckInTime, updatedCheckOutTime, date)) {
        //   return res.status(401).json({
        //     success: false,
        //     message:
        //       "checkin and checkout dates and attendance date must be same",
        //   });
        // }

        const order = checkTimeOrder(updatedCheckInTime, updatedCheckOutTime);
        if (!order) {
          return res.status(401).json({
            success: false,
            message: "checkin time is greater than checkout time",
          });
        }

        existingAttendance.checkIn = updatedCheckInTime;
        existingAttendance.checkOut = updatedCheckOutTime;
        existingAttendance.totalWorkTime = calculateTime(
          existingAttendance.checkIn,
          existingAttendance.checkOut
        ).formatted;
      } else if (updatedCheckInTime) {
        if (!areDatesSameDay(updatedCheckInTime, date)) {
          return res.status(401).json({
            success: false,
            message: "checkin and checkout dates must be same",
          });
        }

        if (!checkTimeOrder(updatedCheckInTime, existingAttendance.checkOut)) {
          return res.status(201).json({
            success: false,
            message: "checkin time should not be greater than checkout time",
          });
        }

        existingAttendance.checkIn = updatedCheckInTime;
      } else {
        if (!areDatesSameDay(updatedCheckOutTime, date)) {
          return res.status(401).json({
            success: false,
            message: "checkin and checkout dates must be same",
          });
        }

        if (!checkTimeOrder(existingAttendance.checkIn, updatedCheckOutTime)) {
          return res.status(201).json({
            success: false,
            message: "checkOut time must be greater than checkout time",
          });
        }

        existingAttendance.checkOut = updatedCheckOutTime;
      }
      existingAttendance.totalWorkTime = calculateTime(
        existingAttendance.checkIn,
        existingAttendance.checkOut
      ).formatted;
      existingAttendance.mode = mode || existingAttendance.mode;
      existingAttendance.updatedBy = updatedBy_id;
      await existingAttendance.save();
      return res.status(200).json({
        success: true,
        result: existingAttendance,
        message: "update successful",
      });
    }
  } catch (error) {
    next(error);
  }
};

const autoValidateAttendance = async (req, res, next) => {
  try {
    const { start, end } = startAndend(Date.now());

    const [todaysAttendance, employeeList] = await Promise.all([
      Attendance.find({ createdAt: { $gte: start, $lte: end } }),
      employeeIdList(),
    ]);

    const attendanceMap = new Map(
      todaysAttendance.map((att) => [att.user_id.toString(), att])
    );

    const newOrUpdated = [];

    for (const employee of employeeList) {
      const userIdStr = employee._id.toString();
      const record = attendanceMap.get(userIdStr);
      const existingUser = await User.findById(employee._id).populate("shift");
      const today = new Date().getDay();

      if (record) {
        if (record.status === "present") {
          if (record.checkIn && record.checkOut) continue;

          if (record.checkIn && !record.checkOut) {
            record.status = "absent";
            await record.save();
            newOrUpdated.push({
              user_id: record.user_id,
              action: "Marked absent due to missing check-out",
            });
          }
        }
      } else {
        const leaveRecord = await EmployeeLeaveDates.findOne({
          user_id: employee._id,
          date: { $gte: start, $lte: end },
        });

        if (leaveRecord) {
          await Attendance.create({
            empId: employee.empId,
            user_id: employee._id,
            mode: null,
            status: leaveRecord.code,
          });
        } else if (existingUser.shift?.weekOffCodes?.includes(today)) {
          await Attendance.create({
            empId: employee.empId,
            user_id: employee._id,
            mode: 0,
            earlyBy: 0,
            lateBy: 0,
            shiftName: existingUser.shift.name,
            shiftBegin: formatTime(existingUser.shift.start),
            shiftEnds: formatTime(existingUser.shift.end),
            totalShiftHours: 0,
            status: "week-off",
          });
        } else {
          const newRecord = await Attendance.create({
            empId: employee.empId,
            user_id: employee._id,
            mode: null,
            status: "absent",
          });
          newOrUpdated.push({
            user_id: newRecord.user_id,
            action: "Created absent record",
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      updated: newOrUpdated,
      message: "✅ Attendance check completed",
    });
  } catch (error) {
   next(error);
  }
};

const todayAttendanceData = async (req, res, next) => {
  try {
    const { start, end } = startAndend(Date.now());

    // Get today's attendance records
    const todaysAttendance = await Attendance.find({
      checkIn: { $gte: start, $lte: end },
    }).lean();

    // Get full employee list
    const employeeList = await employeeIdList();
    if (!employeeList?.length) {
      return res
        .status(404)
        .json({ success: false, message: "No employees found." });
    }

    const presentees = [];
    const absentees = [];

    // Set for quick lookup of attended user_ids
    const presentIds = new Set(
      todaysAttendance.map((a) => a.user_id.toString())
    );

    for (const employee of employeeList) {
      const emp = {
        user_id: employee._id,
        name: employee.fullName,
      };

      if (presentIds.has(employee._id.toString())) {
        presentees.push(emp);
      } else {
        absentees.push(emp);
      }
    }

    res.status(200).json({ success: true, presentees, absentees });
  } catch (error) {
    next(error);
  }
};

const getAttendanceHistory = async (req, res, next) => {
  try {
    let { month, year, user_id } = req.body;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();

    // Defaults
    month = month || 0;

    if (year && month !== 0) {
      const isCurrentMonth = currentMonth === month && currentYear === year;

      const start = new Date(year, month - 1, 1);
      const end = isCurrentMonth
        ? new Date(year, month - 1, currentDate - 1, 23, 59, 59)
        : new Date(year, month, 0, 23, 59, 59); // Last day of the month

      const attendanceHistory = await Attendance.find({
        user_id,
        createdAt: { $gte: start, $lte: end },
      }).sort({ createdAt: -1 });

      let totalWorkingHours = 0;
      let totalOverTimeHours = 0;
      let presentDays = 0;
      let absentDays = 0;
      let totalLateBy = 0;
      let totalLeaveDays = 0;
      let totalEarlyBy = 0;

      for (const doc of attendanceHistory) {
        totalWorkingHours += doc.totalWorkTime || 0;
        totalOverTimeHours += doc.overTime || 0;
        totalLateBy += doc.lateBy || 0;
        totalEarlyBy += doc.earlyBy || 0;

        if (doc.status === "present") presentDays++;
        else if (doc.status === "absent") absentDays++;
        else totalLeaveDays++;
      }

      const daysCount = isCurrentMonth ? currentDate - 1 : end.getDate() || 1;

      const monthlyData = {
        totalWorkingHours,
        totalOverTimeHours,
        presentDays,
        absentDays,
        totalLateBy,
        totalLeaveDays,
        totalEarlyBy,
      };

      const monthlyAverageData = {
        AvgWorkingHours: totalWorkingHours / daysCount,
        AvgOverTimeHours: totalOverTimeHours / daysCount,
        AvgLateBy: totalLateBy / daysCount,
        AvgEarlyBy: totalEarlyBy / daysCount,
      };

      return res.status(200).json({
        success: true,
        result: { attendanceHistory, monthlyData, monthlyAverageData },
      });
    }

    // Year-only case
    else if (year) {
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 0, 23, 59, 59); // Dec 31
      const attendanceHistory = await Attendance.find({
        user_id,
        createdAt: { $gte: start, $lte: end },
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        result: attendanceHistory,
      });
    }

    return res.status(400).json({ success: false, message: "Invalid input." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,
  updateAttendance,
  autoValidateAttendance,
  todayAttendanceData,
  getAttendanceHistory,
};
