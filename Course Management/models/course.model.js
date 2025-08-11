const mongoose = require('mongoose');
const User = require('./user.model');
const imageFileValidator = require("../utils/imageFileValidator");

const assessmentSchema = new mongoose.Schema({
    title: { type: String, required: [true, "Assessment title is required"] },
    description: { type: String, required: [true, "Assessment description is required"] },
    deliverables: [{
        name: { type: String, required: [true, "Deliverable name is required"] },
        fileUrl: { type: String },
        instructions: { type: String }
    }],
    dueDate: { type: Date }
}, { _id: false });

const questionSchema = new mongoose.Schema({
    question: { type: String, required: [true, "Question is required"] },
    options: {
        type: [String],
        validate: v => v.length >= 2,
        required: [true, "Options are required"]
    },
    correctAnswerIndex: {
        type: Number,
        required: [true, "Corrected answer index is required"],
        validate: {
            validator: function (val) {
                return Array.isArray(this.options) && val >= 0 && val < this.options.length;
            },
            message: "Correct answer index must match one of the options"
        }
    },
    order: { type: Number, required: [true, "Question Order is required"] },
}, { _id: false });

const quizSchema = new mongoose.Schema({
    title: { type: String, required: [true, "Quiz title is required"] },
    questions: {
        type: [questionSchema],
        validate: v => v.length > 0
    },
    passingScore: {
        type: Number,
        min: [0, "Passing score must be at least 0"],
        max: [100, "Passing score cannot exceed 100"],
        default: 50
    }
}, { _id: false });

const courseQuestionSchema = new mongoose.Schema({
    question: { type: questionSchema, required: [true, "Question is required"] },
    appearTime: {
        type: Number, // time in seconds
        required: [true, "Appear time is required"],
        min: [0, "Appear time cannot be negative"]
    }
}, { _id: false });

const materialSchema = new mongoose.Schema({
    title: { type: String, required: [true, "Material title is required"] },
    fileUrl: { type: String, required: [true, "File url is required"] }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    session_title: { type: String, required: [true, "Session title is required"] },
    duration: {
        type: Number,
        required: [true, "Duration is required"],
        min: [1, "Duration must be at least 1 minute"]
    },
    content: { type: String, required: [true, "Content is required"] },
    recordingUrl: {
        type: String,
        validate: {
            validator: v => /^https?:\/\/.+/.test(v),
            message: props => `${props.value} is not a valid URL`
        },
        required: false
    },
    questions: {
        type: [courseQuestionSchema],
        validate: {
            validator: function (questions) {
                if (!questions || questions.length === 0) return true;
                return questions.every(q => q.appearTime <= this.duration * 60);
            },
            message: "Each question's appearTime must be less than the session duration"
        }
    },
    materials: [materialSchema]
}, { _id: false });

const sectionContentSchema = new mongoose.Schema({
    type: { type: String, enum: ['session', 'quiz', 'assessment'], required: [true, "Section content type is required"] },
    order: { type: Number, required: [true, "Section content order is required"] },
    session: { type: sessionSchema, required: function () { return this.type === 'session'; } },
    quiz: { type: quizSchema, required: function () { return this.type === 'quiz'; } },
    assessment: { type: assessmentSchema, required: function () { return this.type === 'assessment'; } },
});

const sectionSchema = new mongoose.Schema({
    title: { type: String, required: [true, "Section name is required"] },
    contents: {
        type: [sectionContentSchema],
        default: []
    },
    order: { type: Number, required: [true, "Section order is required"] }
});

const instructorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    role: {
        type: String,
        enum: ['owner', 'lecturer', 'assistant', 'guest'],
        required: true,
    }
}, { _id: false });

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Course name is required"],
        unique: true,
        trim: true,
    },
    thumbnail: {
        type: String,
        default: "default-thumbnail.png",
        validate: imageFileValidator("courses")
    },
    bannerImage: {
        type: String,
        default: "default-banner.jpg",
        validate: imageFileValidator("courses")
    },
    description: {
        type: String,
        required: [true, "Course description is required"],
        minlength: [10, "Description should be at least 10 characters"]
    },
    instructors: {
        type: [instructorSchema],
        required: [true, "At least one instructor is required"],
        validate: {
            validator: async function (instructors) {
                if (!Array.isArray(instructors) || instructors.length === 0) return false;

                const userIds = instructors.map(i => i.user);
                const users = await User.find({ _id: { $in: userIds } });

                if (users.length !== userIds.length) return false;

                return users.every(u => u.role === 'instructor');
            },
            message: "All users must exist and have the role 'instructor'"
        }
    },
    department: {
        type: String,
        required: [true, "Department is required"],
        enum: ["Computer Science", "Engineering", "Business", "Math", "Language", "Other"],
        default: "Other"
    },
    status: {
        type: String,
        enum: ["Not Started", "Planning", "Content Creation", "Review", "Completed"],
        default: "Not Started"
    },
    curriculum: [sectionSchema],
    rating: {
        average: {
            type: Number,
            min: [0, "Rating must be at least 0"],
            max: [5, "Rating cannot exceed 5"],
            default: 0
        },
        count: {
            type: Number,
            min: [0, "Rating count cannot be negative"],
            default: 0
        },
        reviews: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            score: {
                type: Number,
                min: [0, "Rating must be at least 0"],
                max: [5, "Rating cannot exceed 5"],
                required: true
            },
            comment: { type: String, trim: true }
        }]
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price must be a positive number"],
        default: 0
    }
}, {
    timestamps: true
});

sectionSchema.pre('save', function (next) {
    if (this.contents && this.contents.length) {
        this.contents.sort((a, b) => a.order - b.order);
    }
    next();
});


courseSchema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: Date.now() });
    next();
});

courseSchema.post('save', async function (doc, next) {
    try {
        const courseId = doc._id;
        const newInstructorIds = doc.instructors.map(i => i.user.toString()); // <-- extract user ObjectIds here

        await User.updateMany(
            { _id: { $in: newInstructorIds }, role: 'instructor' },
            { $addToSet: { taughtCourses: courseId } }
        );

        const allInstructors = await User.find({ taughtCourses: courseId });
        const outdatedInstructors = allInstructors.filter(user =>
            !newInstructorIds.includes(user._id.toString())
        );

        await Promise.all(outdatedInstructors.map(user => {
            user.taughtCourses.pull(courseId);
            return user.save();
        }));

        next();
    } catch (err) {
        next(err);
    }
});

courseSchema.pre('remove', async function (next) {
    try {
        const courseId = this._id;
        await mongoose.model('User').updateMany(
            { taughtCourses: courseId },
            { $pull: { taughtCourses: courseId } }
        );
        next();
    } catch (err) {
        next(err);
    }
});

courseSchema.index({ department: 1 });
courseSchema.index({ instructors: 1 });

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
