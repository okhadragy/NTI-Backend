const Enrollment = require("../models/enrollment.model");
const Discount = require("../models/discount.model");
const Course = require("../models/course.model");

async function assignCourseToUser({ userId, courseId, liveRunId, discountIds = [] }) {
  const course = await Course.findById(courseId).populate('pageDiscounts');
  if (!course) throw new Error("Course not found");

  let basePrice = course.price;
  let finalPrice = basePrice;

  let validDiscountIds = discountIds.filter(id =>
    course.discounts.map(d => d.toString()).includes(id.toString())
  );


  if (course.pageDiscounts && course.pageDiscounts.length > 0) {
    course.pageDiscounts.forEach(d => {
      if (!validDiscountIds.includes(d._id.toString())) {
        validDiscountIds.push(d._id.toString());
      }
    });
  }



  if (validDiscountIds.length > 0) {
    const discounts = await Discount.find({ _id: { $in: validDiscountIds } });

    for (const d of discounts) {
      if (d.type === "percentage") {
        finalPrice -= (finalPrice * d.value) / 100;
      } else if (d.type === "fixed") {
        finalPrice -= d.value;
      }
    }

    finalPrice = Math.max(finalPrice, 0);
  }

  const sectionsProgress = course.curriculum.map(section => ({
    sectionId: section._id,
    contentsProgress: section.contents.map(content => ({
      contentId: content._id,
      type: content.type,
      completed: false,
      attempts: []
    }))
  }));

  const enrollment = await Enrollment.create({
    user: userId,
    course: courseId,
    liveRun: liveRunId,
    basePrice,
    finalPrice,
    discountsApplied: validDiscountIds,
    sectionsProgress
  });

  return enrollment;
}


async function submitAttempt({ enrollmentId, sectionId, contentId, answers = [], files = [] }) {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");

  const section = enrollment.sectionsProgress.find(s => s.sectionId.equals(sectionId));
  if (!section) throw new Error("Section not found in enrollment");

  const content = section.contentsProgress.find(c => c.contentId.equals(contentId));
  if (!content) throw new Error("Content not found in enrollment");

  const attempt = {
    attemptNumber: content.attempts.length + 1,
    answers,
    submittedFiles: files,
    submittedAt: new Date()
  };

  content.attempts.push(attempt);
  enrollment.lastAccessed = new Date();
  await enrollment.save();

  return content.attempts;
}

async function reviewAssessment({ enrollmentId, sectionId, contentId, attemptIndex, score, passed, instructorId }) {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");

  const section = enrollment.sectionsProgress.find(s => s.sectionId.equals(sectionId));
  if (!section) throw new Error("Section not found in enrollment");

  const content = section.contentsProgress.find(c => c.contentId.equals(contentId));
  if (!content) throw new Error("Content not found in enrollment");

  if (!["assessment", "quiz"].includes(content.type)) {
    throw new Error("Only assessments/quizzes require review");
  }

  const attempt = content.attempts[attemptIndex];
  if (!attempt) throw new Error("Attempt not found");

  attempt.score = score;
  attempt.passed = passed;
  attempt.reviewedBy = instructorId;
  attempt.reviewedAt = new Date();

  content.completed = true;
  content.score = score;
  content.passed = passed;

  enrollment.lastAccessed = new Date();
  await enrollment.save();

  return enrollment;
}

async function getAssessmentFiles({ enrollmentId, sectionId, contentId }) {
  const enrollment = await Enrollment.findById(enrollmentId).lean();
  if (!enrollment) throw new Error("Enrollment not found");

  const section = enrollment.sectionsProgress.find(s => s.sectionId.toString() === sectionId.toString());
  if (!section) throw new Error("Section not found");

  const content = section.contentsProgress.find(c => c.contentId.toString() === contentId.toString());
  if (!content) throw new Error("Content not found");

  return content.attempts.flatMap(a => a.submittedFiles || []);
}

async function completeEnrollment(enrollmentId) {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");

  if (enrollment.status === "completed") {
    return enrollment;
  }

  if (enrollment.progress === 100) {
    enrollment.status = "completed";
    await enrollment.save();
    return enrollment;
  }

  const pending = [];
  enrollment.sectionsProgress.forEach(section => {
    section.contentsProgress.forEach(content => {
      if (!content.completed || (content.type === "assessment" && content.passed !== true)) {
        pending.push({
          sectionId: section.sectionId,
          contentId: content.contentId,
          type: content.type,
          status: content.completed ? "awaiting review" : "not attempted"
        });
      }
    });
  });

  return {
    enrollment,
    message: "Course not fully completed yet",
    pending
  };
}

module.exports = {
  assignCourseToUser,
  submitAttempt,
  reviewAssessment,
  getAssessmentFiles,
  completeEnrollment
};
