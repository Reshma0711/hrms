const User = require("../models/user");

// module.exports = function checkPermission(moduleName, actionName) {
//   return async function (req, res, next) {
//     try {
//       const user = await User.findOne({ email: req.user.email }).populate({
//         path: "role",
//         model: "Role",
//         populate: {
//           path: "permissions",
//           model: "Permission",
//         },
//       });
//       console.log("checkkkkkkkkkkkkkkkk", user);

//       // Check if user has any role
//       if (!user || !user.role || user.role.length === 0) {
//         return res
//           .status(403)
//           .json({ success: false, message: "Access denied: No role assigned" });
//       }

//       // Check if user roles have any permissions
//       const hasAnyPermissions = user.role.some(
//         (role) => role.permissions && role.permissions.length > 0
//       );

//       if (!hasAnyPermissions) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied: No permissions assigned to role",
//         });
//       }

//       // Check if user has required permission
//       const hasPermission = user.role.some((role) =>
//         role.permissions.some(
//           (perm) =>
//             perm.module?.toLowerCase() === moduleName.toLowerCase() &&
//             perm.action?.toLowerCase() === actionName.toLowerCase()
//         )
//       );

//       console.log("verifyyyyyyyyyyyyyy", hasPermission);

//       if (!hasPermission) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied: You don't have permission for this action",
//         });
//       }

//       next();
//     } catch (err) {
//       console.error("Permission check failed:", err);
//       res.status(500).json({ success: false, message: "Server error" });
//     }
//   };
// };

module.exports = function checkPermission(modules, action) {
  return async function (req, res, next) {
    try {
      const user = await User.findOne({ email: req.user.email })
        .populate({
          path: "role",
          model:"Role",
          populate: {
            path: "permissions",
            model: "Permission",
          },
        })
        .populate("specialPermissions.allow")
        .populate("specialPermissions.deny");

      if (!user) {
        return res.status(403).json({
          success: false,
          message: "Access denied: User not found",
        });
      }

      // Normalize to array just in case
      const moduleList = Array.isArray(modules) ? modules : [modules];
      console.log("chkpermmmmmmm",moduleList)

      // ❌ Check Deny: if ANY module-action is denied
      const isDenied = user.specialPermissions?.deny?.some(
        (perm) => moduleList.includes(perm.module) && perm.action === action
      );
      if (isDenied) {
        return res.status(403).json({
          success: false,
          message: "Access denied: permission explicitly denied",
        });
      }

      // ✅ Check Allow: if ANY module-action is explicitly allowed
      const isAllowed = user.specialPermissions?.allow?.some(
        (perm) => moduleList.includes(perm.module) && perm.action === action
      );
      if (isAllowed) {
        return next();
      }

      // ✅ Check Role-based permissions
      const hasPermission = user.role?.some((role) =>
        role.permissions?.some(
          (perm) => moduleList.includes(perm.module) && perm.action === action
        )
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Access denied: you don't have the required permission",
        });
      }

      // ✅ All checks passed
      next();
    } catch (err) {
      next(err)
    }
  };
};
