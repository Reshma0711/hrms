const Department = require("../models/department");

// Create Department with new designations
exports.createDepartmentWithDesignations = async (req, res, next) => {
  try {
    const { departmentName, designations ,description} = req.body;
    if (
      !departmentName ||
      !Array.isArray(designations) ||
      designations.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "departmentName and designations are required",
      });
    } 
    const deptName = departmentName.toLowerCase();
    const existing = await Department.findOne({ departmentName: deptName });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Department name already exists",
      });
    }
    const cleanedDesignations = designations.map((d) => d.toLowerCase().trim());
    const department = new Department({
      departmentName: deptName,
      description: description || "",
      designations: cleanedDesignations,
    });
    const saved = await department.save();
    res.status(201).json({
      success: true,
      data: saved,
      message: "Department with designations created successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Get all departments with designations
exports.getAllDepartments = async (req, res,next) => {
  try {
    const departments = await Department.find();
    res.json({ success: true, data: departments });
  } catch (err) {
   next(err)
};
}

// Get a single department
exports.getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, data: department });
  } catch (err) {
    next(err);
  }
};

// Update department name or designations
exports.updateDepartment = async (req, res, next) => {
  try {
    const { departmentName, designations } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }

    // Update name if provided
    if (departmentName) {
      department.departmentName = departmentName.toLowerCase().trim();
    }

    // Update designations if provided
    if (designations && Array.isArray(designations)) {
      // Clean & lowercase all incoming values
      const cleanedDesignations = designations.map((d) =>
        d.toLowerCase().trim()
      );

      // You can either *replace* or *append*.
      // Option 1: Replace entire array
      department.designations = cleanedDesignations;

      // Option 2: Append new ones (prevent duplicates)
      // department.designations = Array.from(new Set([
      //   ...department.designations,
      //   ...cleanedDesignations,
      // ]));

    
    }

    const updated = await department.save();

    res.json({
      success: true,
      message: "Department updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// Delete a department (and optionally its designations)
exports.deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id,{new:true});
    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }
    res.status(200).json({ success: true, message: "Department deleted" });
  } catch (err) {
    next(err)
  }
};

// Remove a specific designation from department
exports.updateDepartment = async (req, res, next) => {
  try {
    const departmentId = req.params.id
    const { departmentName, designations , description=""} = req.body;

    if (!departmentId || !designations.length === 0) {
      return res.status(400).json({ success: false, message: "departmentId and designation are required" });
    }

    // Step 1: Remove the designation from the department
    const department = await Department.findByIdAndUpdate(
      departmentId,
  {
    departmentName,
    designations,
    description
  },
  {new:true}
    );
    res.status(200).json({ success: true, message: "Department Updated", department });
  } catch (err) {
    next(err);
  }
}
