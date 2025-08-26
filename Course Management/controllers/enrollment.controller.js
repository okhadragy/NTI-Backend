const mongoose = require('mongoose');
const Course = require('../models/course.model');
const User = require('../models/user.model');
const Enrollment = require('../models/enrollment.model');
const EnrollmentService = require('../services/enrollment.service');
const fs = require('fs');
const path = require('path');

const checkout = async (req, res) => {
  try {
    const { courseId, liveRunId, discountIds } = req.body;
    const requesterId = req.userId;
    const requesterRole = req.userRole; // assuming JWT auth or session

    const enrollment = await EnrollmentService.assignCourseToUser({
      userId: requesterId,
      courseId,
      liveRunId,
      discountIds
    });

    res.status(201).json({ status: 'success', data: enrollment });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
}

const submitAttempt = async (req, res) => {
  try {
    const { enrollmentId, sectionId, contentId, answers, files } = req.body;

    const attempts = await EnrollmentService.submitAttempt({
      enrollmentId,
      sectionId,
      contentId,
      answers,
      files
    });

    res.status(200).json({ status: 'success', data: attempts });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
}

const reviewAssessment = async (req, res) => {
  try {
    const { enrollmentId, sectionId, contentId, attemptIndex, score, passed } = req.body;
    const instructorId = req.userId;
    const requesterRole = req.userRole;

    if (requesterRole !== 'instructor') {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    const enrollment = await EnrollmentService.reviewAssessment({
      enrollmentId,
      sectionId,
      contentId,
      attemptIndex,
      score,
      passed,
      instructorId
    });

    res.status(200).json({ status: 'success', data: enrollment });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
}

const getEnrollmentByCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const courseId = req.params.courseId;

    const enrollment = await Enrollment.findOne({ user: userId, course: courseId })
      .populate({
        path: 'course',
        select: '-__v',
        populate: { path: 'instructors.user', select: '-__v -password' }
      })
      .lean();

    if (!enrollment) {
      return res.status(404).json({ status: 'fail', message: 'Enrollment not found' });
    }

    res.status(200).json({ status: 'success', data: enrollment });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
}

const getEnrollments = async (req, res) => {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;
    const filter = { user: requesterId };

    if (req.query.courseId) {
      filter.course = req.query.courseId;
    }

    const enrollments = await Enrollment.find(filter)
      .populate({
        path: 'course',
        select: '-__v',
        populate: { path: 'instructors.user', select: '-__v -password' }
      })
      .lean();

    const EnrollmentsCoursesWithAppliedDiscount = enrollments.map(enrollment => {
      const course = enrollment.course;
      const basePrice = course.price;
      let finalPrice = basePrice;

      if (course.pageDiscounts && course.pageDiscounts.length > 0) {
        for (const discount of course.pageDiscounts) {
          if (discount.type === 'percentage') {
            finalPrice -= (finalPrice * discount.value) / 100;
          } else if (discount.type === 'fixed') {
            finalPrice -= discount.value;
          }
        }
        finalPrice = Math.max(finalPrice, 0);
      }

      enrollment.course = {
        ...course,
        basePrice,
        finalPrice
      };

      return enrollment;
    });
    res.status(200).json({ status: 'success', data: EnrollmentsCoursesWithAppliedDiscount });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
}

const getAssessmentFiles = async (req, res) => {
  try {
    const { enrollmentId, sectionId, contentId } = req.params;

    const files = await EnrollmentService.getAssessmentFiles({ enrollmentId, sectionId, contentId });

    res.status(200).json({ status: 'success', data: files });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
}

const completeEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const result = await EnrollmentService.completeEnrollment(enrollmentId);

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
}

module.exports = {
  checkout,
  submitAttempt,
  reviewAssessment,
  completeEnrollment,
  getEnrollments,
  getEnrollmentByCourse,
  getAssessmentFiles
};