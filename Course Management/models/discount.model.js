const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    type: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: [0, "Discount value must be positive"]
    },
    startDate: { type: Date },
    endDate: { type: Date },
    usageLimit: { type: Number }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    }], // empty array means applicable to all courses
    active: { type: Boolean, default: true }
}, { timestamps: true });

const Discount = mongoose.model("Discount", discountSchema);
module.exports = Discount;
