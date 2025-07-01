const { superAdminID } = require("../config/dotenvconfig");
const Notification = require("../models/notification");
const User = require("../models/user");
const mongoose=require("mongoose")

exports.sendDeactivationRequest = async (req, res, next) => {
  try {
    const adminId = req.user.userId; // Logged-in admin ID
    const deleteUserId = req.params.id;

    // Check for existing pending deactivation request
    const existingRequest = await Notification.findOne({
      module: "user",
      type: "employee_delete_request",
      deleteUserId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A deactivation request for this user is already pending.",
      });
    }

    // Find the target user to deactivate
    const targetUser = await User.findById(deleteUserId);
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Fetch current admin details
    const currentAdmin = await User.findById(adminId)
      .select("fullName role")
      .populate({
        path: "role",
        select: "roleName",
      });

    const adminRole = currentAdmin.role[0]?.roleName;
    const adminName = currentAdmin.fullName;

    if (adminRole === "superadmin") {
      // Superadmin can directly deactivate
      targetUser.isActive = false;
      await targetUser.save();

      return res.status(200).json({
        success: true,
        message: "User has been deactivated directly by Super Admin",
        updatedUser: {
          _id: targetUser._id,
          fullName: targetUser.fullName,
          email: targetUser.email,
          isActive: targetUser.isActive,
          role: targetUser.role,
          empId: targetUser.empId,
        },
      });
    }

    // Construct notification title and message
    const notificationTitle = "Deactivation Request";
    const notificationMessage = `Admin ${adminName} has requested to deactivate employee ${targetUser.fullName} (Emp ID: ${targetUser.empId}).`;

    // Create the notification
    const newNotification = await Notification.create({
      title: notificationTitle,
      message: notificationMessage,
      module: "user",
      type: "employee_delete_request",
      adminId,
      deleteUserId,
      approverId: superAdminID,
      to: superAdminID,
      status: "pending",
    });

    return res.status(200).json({
      success: true,
      message: "Deactivation request sent to Superadmin.",
      newNotification,
    });
  } catch (error) {
    console.error("Error sending deactivation request:", error);
    next(error);
  }
};

exports.handleDeactivationRequest = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const { action } = req.body; // "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    const notification = await Notification.findById(notificationId)
      .populate("createdAdminId")
      .populate("deleteUserId");

    console.log("verifyyyyyyyyyyy", notification);

    if (!notification) {
      console.log("❌ Notification not found with ID:", notificationId);
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.status !== "pending") {
      console.log(
        "⚠️ Notification already handled. Status:",
        notification.status
      );
      return res.status(400).json({
        success: false,
        message: "Invalid or already handled notification",
      });
    }

    const user = notification.deleteUserId;
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Update user status if approved
    if (action === "approve") {
      user.isActive = false;
      await user.save();
      notification.status = "approved";
      notification.isOpen = true;
    } else if (action === "reject") {
      notification.status = "rejected";
      notification.isOpen = true;
    }

    await notification.save();

    // ✅ Create a new notification for the admin who raised the request
    const newNotification = new Notification({
      module: "user",
      title: "Deactivating User",
      type: "deactivation_response",
      message: `Your request to deactivate user "${user.fullName}" has been ${action}ed by superadmin.`,
      adminId: notification.adminId, // who receives this notification
      relatedNotification: notification._id, // optional, for linking
      status: notification.status,
      to: notification.adminId,
      isOpen: false,
    });

    await newNotification.save();

    return res.status(200).json({
      success: true,
      message: `Deactivation request ${action}ed successfully`,
      // updatedUser: action === "approve" ? user : null,
      newNotification,
    });
  } catch (error) {
    console.error("Error handling request:", error);
    next(error);
  }
};



// all notifications 
exports.getAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Base match filter: notifications addressed to the logged-in user
    const matchStage = {
      to: new mongoose.Types.ObjectId(userId),
    };

    // Optional filters
    if (req.query.module) {
      matchStage.module = req.query.module;
    }

    if (req.query.status) {
      matchStage.status = req.query.status;
    }

    const notifications = await Notification.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },

      // Populate "to" user
      {
        $lookup: {
          from: "users",
          localField: "to",
          foreignField: "_id",
          as: "to",
        },
      },
      { $unwind: { path: "$to", preserveNullAndEmptyArrays: true } },

      // Populate adminId
      {
        $lookup: {
          from: "users",
          localField: "adminId",
          foreignField: "_id",
          as: "adminId",
        },
      },
      { $unwind: { path: "$adminId", preserveNullAndEmptyArrays: true } },

      // Populate deleteUserId
      {
        $lookup: {
          from: "users",
          localField: "deleteUserId",
          foreignField: "_id",
          as: "deleteUserId",
        },
      },
      { $unwind: { path: "$deleteUserId", preserveNullAndEmptyArrays: true } },

      // Populate createdAdminId
      // {
      //   $lookup: {
      //     from: "users",
      //     localField: "createdAdminId",
      //     foreignField: "_id",
      //     as: "createdAdminId",
      //   },
      // },
      // { $unwind: { path: "$createdAdminId", preserveNullAndEmptyArrays: true } },

      // Populate approverId
      {
        $lookup: {
          from: "users",
          localField: "approverId",
          foreignField: "_id",
          as: "approverId",
        },
      },
      { $unwind: { path: "$approverId", preserveNullAndEmptyArrays: true } },
    ]);

    return res.status(200).json({
      success: true,
      total: notifications.length,
      userId: userId,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    next(error);
  }
};


// Get a single notification by ID
exports.getNotificationById = async (req, res, next) => {
  try {
    const id = req.params.id;

    const notification = await Notification.findById(id)
      .populate("adminId", "fullName email empId role")
      .populate("deleteUserId", "fullName email empId role")
      .populate("createdAdminId", "fullName email empId role")
      .populate("approverId", "fullName email empId role");

    // console.log("notifyyyyyyyy",notification);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error fetching notification by ID:", error);
    next(error);
  }
};
