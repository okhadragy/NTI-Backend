const mongoose = require('mongoose');
const validator = require("validator");
const bcrypt = require('bcryptjs');
const imageFileValidator = require("../utils/imageFileValidator");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "User Name is Required"],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is Required"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please Enter a Valid Email"],
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  photo: {
    type: String,
    default: "profile.png",
    validate: imageFileValidator("profiles")
  },
  password: {
    type: String,
    required: [true, "Password is Required"],
    minlength: [8, "Minimum Length must be more than 8 characters"],
  },
  favCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  cartCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  taughtCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }
  next();
});


userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
const User = mongoose.model("User", userSchema);
module.exports = User
