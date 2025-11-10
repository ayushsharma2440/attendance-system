# Attendance System Implementation Guide

## Overview
This document outlines the complete implementation of the attendance management system with proper database schema, backend APIs, and frontend views.

## Database Schema

### Tables Structure
The system uses three main tables following the provided schema:

1. **USER Table**
   - `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
   - `name` (VARCHAR(50), NOT NULL)
   - `email` (VARCHAR(100))
   - `password` (VARCHAR(50))
   - `has_attended` (BOOLEAN, DEFAULT FALSE)
   - `role` (ENUM('admin', 'student'), DEFAULT 'student')

2. **locations Table** (Created first)
   - `location_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
   - `latitude` (DECIMAL(10,7))
   - `longitude` (DECIMAL(10,7))
   - `at_time` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

3. **attendance Table** (References locations)
   - `attendance_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
   - `user_id` (INT, FOREIGN KEY → USER.id)
   - `date` (DATE, NOT NULL)
   - `at_time` (TIME)
   - `location_id` (INT, FOREIGN KEY → locations.location_id)

### Relationships
- One USER can have multiple attendance records (1:N)
- One location can be referenced by multiple attendance records (1:N)
- Each attendance record belongs to one user and optionally one location

## Backend API Endpoints

### Authentication Endpoints
- `GET /api/auth/me` - Get current user information (Protected)

### Attendance Endpoints
All endpoints are protected with JWT authentication:

1. `POST /api/attendance/mark` - Mark attendance
   - Body: `{ latitude, longitude }`
   - Creates location first, then attendance record
   - Checks for duplicate attendance on same date

2. `GET /api/attendance/my` - Get current user's attendance
   - Returns attendance records with location data

3. `GET /api/attendance/all` - Get all attendance records (Admin only)
   - Returns all attendance with user and location information

4. `GET /api/attendance/stats` - Get attendance statistics (Admin only)
   - Returns: totalStudents, presentToday, absentToday

5. `GET /api/attendance/recent?limit=10` - Get recent attendance (Admin only)
   - Returns recent attendance records with limit

## Frontend Pages

### 1. My Attendance Page (`/myattendance`)
**Features:**
- Personal attendance statistics dashboard
- Cards showing: Total Present, Total Absent, Attendance %
- Interactive attendance chart using Chart.js
- Recent attendance activity list with dates and times
- Location viewing on Google Maps
- Responsive design with Tailwind CSS

**Technologies:**
- EJS templating
- Tailwind CSS for styling
- Chart.js for data visualization
- Font Awesome icons

### 2. Admin Dashboard (`/admin`)
**Features:**
- System-wide statistics overview
- Total students, present today, absent today metrics
- Monthly attendance trends chart
- Recent attendance table with user details
- Collapsible sidebar navigation
- Search and export functionality
- Location tracking for each attendance
- Pagination support

**Technologies:**
- EJS templating
- Tailwind CSS for styling
- Chart.js for trends
- Font Awesome icons
- Responsive sidebar

### 3. Mark Attendance Page (`/markattendance`)
- Uses existing `home.ejs` view
- Frontend to match design requirements

## Middleware

### Authentication Middleware (`middleware/auth.js`)
1. `authenticateToken` - Validates JWT token from:
   - Authorization header (Bearer token)
   - Cookie (fallback)
   - Attaches user info to request object

2. `isAdmin` - Checks if authenticated user has admin role

## File Structure
```
Attendance/
├── controller/
│   ├── api.js                    # View routes
│   ├── attendanceController.js   # Attendance business logic
│   ├── auth.js                   # Authentication helpers
│   └── user.js                   # User API endpoints
├── middleware/
│   ├── auth.js                   # JWT authentication middleware
│   └── middleware.js             # Existing middleware
├── model/
│   └── models.js                 # Database schema
├── routes/
│   ├── attendance.js             # Attendance API routes
│   └── faceAttendance.js         # Face recognition routes
├── views/
│   ├── admin.ejs                 # Admin dashboard
│   ├── myattendance.ejs          # User attendance page
│   ├── home.ejs                  # Mark attendance page
│   ├── login.ejs                 # Login page
│   └── signup.ejs                # Signup page
├── index.js                       # Main server file
└── connection.js                  # Database connection
```

## API Request/Response Examples

### Mark Attendance
```javascript
POST /api/attendance/mark
Headers: Authorization: Bearer <token>
Body: {
  "latitude": 28.7041,
  "longitude": 77.1025
}

Response: {
  "message": "Attendance marked successfully",
  "attendanceId": 123
}
```

### Get My Attendance
```javascript
GET /api/attendance/my
Headers: Authorization: Bearer <token>

Response: [
  {
    "attendance_id": 1,
    "user_id": 5,
    "date": "2025-11-10",
    "at_time": "14:30:00",
    "location_id": 10,
    "name": "John Doe",
    "latitude": 28.7041,
    "longitude": 77.1025
  }
]
```

### Get Statistics (Admin)
```javascript
GET /api/attendance/stats
Headers: Authorization: Bearer <token>

Response: {
  "totalStudents": 50,
  "presentToday": 35,
  "absentToday": 15
}
```

## Environment Variables
Make sure to set these in your `.env` file:
```
JWT_SECRET=your-secret-key-here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=attendance
```

## How to Test

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Create an admin user:**
   - Use MySQL to insert an admin user:
   ```sql
   INSERT INTO USER (name, email, password, role) 
   VALUES ('Admin', 'admin@example.com', 'admin123', 'admin');
   ```

3. **Login:**
   - Navigate to `http://localhost:8000/login`
   - Use admin credentials
   - Should redirect to `/admin`

4. **Create a student user:**
   - Navigate to `http://localhost:8000/signup`
   - Register as a student
   - Login with student credentials
   - Should redirect to `/myattendance`

5. **Test attendance marking:**
   - Use the mark attendance page or API
   - Check that location is saved properly
   - Verify attendance appears in both user and admin views

## Key Features Implemented

✅ Correct database schema with proper foreign key relationships
✅ Location created before attendance (as per schema)
✅ JWT authentication for all API endpoints
✅ Role-based access control (admin vs student)
✅ Modern, responsive UI with Tailwind CSS
✅ Data visualization with Chart.js
✅ Location tracking and Google Maps integration
✅ Real-time statistics on dashboard
✅ Duplicate attendance prevention (one per day)
✅ Comprehensive error handling

## Security Considerations

1. **JWT Authentication:** All API endpoints are protected
2. **Role-Based Access:** Admin routes check for admin role
3. **SQL Injection Prevention:** Using parameterized queries
4. **Token Validation:** Tokens verified on each request
5. **Middleware Protection:** Routes protected at middleware level

## Next Steps / Improvements

1. **Password Hashing:** Implement bcrypt for password security
2. **Input Validation:** Add validation middleware for request bodies
3. **Rate Limiting:** Prevent abuse of API endpoints
4. **Pagination:** Implement proper pagination for large datasets
5. **Date Range Filters:** Add date filtering for attendance reports
6. **Export to CSV/Excel:** Implement data export functionality
7. **Email Notifications:** Send daily attendance reports
8. **Mobile Responsive:** Further optimize for mobile devices
9. **Real-time Updates:** Consider WebSocket for live updates
10. **Testing:** Add unit and integration tests

## Troubleshooting

### Common Issues

1. **Token not working:**
   - Check if JWT_SECRET is set in .env
   - Verify token is passed in Authorization header
   - Check token expiration

2. **Location not saving:**
   - Ensure locations table is created before attendance table
   - Check latitude/longitude format (DECIMAL(10,7))

3. **Admin page not loading:**
   - Verify user has 'admin' role in database
   - Check authentication middleware is working

4. **Database connection error:**
   - Verify database credentials in .env
   - Ensure MySQL is running
   - Check if database 'attendance' exists

## Contact & Support
For issues or questions, please refer to the project documentation or contact the development team.
