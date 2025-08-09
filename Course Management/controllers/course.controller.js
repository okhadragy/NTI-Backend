const mongoose = require('mongoose');
const Course = require('../models/course.model');
const User = require('../models/user.model');
const fs = require('fs');
const path = require('path');

const ALLOWED_INSTRUCTOR_ROLES = ['owner', 'lecturer', 'assistant', 'guest'];

const canModifyCourse = (course, requesterId, requesterRole) => {
    if (requesterRole === 'admin') return true;
    if (requesterRole === 'instructor') {
        return course.instructors.some(
            i => i.user.toString() === requesterId && i.role === 'owner'
        );
    }
    return false;
};

const canAccessCourse = (course, requesterId, requesterRole) => {
    if (requesterRole === 'admin') return true;
    if (requesterRole === 'instructor') {
        return course.instructors.some(
            i => i.user.toString() === requesterId
        );
    }
    return false;
};

function removeUploadedFiles(files) {
  if (!files) return;
  
  for (const fieldName in files) {
    if (Array.isArray(files[fieldName])) {
      files[fieldName].forEach(file => {
        const filePath = path.join(__dirname, '../uploads/courses', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
  }
}

const createCourse = async (req, res) => {
  try {
    let instructors = req.body.instructors || [];
    const requesterId = req.userId;
    const requesterRole = req.userRole;

    // Add requester as owner if they are instructor and not already included
    if (requesterRole === 'instructor' && !instructors.some(i => i.user == requesterId)) {
      instructors.push({ user: requesterId, role: 'owner' });
    }

    if (!Array.isArray(instructors) || instructors.length === 0) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ status: "fail", message: "At least one instructor is required" });
    }

    for (const inst of instructors) {
      if (!ALLOWED_INSTRUCTOR_ROLES.includes(inst.role)) {
        removeUploadedFiles(req.files);
        return res.status(400).json({ status: "fail", message: `Invalid instructor role: ${inst.role}` });
      }
    }

    const userIds = instructors.map(i => mongoose.Types.ObjectId(i.user));
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length || users.some(u => u.role !== 'instructor')) {
      removeUploadedFiles(req.files);
      return res.status(400).json({ status: "fail", message: "All instructors must exist and have role 'instructor'" });
    }

    let thumbnail = "default-thumbnail.png";
    let bannerImage = "default-banner.jpg";

    if (req.files) {
      if (req.files.thumbnail && req.files.thumbnail.length > 0) {
        thumbnail = req.files.thumbnail[0].filename;
      }
      if (req.files.bannerImage && req.files.bannerImage.length > 0) {
        bannerImage = req.files.bannerImage[0].filename;
      }
    }

    const courseData = {
      ...req.body,
      instructors,
      thumbnail,
      bannerImage,
    };

    const newCourse = new Course(courseData);
    await newCourse.save();

    res.status(201).json({ status: "success", message: "Course created successfully", data: newCourse });
  } catch (error) {
    console.error("Error creating Course:", error);
    removeUploadedFiles(req.files);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};


const getAllCourses = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const totalCourses = await Course.countDocuments();

        const courses = await Course.find()
            .skip(skip)
            .limit(limit)
            .populate('instructors.user', 'name email role -_id')
            .select('-__v -_id');

        res.status(200).json({
            status: "success",
            page,
            limit,
            totalCourses,
            totalPages: Math.ceil(totalCourses / limit),
            length: courses.length,
            data: courses,
        });
    } catch (error) {
        console.error("Error fetching Courses:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};


const getMyCourses = async (req, res) => {
    try {
        const requesterId = req.userId;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const user = await User.findById(requesterId);
        if (!user) {
            return res.status(404).json({ status: "fail", message: "User not found" });
        }

        const totalCourses = user.taughtCourses.length;

        await user.populate({
            path: 'taughtCourses',
            options: { skip, limit, sort: { createdAt: -1 } },
            select: '-__v -_id',
            populate: {
                path: 'instructors.user',
                select: 'name email role -_id'
            }
        });

        res.status(200).json({
            status: "success",
            page,
            limit,
            totalCourses,
            totalPages: Math.ceil(totalCourses / limit),
            data: user.taughtCourses
        });
    } catch (error) {
        console.error("Error fetching user's courses:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

const getCourseById = async (req, res) => {
    try {
        const courseId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ status: "fail", message: "Invalid Course ID" });
        }

        const course = await Course.findById(courseId)
            .populate('instructors.user', 'name email role -_id')
            .select('-__v -_id');

        if (!course) {
            return res.status(404).json({ status: "fail", message: "Course not found" });
        }

        res.status(200).json({ status: "success", data: course });
    } catch (error) {
        console.error("Error fetching Course:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

const updateCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ status: "fail", message: "Invalid Course ID" });
        }

        const requesterId = req.userId;
        const requesterRole = req.userRole;

        if (!canModifyCourse(course, requesterId, requesterRole)) {
            return res.status(403).json({ status: "fail", message: "You do not have permission to update this course" });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ status: "fail", message: "Course not found" });
        }

        if (req.body.instructors) {
            const instructors = req.body.instructors;
            if (!Array.isArray(instructors) || instructors.length === 0) {
                return res.status(400).json({ status: "fail", message: "At least one instructor is required" });
            }

            for (const inst of instructors) {
                if (!ALLOWED_INSTRUCTOR_ROLES.includes(inst.role)) {
                    return res.status(400).json({ status: "fail", message: `Invalid instructor role: ${inst.role}` });
                }
            }

            const userIds = instructors.map(i => i.user);
            const users = await User.find({ _id: { $in: userIds } });
            if (users.length !== userIds.length || users.some(u => u.role !== 'instructor')) {
                return res.status(400).json({ status: "fail", message: "All instructors must exist and have role 'instructor'" });
            }
        }

        Object.assign(course, req.body);
        const updatedCourse = await course.save();
        await updatedCourse.populate('instructors.user', 'name email role -_id');

        res.status(200).json({ status: "success", data: updatedCourse });
    } catch (error) {
        console.error("Error updating Course:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ status: "fail", message: "Invalid Course ID" });
        }

        const requesterId = req.userId;
        const requesterRole = req.userRole;

        if (!canModifyCourse(course, requesterId, requesterRole)) {
            return res.status(403).json({ status: "fail", message: "You do not have permission to update this course" });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ status: "fail", message: "Course not found" });
        }

        await course.remove();

        res.status(200).json({ status: "success", message: "Course deleted successfully" });
    } catch (error) {
        console.error("Error deleting Course:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

module.exports = {
    createCourse,
    getAllCourses,
    getMyCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
};
