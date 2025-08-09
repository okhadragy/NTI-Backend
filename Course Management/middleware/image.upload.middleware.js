const multer = require("multer");
const path = require("path");

const uploadTo = (folder) => {
  const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join("uploads", folder));
    },
    filename: function (req, file, cb) {
      const ext = file.mimetype.split("/")[1];
      const filename = `${file.fieldname}-${Date.now()}.${ext}`;
      cb(null, filename);
    },
  });

  const fileFilter = (req, file, cb) => {
    const imageType = file.mimetype.split("/")[0];
    if (imageType === "image") {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"), false);
  };

  return multer({ storage: diskStorage, fileFilter });
};

module.exports = uploadTo;
