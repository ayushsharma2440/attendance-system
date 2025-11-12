# SQL Queries Documentation

This document contains all SQL queries used in the Attendance System, organized by functionality and location.

---

## Table of Contents
1. [Database Setup Queries](#database-setup-queries)
2. [Authentication Queries](#authentication-queries)
3. [User Management Queries](#user-management-queries)
4. [Attendance Queries](#attendance-queries)
5. [Location Queries](#location-queries)
6. [Face Recognition Queries](#face-recognition-queries)
7. [Admin Queries](#admin-queries)

---

## Database Setup Queries

### 1. Use Database
**Location:** `model/models.js`  
**Purpose:** Select the attendance database
```sql
use attendance;
```

### 2. Create USER Table
**Location:** `model/models.js`  
**Purpose:** Create table to store user information
```sql
CREATE TABLE IF NOT EXISTS USER (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  password VARCHAR(50),
  roll_number VARCHAR(50),
  mobile_number VARCHAR(15),
  room_number VARCHAR(50),
  has_attended BOOLEAN DEFAULT FALSE,
  role ENUM('admin', 'student') DEFAULT 'student'
)
```

### 3. Create Locations Table
**Location:** `model/models.js`  
**Purpose:** Store GPS coordinates with timestamps
```sql
CREATE TABLE IF NOT EXISTS locations (
  location_id INT AUTO_INCREMENT PRIMARY KEY,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  at_time DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4. Create Attendance Table
**Location:** `model/models.js`  
**Purpose:** Store attendance records with foreign keys
```sql
CREATE TABLE IF NOT EXISTS attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  date DATE NOT NULL,
  at_time TIME,
  location_id INT,
  FOREIGN KEY (user_id) REFERENCES USER(id),
  FOREIGN KEY (location_id) REFERENCES locations(location_id)
)
```

### 5. Create Facedata Table
**Location:** `model/models.js`  
**Purpose:** Store face recognition image filenames linked to users
```sql
CREATE TABLE IF NOT EXISTS facedata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  image_filename VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_face (user_id)
)
```

---

## Authentication Queries

### 1. User Login Query
**Location:** `controller/api.js` - POST `/login`  
**Purpose:** Authenticate user with email and password
```sql
Select * from USER where email="{email}" AND password="{password}"
```
**Usage:** Validates user credentials during login

### 2. Get User by ID for Token Verification
**Location:** `middleware/auth.js` - `authenticateToken` middleware  
**Purpose:** Fetch user details from JWT token
```sql
SELECT id, name, email, role FROM USER WHERE id = ?
```
**Usage:** Validates and retrieves user information from authentication token

---

## User Management Queries

### 1. Count Total Users
**Location:** `controller/api.js` - POST `/signup`  
**Purpose:** Get total user count to generate new user ID
```sql
SELECT COUNT(*) AS COUNT FROM User
```
**Usage:** Used during user registration to assign sequential IDs

### 2. Check if User Exists by Email
**Location:** `controller/api.js` - POST `/signup`  
**Purpose:** Prevent duplicate email registrations
```sql
SELECT * FROM User WHERE email = ?
```
**Usage:** Validates email uniqueness during signup

### 3. Insert New User
**Location:** `controller/api.js` - POST `/signup`  
**Purpose:** Create new user account
```sql
INSERT INTO User (id, name, email, password, roll_number, mobile_number, room_number) 
VALUES (?, ?, ?, ?, ?, ?, ?)
```
**Usage:** Registers new user in the system

### 4. Delete User (Rollback on Error)
**Location:** `controller/api.js` - POST `/signup`  
**Purpose:** Remove user if face data insertion fails
```sql
DELETE FROM User WHERE id = ?
```
**Usage:** Cleanup operation during failed registration

### 5. Get All Users (Admin)
**Location:** `controller/user.js` - GET `/api/users/all`  
**Purpose:** Retrieve all users for admin dashboard
```sql
SELECT id, name, email, role, roll_number, mobile_number, room_number 
FROM USER 
ORDER BY name
```
**Usage:** Admin can view all registered users

---

## Attendance Queries

### 1. Check if Attendance Already Marked Today
**Location:** `controller/attendanceController.js` - `markAttendance`  
**Location:** `controller/user.js` - POST `/api/location`  
**Location:** `routes/faceAttendance.js` - POST `/api/location`  
**Purpose:** Prevent duplicate attendance on same day
```sql
SELECT * FROM attendance WHERE user_id = ? AND date = ?
```
**Usage:** Validates attendance hasn't been marked before allowing new entry

### 2. Insert Attendance Record (with location)
**Location:** `controller/attendanceController.js` - `markAttendance`  
**Location:** `controller/user.js` - POST `/api/location`  
**Location:** `routes/faceAttendance.js` - POST `/api/location`  
**Purpose:** Mark attendance with GPS location
```sql
INSERT INTO attendance (user_id, date, at_time, location_id) 
VALUES (?, ?, ?, ?)
```
**Usage:** Records attendance with location reference

### 3. Insert Attendance Record (without location)
**Location:** `controller/attendanceController.js` - `markAttendance`  
**Purpose:** Mark attendance without GPS data
```sql
INSERT INTO attendance (user_id, date, at_time) 
VALUES (?, ?, ?)
```
**Usage:** Records attendance when location is not available

### 4. Update User Attendance Status
**Location:** `controller/attendanceController.js` - `markAttendance`  
**Location:** `controller/user.js` - POST `/api/location`  
**Location:** `routes/faceAttendance.js` - POST `/api/location`  
**Purpose:** Mark user as attended in USER table
```sql
UPDATE USER SET has_attended = TRUE WHERE id = ?
```
**Usage:** Updates user record after successful attendance marking

### 5. Get User's Own Attendance Records
**Location:** `controller/attendanceController.js` - `getMyAttendance`  
**Purpose:** Fetch attendance history for logged-in user
```sql
SELECT a.*, u.name, l.latitude, l.longitude 
FROM attendance a
JOIN USER u ON a.user_id = u.id
LEFT JOIN locations l ON a.location_id = l.location_id
WHERE a.user_id = ?
ORDER BY a.date DESC, a.at_time DESC
```
**Usage:** Display user's attendance records in `/myattendance` page

### 6. Get All Attendance Records (Admin)
**Location:** `controller/attendanceController.js` - `getAllAttendance`  
**Purpose:** Retrieve all attendance for admin dashboard
```sql
SELECT a.*, u.name, u.email, l.latitude, l.longitude 
FROM attendance a
JOIN USER u ON a.user_id = u.id
LEFT JOIN locations l ON a.location_id = l.location_id
ORDER BY a.date DESC, a.at_time DESC
```
**With Date Filter:**
```sql
SELECT a.*, u.name, u.email, l.latitude, l.longitude 
FROM attendance a
JOIN USER u ON a.user_id = u.id
LEFT JOIN locations l ON a.location_id = l.location_id
WHERE a.date = ?
ORDER BY a.date DESC, a.at_time DESC
```
**Usage:** Admin can view all attendance records, optionally filtered by date

### 7. Get Recent Attendance Records (Admin)
**Location:** `routes/attendance.js` - GET `/api/attendance/recent`  
**Purpose:** Get latest N attendance records for admin dashboard
```sql
SELECT a.*, u.name, u.email, l.latitude, l.longitude 
FROM attendance a
JOIN USER u ON a.user_id = u.id
LEFT JOIN locations l ON a.location_id = l.location_id
ORDER BY a.date DESC, a.at_time DESC
LIMIT ?
```
**Usage:** Shows recent attendance activity on admin dashboard

---

## Location Queries

### 1. Insert Location Data
**Location:** `controller/attendanceController.js` - `markAttendance`  
**Location:** `controller/user.js` - POST `/api/location`  
**Location:** `routes/faceAttendance.js` - POST `/api/location`  
**Purpose:** Store GPS coordinates when marking attendance
```sql
INSERT INTO locations (latitude, longitude, at_time) 
VALUES (?, ?, NOW())
```
**Usage:** Records location data before creating attendance entry

---

## Face Recognition Queries

### 1. Get Face Data Mappings
**Location:** `faceRecognition.js` - `loadReferenceImages`  
**Purpose:** Map image filenames to user names for face recognition
```sql
SELECT f.image_filename, u.name 
FROM facedata f
JOIN USER u ON f.user_id = u.id
```
**Usage:** Loads face recognition training data on server startup

### 2. Insert Face Data
**Location:** `controller/api.js` - POST `/signup`  
**Purpose:** Store face image filename for new user
```sql
INSERT INTO facedata (user_id, image_filename) 
VALUES (?, ?)
```
**Usage:** Links uploaded face image to user account during registration

### 3. Get User ID by Name (Face Recognition)
**Location:** `routes/faceAttendance.js` - POST `/api/location`  
**Purpose:** Find user ID from recognized face name
```sql
SELECT id FROM USER WHERE name = ?
```
**Usage:** Converts face recognition result to user ID for attendance marking

---

## Admin Queries

### 1. Count Total Students
**Location:** `routes/attendance.js` - GET `/api/attendance/stats`  
**Purpose:** Get total number of students (excluding admins)
```sql
SELECT COUNT(*) as totalStudents FROM USER WHERE role = "student"
```
**Usage:** Admin dashboard statistics

### 2. Count Present Students Today
**Location:** `routes/attendance.js` - GET `/api/attendance/stats`  
**Purpose:** Get number of students who marked attendance today
```sql
SELECT COUNT(*) as presentToday FROM attendance WHERE date = ?
```
**Usage:** Admin dashboard statistics

### 3. Count Total Students (excluding admins)
**Location:** `controller/attendanceController.js` - `getAttendanceStats`  
**Purpose:** Get total student count for statistics
```sql
SELECT COUNT(*) as count FROM USER WHERE role != 'admin'
```
**Usage:** Calculate attendance statistics

### 4. Count Present Today (Distinct Users)
**Location:** `controller/attendanceController.js` - `getAttendanceStats`  
**Purpose:** Get unique students present today
```sql
SELECT COUNT(DISTINCT user_id) as count 
FROM attendance 
WHERE date = ?
```
**Usage:** Admin dashboard statistics for today's attendance

---

## Query Summary by Feature

### User Features
- **Login:** 1 query (validate credentials)
- **Signup:** 4 queries (count, check existence, insert user, insert face data)
- **View My Attendance:** 1 query (get personal attendance records)
- **Mark Attendance:** 5 queries (check duplicate, insert location, insert attendance, update status, verify user)

### Admin Features
- **View All Users:** 1 query
- **View All Attendance:** 1-2 queries (with/without date filter)
- **Attendance Statistics:** 2 queries (total students, present today)
- **Recent Attendance:** 1 query

### System Features
- **Database Setup:** 5 queries (create tables)
- **Authentication:** 2 queries (verify token, get user data)
- **Face Recognition:** 2 queries (load mappings, get user by name)

---

## Query Optimization Notes

1. **Indexes Recommended:**
   - `USER(email)` - For login queries
   - `attendance(user_id, date)` - For checking duplicates
   - `attendance(date)` - For admin statistics
   - `facedata(user_id)` - For face recognition lookups

2. **Security Concerns:**
   - Login query uses string interpolation (SQL injection risk) - Should use parameterized queries
   - Passwords stored in plain text - Should be hashed

3. **Performance Considerations:**
   - Use `LIMIT` on admin queries to prevent large result sets
   - Consider pagination for attendance history
   - Add composite indexes for frequently joined tables

---

**Last Updated:** November 12, 2025  
**Total Queries:** 35+ SQL operations across the application
