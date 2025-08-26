const express = require('express');
const connectDB = require('./config/db');
const courseRoutes = require('./routes/course.routes');
const userRoutes = require('./routes/user.routes');
const adminUserRoutes = require('./routes/admin.user.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const cors = require("cors");
const path = require("path")

require("dotenv").config();
const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
connectDB();
app.use('/courses', courseRoutes);
app.use('/users', userRoutes);
app.use('/enrollments', enrollmentRoutes);
app.use('/admin/users', adminUserRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
