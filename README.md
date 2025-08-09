# Course Management API

This is a simple RESTful API built using **Node.js**, **Express**, and **MongoDB** (via Mongoose) to manage courses and instructors.

---

## 🚀 API Routes Summary

## Admin User Routes (`/admin/users`)

| Method | Route                | Description                      |
|--------|----------------------|---------------------------------|
| GET    | `/admin/users`       | Get all users                   |
| POST   | `/admin/users`       | Create a new user (with photo)  |
| GET    | `/admin/users/:id`   | Get user profile by ID          |
| PATCH  | `/admin/users/:id`   | Update user by ID               |
| DELETE | `/admin/users/:id`   | Delete user by ID               |

## User Routes (`/users`)

| Method | Route                  | Description                          |
|--------|------------------------|------------------------------------|
| POST   | `/users/signup`        | User signup (with optional photo)  |
| POST   | `/users/login`         | User login                         |
| POST   | `/users/changePassword`| Change password                    |
| GET    | `/users`               | Get logged-in user's profile       |
| PATCH  | `/users`               | Update logged-in user's profile    |
| DELETE | `/users`               | Delete logged-in user              |
| POST   | `/users/addToFav`      | Add course to user's favorites    |
| POST   | `/users/removeFromFav` | Remove course from favorites       |
| POST   | `/users/addToCart`     | Add course to cart                 |
| POST   | `/users/removeFromCart`| Remove course from cart            |
| GET    | `/users/courses`       | Get courses owned by user (instructor only) |

## Courses Routes (`/courses`)

| Method | Route              | Description                        |
|--------|--------------------|----------------------------------|
| POST   | `/courses`         | Create a new course (thumbnail & banner upload) |
| GET    | `/courses`         | Get all courses                  |
| GET    | `/courses/:id`     | Get a course by ID              |
| PATCH  | `/courses/:id`     | Update a course                 |
| DELETE | `/courses/:id`     | Delete a course                 |

---

### Data Management Commands

You can manage your data using the following npm scripts:

| Command                              | Description                           |
|------------------------------------|-------------------------------------|
| `npm run insert -- <modelName> <filePath>` | Insert data into a model from a JSON file |
| `npm run delete -- <modelName>`               | Delete all data from a model              |
| `npm run upsert -- <modelName> <filePath>`   | Update or insert data into a model from a JSON file |

**Example:**

```bash
npm run insert -- course ./courses.json
```

---
## 💻 How to Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/okhadragy/NTI-BACKEND
cd "NTI-BACKEND\Course Management"
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

### 4. Add test data

```bash
npm run insert -- user ./users.json
npm run insert -- course ./course.json
```

### 5. Run the Project

```bash
npm start
```

Server will run at: http://localhost:PORT

