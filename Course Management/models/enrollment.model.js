const mongoose = require('mongoose');
const User = require('./user.model');
const Course = require('./course.model');
const LiveCourseRun = require('./liveCourseRun.model');

const contentProgressSchema = new mongoose.Schema({
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['session', 'quiz', 'assessment'], required: true },
    completed: { type: Boolean, default: false },
    score: { type: Number, min: 0, max: 100 },
    passed: { type: Boolean }
}, { _id: false });

const sectionProgressSchema = new mongoose.Schema({
    sectionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contents: [contentProgressSchema]
}, { _id: false });

const enrollmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "User is required"],
        validate: {
            validator: async function (userId) {
                return await User.exists({ _id: userId });
            },
            message: "User does not exist"
        }
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, "Course is required"],
        validate: {
            validator: async function (courseId) {
                return await Course.exists({ _id: courseId });
            },
            message: "Course does not exist"
        }
    },
    liveRun: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LiveCourseRun',
        validate: {
            validator: async function (id) {
                if (!id) return true;
                return await LiveCourseRun.exists({ _id: id });
            },
            message: 'Live course run does not exist'
        }
    },

    basePrice: { type: Number, required: true },
    discountsApplied: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discount' }],
    finalPrice: { type: Number, required: true },

    enrollmentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },

    progress: { type: Number, min: 0, max: 100, default: 0 },
    sectionsProgress: { type: [sectionProgressSchema] },
    lastAccessed: { type: Date }
}, { timestamps: true });

enrollmentSchema.pre('validate', async function (next) {
  try {
    if (!this.sectionsProgress) return next();

    const course = await Course.findById(this.course).lean();
    if (!course) return next(new Error("Course not found"));

    const courseSectionIds = course.curriculum.map(s => s._id.toString());
    const allContents = course.curriculum.flatMap(s => s.contents);

    for (const section of this.sectionsProgress) {
      if (!courseSectionIds.includes(section.sectionId.toString())) {
        return next(new Error(`Invalid sectionId: ${section.sectionId}`));
      }

      for (const content of section.contents) {
        const matchedContent = allContents.find(c => c._id.equals(content.contentId));
        if (!matchedContent) {
          return next(new Error(`Invalid contentId: ${content.contentId}`));
        }
        if (content.type !== matchedContent.type) {
          content.type = matchedContent.type;
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

enrollmentSchema.pre('save', function (next) {
    if (!this.sectionsProgress || this.sectionsProgress.length === 0) {
        this.progress = 0;
        return next();
    }

    let totalContents = 0;
    let completedContents = 0;

    this.sectionsProgress.forEach(section => {
        section.contents.forEach(content => {
            totalContents++;
            if (content.completed && (content.type !== 'assessment' || content.passed)) {
                completedContents++;
            }
        });
    });

    this.progress = totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0;
    next();
});

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
module.exports = Enrollment;
