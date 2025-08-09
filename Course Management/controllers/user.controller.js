const User = require("../models/user.model");
const JWT = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');


const signup = async (req, res) => {
  const uploadedPhoto = req.file?.filename || "profile.png";

  try {
    let { name, password, confirmPassword, email, role } = req.body;

    if (!role) role = 'student';

    const allowedRolesForSignup = ['student', 'instructor'];

    if (role === 'admin') {
      if (!req.userRole || req.userRole !== 'admin') {
        if (req.file) {
          fs.unlinkSync(path.join(__dirname, "../uploads/profiles", uploadedPhoto));
        }
        return res.status(403).json({
          status: "fail",
          message: "You do not have permission to create admin users",
        });
      }
    } else if (!allowedRolesForSignup.includes(role)) {
      if (req.file) {
        fs.unlinkSync(path.join(__dirname, "../uploads/profiles", uploadedPhoto));
      }
      return res.status(400).json({
        status: "fail",
        message: `Role must be one of: ${allowedRolesForSignup.join(", ")}`,
      });
    }

    if (password !== confirmPassword) {
      if (req.file) {
        fs.unlinkSync(path.join(__dirname, "../uploads/profiles", uploadedPhoto));
      }

      return res.status(400).json({ status: "fail", message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      if (req.file) {
        fs.unlinkSync(path.join(__dirname, "../uploads/profiles", uploadedPhoto));
      }
      return res.status(400).json({ status: "fail", message: `User already exists` });
    }

    const user = await User.create({ name, password, email, photo: uploadedPhoto, role });

    const token = JWT.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(201).json({ status: "success", token, data: { user } });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, "../uploads/profiles", uploadedPhoto));
    }
    res.status(400).json({ status: "fail", message: `Error in sign up ${error.message}` });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      status: "fail",
      message: "Email or Password is missing",
    });
  }

  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return res.status(404).json({
      status: "fail",
      message: "User does not exist",
    });
  }

  const isMatch = await bcrypt.compare(password, existingUser.password);
  if (!isMatch) {
    return res.status(401).json({
      status: "fail",
      message: "Incorrect email or password",
    });
  }

  const token = JWT.sign(
    { id: existingUser._id, name: existingUser.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return res.status(200).json({
    status: "success",
    token,
    data: { user: { name: existingUser.name, email: existingUser.email } },
  });
};

const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ status: "fail", message: "Please provide current, new, and confirm passwords" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ status: "fail", message: "New passwords do not match" });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: "fail", message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ status: "success", message: "Password changed successfully" });

  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const users = await User.find({}, { password: 0, __v: 0, _id: 0 })
      .skip(skip)
      .limit(limit);


    res.status(200).json({
      status: "success",
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      length: users.length,
      data: { users },
    });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;

    const userId = requesterRole === 'admin' ? req.params.id : requesterId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: "fail", message: "Invalid User ID" });
    }

    const user = await User.findById(userId, { password: 0, __v: 0, _id: 0 })
      .populate('favCourses', 'name thumbnail price')
      .populate('cartCourses', 'name thumbnail price')
      .populate('taughtCourses', 'name thumbnail price');

    if (!user) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    res.status(500).json({ status: "fail", message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;

    const userId = requesterRole === 'admin' ? req.params.id : requesterId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: "fail", message: "Invalid User ID" });
    }

    if (requesterRole !== 'admin' && 'role' in req.body) {
      delete req.body.role;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
      new: true,
      runValidators: true,
      select: '-password -__v -_id'
    });

    if (!updatedUser) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    res.status(200).json({ status: "success", data: updatedUser });
  } catch (error) {
    console.error("Error updating User:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;

    const userId = requesterRole === 'admin' ? req.params.id : requesterId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ status: "fail", message: "Invalid User ID" });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    res.status(200).json({ status: "success", message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting User:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

const addCourseToFav = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        status: "fail",
        message: "Course ID is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    if (!user.favCourses.includes(courseId)) {
      user.favCourses.push(courseId);
      await user.save();
    }

    res.status(200).json({
      status: "success",
      data: { favCourses: user.favCourses },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

const removeCourseFromFav = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        status: "fail",
        message: "Course ID is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    user.favCourses = user.favCourses.filter(id => id.toString() !== courseId);
    await user.save();

    res.status(200).json({
      status: "success",
      data: { favCourses: user.favCourses },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

const addCourseToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        status: "fail",
        message: "Course ID is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    if (!user.cartCourses.includes(courseId)) {
      user.cartCourses.push(courseId);
      await user.save();
    }

    res.status(200).json({
      status: "success",
      data: { cartCourses: user.cartCourses },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

const removeCourseFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        status: "fail",
        message: "Course ID is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    user.cartCourses = user.cartCourses.filter(id => id.toString() !== courseId);
    await user.save();

    res.status(200).json({
      status: "success",
      data: { cartCourses: user.cartCourses },
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

module.exports = {
  signup,
  login,
  changePassword,
  getAllUsers,
  getUserProfile,
  updateUser,
  deleteUser,
  addCourseToFav,
  removeCourseFromFav,
  addCourseToCart,
  removeCourseFromCart
};
