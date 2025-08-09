const express = require('express');
const {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse
} = require('../controllers/course.controller');
const { protectRoutes } = require('../middleware/auth');
const uploadTo = require('../middleware/image.upload.middleware');
const multerErrorHandler = require('../middleware/multer.error.handler');
const restrictTo = require('../middleware/roles');
const router = express.Router();

router
    .route('/')
    .post(
        protectRoutes,
        restrictTo("admin", "instructor"),
        uploadTo("courses").fields([
            { name: "thumbnail", maxCount: 1 },
            { name: "bannerImage", maxCount: 1 }
        ]),
        multerErrorHandler,
        createCourse
    )
    .get(
        getAllCourses
    );
router
    .route('/:id')
    .get(
        getCourseById
    )
    .patch(
        protectRoutes,
        restrictTo("admin", "instructor"),
        updateCourse
    )
    .delete(
        protectRoutes,
        restrictTo("admin", "instructor"),
        deleteCourse
    );

module.exports = router;
