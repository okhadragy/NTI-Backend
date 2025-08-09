const express = require("express");
const userControllers = require("../controllers/user.controller");
const uploadTo = require('../middleware/image.upload.middleware');
const multerErrorHandler = require('../middleware/multer.error.handler');
const { protectRoutes } = require('../middleware/auth');
const restrictTo = require('../middleware/roles');
const router = express.Router();

router
  .route('/')
  .get(
    protectRoutes,
    restrictTo("admin"),
    userControllers.getAllUsers
  )
  .post(
    protectRoutes,
    restrictTo("admin"),
    uploadTo('profiles').single('photo'),
    multerErrorHandler,
    userControllers.signup
  );

router
  .route('/:id')
  .get(
    protectRoutes,
    restrictTo("admin"),
    userControllers.getUserProfile
  )
  .patch(
    protectRoutes,
    restrictTo("admin"),
    userControllers.updateUser
  )
  .delete(
    protectRoutes,
    restrictTo("admin"),
    userControllers.deleteUser
  );

  
module.exports = router;
