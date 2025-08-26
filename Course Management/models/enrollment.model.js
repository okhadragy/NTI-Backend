const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
    attemptNumber: { type: Number, required: true, min: 1 },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
        answer: { type: mongoose.Schema.Types.Mixed, required: true }, // text, choice, etc.
        correct: { type: Boolean, required: true }
    }],
    submittedFiles: [{ type: String }],
    score: { type: Number, min: 0, max: 100 },
    passed: { type: Boolean },
    feedback: { type: String, maxlength: 1000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now }
}, { _id: false });

const contentProgressSchema = new mongoose.Schema({
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["session", "quiz", "assessment"], required: true },
    completed: { type: Boolean, default: false },
    score: { type: Number, min: 0, max: 100 },
    passed: { type: Boolean },
    attempts: {
        type: [attemptSchema],
        validate: {
            validator: function (attempts) {
                return Array.isArray(attempts) && attempts.every(a => a.attemptNumber > 0);
            },
            message: "Invalid attempt data"
        }
    }
}, { _id: false });

contentProgressSchema.methods.addAttempt = function (attempt) {
    attempt.attemptNumber = this.attempts.length + 1;
    this.attempts.push(attempt);
    this.score = attempt.score;
    this.passed = attempt.passed;
    this.completed = this.type === "session" ? true : !!attempt.passed;
};

const sectionProgressSchema = new mongoose.Schema({
    sectionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentsProgress: {
        type: [contentProgressSchema],
        validate: {
            validator: function (arr) {
                return Array.isArray(arr);
            },
            message: "contentsProgress must be an array"
        }
    }
}, { _id: false });

const enrollmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required"],
        validate: {
            validator: async function (userId) {
                return await mongoose.model("User").exists({ _id: userId });
            },
            message: "User does not exist",
        },
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: [true, "Course is required"],
        validate: {
            validator: async function (courseId) {
                return await mongoose.model("Course").exists({ _id: courseId });
            },
            message: "Course does not exist",
        },
    },

    liveRun: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LiveRun",
        validate: {
            validator: async function (id) {
                if (!id) return true; // allow null
                return await mongoose.model("LiveRun").exists({ _id: id });
            },
            message: "Live run does not exist",
        },
    },
    basePrice: { type: Number, required: true },
    discountsApplied: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discount' }],
    finalPrice: { type: Number, required: true },
    status: { type: String, enum: ["in_progress", "completed", "dropped"], default: "in_progress" },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    sectionsProgress: {
        type: [sectionProgressSchema],
        validate: {
            validator: function (arr) {
                return Array.isArray(arr);
            },
            message: "sectionsProgress must be an array"
        }
    },
}, { timestamps: true });

enrollmentSchema.pre("validate", async function (next) {
    if (!this.isModified("sectionsProgress")) return next();

    for (const sec of this.sectionsProgress) {
        for (const content of sec.contentsProgress) {
            content.attempts.forEach((a, i) => {
                if (a.attemptNumber !== i + 1) {
                    return next(new Error("Attempt numbers must be sequential"));
                }
            });
        }
    }

    next();
});

enrollmentSchema.pre("save", function (next) {
    if (!this.sectionsProgress || this.sectionsProgress.length === 0) {
        this.progress = 0;
        return next();
    }
    const totalContents = this.sectionsProgress.reduce(
        (sum, sec) => sum + (sec.contentsProgress?.length || 0), 0
    );
    if (totalContents === 0) {
        this.progress = 0;
    } else {
        const completed = this.sectionsProgress.reduce(
            (sum, sec) => sum + sec.contentsProgress.filter(c => c.completed).length, 0
        );
        this.progress = Math.round((completed / totalContents) * 100);
    }

    if (this.progress === 100) {
        this.status = "completed";
        if (!this.completedAt) this.completedAt = new Date();
    }

    next();
});

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ user: 1, status: 1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
module.exports = Enrollment;
