const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { generateRefreshToken, generateToken } = require("../utils/token");
const { jwtSecretKey, jwtRefreshSecretkey } = require("../config/dotenvconfig");

exports.generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const accessToken = generateToken(user); // usually JWT with 15min expiry
  const refreshToken = generateRefreshToken(user); // usually JWT with 7d expiry

  return { accessToken, refreshToken };
};

// Middleware to verify JWT token
exports.verifyToken = async (req, res, next) => {
  console.log("cookie", req.cookies.accessToken);

  const token =
    req.cookies.accessToken || req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ error: "Access denied. No token provided." });
  try {
    const decoded = jwt.verify(token, jwtSecretKey);
    console.log("token details", decoded);
    req.user = decoded;
    console.log("userrrrrrrrrrrrr", req.user);
    next();
  } catch (err) {
    console.log(err, "erroo");

    res.status(400).json({ error: "Invalid token." });
    next(err);
  }
};

exports.refreshTokenHandler = async (req, res, next) => {
  // console.log("generate", this.generateAccessAndRefreshTokens);
  const incomingRefreshToken =
    req.body.refreshToken || req.cookies?.refreshToken;
  if (!incomingRefreshToken) {
    return res.status(401).json({ message: "Refresh token is required" });
  }
  try {
    const decoded = jwt.verify(incomingRefreshToken, jwtRefreshSecretkey);
    // console.log("checkkkkkkkkkkkkkkkkk", decoded);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }
    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshTokens(user._id);
    // Set tokens as cookies (optional)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, {
        ...cookieOptions,
        expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      })
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .json({
        accessToken,
        refreshToken,
        message: "Tokens refreshed successfully",
      });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Refresh token expired" });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
    next(err);
  }
};
