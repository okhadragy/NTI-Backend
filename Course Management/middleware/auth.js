const jwt = require("jsonwebtoken");

const protectRoutes = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (token && token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({
      status: "fail",
      message: "Invalid or expired token",
    });
  }
};

const preventLoggedInAccess = (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (token && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET);

    return res.status(403).json({
      status: 'fail',
      message: 'You are already logged in, cannot access this route',
    });
  } catch (err) {
    next();
  }
};

module.exports = {
  protectRoutes,
  preventLoggedInAccess
};