const User = require("../models/user.model");

const restrictTo = (...roles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          status: "fail",
          message: "User not found",
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          status: "fail",
          message: "You do not have permission to perform this action",
        });
      }

      req.userId = user._id;
      req.userRole = user.role;
      next();
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Server error",
      });
    }
  };
};

module.exports = restrictTo;
