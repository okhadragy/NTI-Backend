# Course Management API

This is a simple RESTful API built using **Node.js**, **Express**, and **MongoDB** (via Mongoose) to manage courses and instructors.

---

## 🧠 Entity Chosen: `Course`

### Why `Course`?
The `Course` entity was chosen because it represents a practical real-world use case in educational platforms. Each course includes:
- Title
- Description
- Duration
- Curriculum (structured by week and sessions)
- Instructor (linked via user ID)
- Pricing
- Type (e.g., live, recorded)
- Recording links and other metadata

This makes it perfect for practicing database modeling and CRUD operations.

---

## 🚀 API Routes Summary

### `Courses`

| Method | Route                   | Description                       |
|--------|-------------------------|-----------------------------------|
| POST   | `/api/courses`          | Create a new course               |
| GET    | `/api/courses`          | Get all courses                   |
| GET    | `/api/courses/:id`      | Get a specific course by ID       |
| PUT    | `/api/courses/:id`      | Update a specific course          |
| DELETE | `/api/courses/:id`      | Delete a course                   |

> 🔁 All course endpoints support population of instructor details.

---

## 👨‍🏫 Instructor (User Model)

Instructors are linked to courses using the `instructor` field, which references the `User` model.

---

## 💻 How to Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/okhadragy/NTI-MEAN-tasks
cd "NTI-MEAN-tasks\task-session-5\Course Management"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a .env file in the course-management folder with:

```bash
MONGO_URI=your_mongodb_connection_string
MONGO_DB_NAME=your_mongodb_db_name
PORT=port_number
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=token_expiration_duration
```

### 4. Run the Project

```bash
npm start
```

Server will run at: http://localhost:PORT

