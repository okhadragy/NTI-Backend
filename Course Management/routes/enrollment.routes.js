const express = require("express");
const enrollmentController = require("../controllers/enrollment.controller");
const uploadTo = require('../middleware/image.upload.middleware');
const multerErrorHandler = require('../middleware/multer.error.handler');
const { protectRoutes, preventLoggedInAccess } = require('../middleware/auth');
const router = express.Router();

router.route('/checkout').post(protectRoutes, enrollmentController.checkout);
router.route('/submit-attempt').post(protectRoutes, uploadTo('attempts').single('photo'), multerErrorHandler, enrollmentController.submitAttempt);
router.route('/review-assessment').post(protectRoutes, enrollmentController.reviewAssessment);
router.route('/:enrollmentId/complete').post(protectRoutes, enrollmentController.completeEnrollment);

router.route('/').get(protectRoutes, enrollmentController.getEnrollments);
router.route('/:courseId').get(protectRoutes, enrollmentController.getEnrollmentByCourse);
router.route('/:enrollmentId/sections/:sectionId/contents/:contentId/files').get(protectRoutes, enrollmentController.getAssessmentFiles);

module.exports = router;
