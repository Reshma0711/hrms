// controllers/permissionController.js
const Permission = require("../models/permission");

// Create
exports.createPermission = async (req, res, next) => {
  try {
    const permission = new Permission(req.body);
    await permission.save();
    res
      .status(201)
      .json({ message: "Permission created successfully", permission });
  } catch (err) {
    next(err);
  }
};

// Read all
exports.getAllPermissions = async (req, res, next) => {
  try {
    const groupedPermissions = await Permission.aggregate([
      {
        $group: {
          _id: "$module",
          permissions: {
            $push: {
              _id: "$id",
              module: "$module",
              action: "$action",
              description: "$description",
              // Do not include any sensitive fields here
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          module: "$_id",
          permissions: 1,
        },
      },
    ]);

    // Convert array to object: { employees: [...], projects: [...], etc. }
    const permissionsByModule = {};
    groupedPermissions.forEach((item) => {
      permissionsByModule[item.module] = item.permissions;
    });

    res.status(200).json(permissionsByModule);
  } catch (err) {
    next(err);
  }
};

// Read one
exports.getPermissionById = async (req, res, next) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }
    res.status(200).json(permission);
  } catch (err) {
    next(err);
  }
};

// Update
exports.updatePermission = async (req, res, next) => {
  try {
    const updatedPermission = await Permission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedPermission) {
      return res.status(404).json({ message: "Permission not found" });
    }
    res.status(200).json({ message: "Permission updated", updatedPermission });
  } catch (err) {
    next(err);
  }
};

// Delete
exports.deletePermission = async (req, res, next) => {
  try {
    const deleted = await Permission.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Permission not found" });
    }
    res.status(200).json({ message: "Permission deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// Bulk Create
exports.bulkCreatePermissions = async (req, res, next) => {
  try {
    console.log("🚀 Incoming Body:", req.body);

    // console.log("ddddddddddddddddddd", data);
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a non-empty array of permissions",
      });
    }

    const permissions = await Permission.insertMany(req.body, {
      ordered: false,
    });

    console.log("✅ Inserted Permissions:", permissions);

    res.status(201).json({
      success: true,
      message: "Bulk permissions created successfully",
      permissions,
    });
  } catch (err) {
    console.error("❌ Insert error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to insert permissions",
      error: err.message,
    });
  }
};
