const express = require("express");
const userControllers = require("../controllers/user.controller");
const uploadTo = require('../middleware/image.upload.middleware');
const multerErrorHandler = require('../middleware/multer.error.handler');
const { protectRoutes, preventLoggedInAccess } = require('../middleware/auth');
const router = express.Router();
const { getMyCourses } = require('../controllers/course.controller');
const restrictTo = require('../middleware/roles');

router
  .route('/signup')
  .post(
    preventLoggedInAccess,
    uploadTo('profiles').single('photo'),
    multerErrorHandler,
    userControllers.signup
  );
router
  .route('/login')
  .post(
    preventLoggedInAccess,
    userControllers.login
  );
router
  .route('/changePassword')
  .post(
    protectRoutes,
    userControllers.changePassword
  );
router
  .route('/')
  .get(
    protectRoutes,
    userControllers.getUserProfile
  )
  .patch(
    protectRoutes,
    userControllers.updateUser
  )
  .delete(
    protectRoutes,
    userControllers.deleteUser
  );
router
  .route('/addToFav')
  .post(
    protectRoutes,
    userControllers.addCourseToFav
  );
router
  .route('/removeFromFav')
  .post(
    protectRoutes,
    userControllers.removeCourseFromFav
  );
router
  .route('/addToCart')
  .post(
    protectRoutes,
    userControllers.addCourseToCart
  );
router
  .route('/removeFromCart')
  .post(
    protectRoutes,
    userControllers.removeCourseFromCart
  );
router
  .route('/courses')
  .get(
    protectRoutes,
    restrictTo("instructor"),
    getMyCourses,
  )
module.exports = router;
