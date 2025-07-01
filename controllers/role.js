const mongoose = require("mongoose");
const Role = require("../models/role");

// Create Role
exports.createRole = async (req, res, next) => {
  try {
    const { roleName, description } = req.body;
    // Check required field
    if (!roleName) {
      return res.status(400).json({
        success: false,
        error: "roleName is a required field",
      });
    }
    // Prevent creation of superadmin role via API
    if (roleName?.trim().toLowerCase() === "superadmin") {
      return res.status(400).json({
        success: false,
        error: "Cannot create superadmin role",
      });
    }
    // Check if role already exists
    const existing = await Role.findOne({ roleName: roleName.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Role already exists",
      });
    }
    // Create and save role
    const role = new Role({
      roleName: roleName.trim(),
      description: description || "",
    });

    await role.save();

    return res.status(201).json({ success: true, role });
  } catch (err) {
    next(err); // Make sure your error middleware is logging correctly
  }
};
// Get All Roles
exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({})
      .populate("permissions") // populates permission details
      .sort({ createdAt: -1 }); // optional: newest first
    res.status(200).json({ success: true, roles });
  } catch (err) {
    next(err);
  }
};
// Get Role by ID
exports.getRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id).populate("permissions");
    if (!role) {
      return res.status(404).json({ success: false, error: "Role not found" });
    }
    res.status(200).json({ success: true, role });
  } catch (err) {
    next(err);
  }
};
// Update Role
exports.updateRole = async (req, res, next) => {
  try {
    const { roleName, description, permissions } = req.body;

    const existingRole = await Role.findById(req.params.id);
    if (!existingRole) {
      return res.status(404).json({ error: "Role not found" });
    }

    if (existingRole.roleName === "superadmin") {
      return res.status(403).json({ error: "Cannot modify superadmin role" });
    }

    // Validate permission IDs
    if (
      permissions &&
      !permissions.every((id) => mongoose.Types.ObjectId.isValid(id))
    ) {
      return res
        .status(400)
        .json({ error: "Invalid permission ID(s) provided" });
    }

    // Replace fields directly
    existingRole.roleName = roleName || existingRole.roleName;
    existingRole.description = description || existingRole.description;
    existingRole.permissions = permissions || [];

    await existingRole.save();

    res.status(200).json({ success: true, role: existingRole });
  } catch (err) {
    next(err);
  }
};
// Delete Role
exports.deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (role.roleName === "superadmin") {
      return res
        .status(403)
        .json({ success: false, error: "Cannot delete superadmin role" });
    }
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    next(err);
  }
};
