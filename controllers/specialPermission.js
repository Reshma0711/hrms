const User = require("../models/user");

async function allowSpecialPermission(req, res, next) {
  try {
    const { user_id, permissionIds } = req.body;

    const user = await User.findById(user_id); 
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    let allowSet = new Set(user.specialPermissions.allow.map(String));
    let denySet = new Set(user.specialPermissions.deny.map(String));

    // Add new permissions to allow
    permissionIds.forEach(id => allowSet.add(String(id)));

    // Remove those permissions from deny if they exist
    permissionIds.forEach(id => denySet.delete(String(id)));

    // Update user permissions
    user.specialPermissions.allow = Array.from(allowSet);
    user.specialPermissions.deny = Array.from(denySet);

    await user.save();

    return res.status(200).json({ success: true, result: user });
  } catch (error) {
    next(error);
  }
}

async function denySpecialPermission(req, res, next) {
  try {
    const { user_id, permissionIds } = req.body;

    if (!user_id || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: "'user_id' and 'permissionIds' (as an array) are required.",
      });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Ensure specialPermissions exists and is initialized
    if (!user.specialPermissions) {
      user.specialPermissions = { allow: [], deny: [] };
    } else {
      user.specialPermissions.allow = user.specialPermissions.allow || [];
      user.specialPermissions.deny = user.specialPermissions.deny || [];
    }

    let allowSet = new Set(user.specialPermissions.allow.map(String));
    let denySet = new Set(user.specialPermissions.deny.map(String));

    // Add to deny
    permissionIds.forEach(id => denySet.add(String(id)));

    // Remove from allow
    permissionIds.forEach(id => allowSet.delete(String(id)));

    // Update user document
    user.specialPermissions.allow = Array.from(allowSet);
    user.specialPermissions.deny = Array.from(denySet);

    await user.save();
    return res.status(200).json({ success: true, result:user});

  } catch (error) {
    next(error);
  }
}


module.exports = { allowSpecialPermission , denySpecialPermission};
                  