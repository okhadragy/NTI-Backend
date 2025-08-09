const path = require("path");
const fs = require("fs");

const imageFileValidator = (folder) => {
  return {
    validator: function (v) {
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(v);
      if (!isImage) return false;

      const filePath = path.join(__dirname, `../uploads/${folder}`, v);
      return fs.existsSync(filePath);
    },
    message: "Must be an existing image file (jpg, jpeg, png, gif)"
  };
};

module.exports = imageFileValidator;
