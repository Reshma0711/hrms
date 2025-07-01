const Shift = require("../models/shift");

const createShift = async (req, res, next) => {
  try {
    const {
      name,
      start, // e.g., "09:30"
      end, // e.g., "18:30"
      shiftType,
      canLoginBefore = 0,
      weekOff = [], // lowercase days
      shiftPolicy = "",
    } = req.body;

    // Validate required fields
    if (!name || !start || !end || !shiftType) {
      return res
        .status(400)
        .json({ message: "Name, start, end, and shiftType are required." });
    }

    // Parse "HH:mm" to Date using today's base
    const today = new Date();
    const baseDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    const startTime = new Date(baseDate);
    startTime.setHours(startH, startM, 0, 0);

    let endTime = new Date(baseDate);
    endTime.setHours(endH, endM, 0, 0);

    let shiftEndsNextDay = false;
    if (endTime <= startTime) {
      shiftEndsNextDay = true;
      endTime.setDate(endTime.getDate() + 1);
    }

    const totalHours = +((endTime - startTime) / 36e5).toFixed(2); // milliseconds to hours

    // Validate and convert weekOff to codes
    const dayToCode = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const weekOff_codes = [];

    for (const day of weekOff) {
      const lowerDay = day.toLowerCase();
      if (!dayToCode.hasOwnProperty(lowerDay)) {
        return res
          .status(406)
          .json({ message: `Invalid week off day: ${day}` });
      }
      weekOff_codes.push(dayToCode[lowerDay]);
    }

    const newShift = await Shift.create({
      name,
      start: startTime,
      end: endTime,
      shiftType: shiftType.toLowerCase(), // ensure lowercase
      canLoginBefore,
      shiftPolicy,
      shiftEndsNextDay,
      totalHours,
      weekOff: weekOff.map((d) => d.toLowerCase()),
      weekOff_codes,
    });

    res.status(201).json({ success: true, result: newShift });
  } catch (error) {
    console.error("Error creating shift:", error);
    next(error);
  }
};

const updateShift = async (req, res, next) => {
  try {
    const shiftId = req.params.id;
    const payload = req.body;

    const existingShift = await Shift.findById(shiftId);
    if (!existingShift) {
      return res.status(404).json({ message: "Shift not found." });
    }

    const updateData = {};

    // 1. Name
    if (payload.name) {
      updateData.name = payload.name;
    }

    // 2. Shift Type
    if (payload.shiftType) {
      updateData.shiftType = payload.shiftType.toLowerCase();
    }

    // 3. Shift Policy
    if (payload.shiftPolicy !== undefined) {
      updateData.shiftPolicy = payload.shiftPolicy;
    }

    // 4. Can Login Before
    if (payload.canLoginBefore !== undefined) {
      updateData.canLoginBefore = payload.canLoginBefore;
    }

    const today = new Date();
    const baseDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    let startTime = existingShift.start;
    let endTime = existingShift.end;
    let shiftEndsNextDay = existingShift.shiftEndsNextDay;
    let totalHours = existingShift.totalHours;

    // 5. Start or End time
    const startChanged = payload.start !== undefined;
    const endChanged = payload.end !== undefined;

    if (startChanged) {
      const [h, m] = payload.start.split(":").map(Number);
      startTime = new Date(baseDate);
      startTime.setHours(h, m, 0, 0);
      updateData.start = startTime;
    }

    if (endChanged) {
      const [h, m] = payload.end.split(":").map(Number);
      endTime = new Date(baseDate);
      endTime.setHours(h, m, 0, 0);
      updateData.end = endTime;
    }

    if (startChanged || endChanged) {
      shiftEndsNextDay = false;
      if (endTime <= startTime) {
        shiftEndsNextDay = true;
        endTime.setDate(endTime.getDate() + 1);
      }
      totalHours = +((endTime - startTime) / 36e5).toFixed(2);

      updateData.shiftEndsNextDay = shiftEndsNextDay;
      updateData.totalHours = totalHours;
    }

    // 6. WeekOff and Codes
    if (Array.isArray(payload.weekOff)) {
      const dayToCode = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const weekOff = [];
      const weekOff_codes = [];

      for (const day of payload.weekOff) {
        const lowerDay = day.toLowerCase();
        if (!dayToCode.hasOwnProperty(lowerDay)) {
          return res
            .status(400)
            .json({ message: `Invalid week off day: ${day}` });
        }
        weekOff.push(lowerDay);
        weekOff_codes.push(dayToCode[lowerDay]);
      }

      updateData.weekOff = weekOff;
      updateData.weekOff_codes = weekOff_codes;
    }

    const updatedShift = await Shift.findByIdAndUpdate(shiftId, updateData, {
      new: true,
    });

    res.status(200).json({ success: true, result: updatedShift });
  } catch (error) {
    console.error("Error updating shift:", error);
    next(error);
  }
};

const deleteShift = async (req, res, next) => {
  try {
    const deleteId = req.params.id;
    const deletedShift = await Shift.findByIdAndDelete(id, { new: true });
    res.status(200).json({ success: true, result: deletedShift });
  } catch (error) {
    next(error);
  }
};

const getAllShifts = async (req, res, next) => {
  try {
    const Shifts = await Shift.find();
    res.status(200).json({ success: true, result: Shifts });
  } catch (error) {
    next(error);
  }
};

module.exports = { createShift, updateShift, deleteShift, getAllShifts };
