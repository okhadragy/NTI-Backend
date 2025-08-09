const multer = require("multer");

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Only image files are allowed!") {
    return res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }

  next();
};

module.exports = errorHandler;