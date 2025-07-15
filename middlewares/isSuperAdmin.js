// Middleware to check if user is Superadmin
exports.isSuperadmin = async (req, res, next) => {
  console.log("inside middleware", req?.user);
  console.log("roleeeeeeeeeeee", req.user?.role[0]?.roleName);

  if (req.user?.role[0]?.roleName !== "superadmin") {
    return res
      .status(403)
      .json({ error: "Access denied. Only Superadmin can access." });
  }
  next();
};
