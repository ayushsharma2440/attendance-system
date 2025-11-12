const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { getconnection } = require("../connection");
const apirouter = express.Router();

// Get current user info
apirouter.get("/auth/me", authenticateToken, (req, res) => {
   res.json({
      id: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
   });
});

apirouter.post("/location", authenticateToken, (req, res) => {
   console.log("=== ATTENDANCE DATA RECEIVED ===");
   console.log("Data:", req.body);
   console.log("Authenticated User:", req.user);
   
   const { lat, lon, name, confidence, timestamp } = req.body;

   if (!lat || !lon) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
         success: false,
         error: "Missing required fields: lat, lon"
      });
   }

   // Use authenticated user ID from JWT token
   const userId = req.user.userId;
   const authenticatedUserName = req.user.name;
   
   console.log('✓ Using authenticated user:', { userId, authenticatedUserName });
   
   // Verify that face recognition name matches logged-in user
   if (name && name !== authenticatedUserName) {
      console.log('⚠️ Authorization Failed: Face recognized as', name, 'but logged in as', authenticatedUserName);
      return res.status(403).json({ 
         success: false, 
         error: "You're not authorized. Face recognition doesn't match your account." 
      });
   }
   
   // Require name from face recognition
   if (!name) {
      console.log('❌ Face recognition name not provided');
      return res.status(400).json({
         success: false,
         error: "Face recognition name is required for attendance"
      });
   }

   const db = getconnection();
   const currentDate = new Date().toISOString().split('T')[0];
   const currentTime = new Date().toTimeString().split(' ')[0];

   // Check if already marked today
   db.query('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [userId, currentDate], (err, attendanceCheck) => {
         if (err) {
            console.error('❌ Error checking attendance:', err);
            return res.status(500).json({
               success: false,
               error: "Database error"
            });
         }

         if (attendanceCheck.length > 0) {
            console.log('⚠️ Attendance already marked today');
            return res.status(400).json({
               success: false,
               error: "Attendance already marked for today"
            });
         }

         // Insert location
         console.log('Inserting location...');
         db.query('INSERT INTO locations (latitude, longitude, at_time) VALUES (?, ?, NOW())', 
            [lat, lon], 
            (err, locationResult) => {
               if (err) {
                  console.error('❌ Error saving location:', err);
                  return res.status(500).json({
                     success: false,
                     error: "Error saving location"
                  });
               }

               const locationId = locationResult.insertId;
               console.log('✓ Location saved, ID:', locationId);

               // Insert attendance
               console.log('Inserting attendance...');
               db.query('INSERT INTO attendance (user_id, date, at_time, location_id) VALUES (?, ?, ?, ?)', 
                  [userId, currentDate, currentTime, locationId], 
                  (err, attendanceResult) => {
                     if (err) {
                        console.error('❌ Error marking attendance:', err);
                        return res.status(500).json({
                           success: false,
                           error: "Error marking attendance"
                        });
                     }

                     // Update user status
                     db.query('UPDATE USER SET has_attended = TRUE WHERE id = ?', [userId]);

                     console.log(`✅ ATTENDANCE MARKED SUCCESSFULLY for ${name} (ID: ${userId})`);
                     console.log('Attendance ID:', attendanceResult.insertId);
                     console.log('===================================');

                     return res.json({
                        success: true,
                        message: "Attendance marked successfully",
                        data: {
                           attendanceId: attendanceResult.insertId,
                           locationId: locationId,
                           userId: userId,
                           name: name,
                           date: currentDate,
                           time: currentTime,
                           location: { lat, lon },
                           confidence: confidence
                        }
                     });
                  }
               );
            }
         );
      });
   });

// Get all users (admin only)
apirouter.get('/users/all', authenticateToken, (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const sql = getconnection();
    sql.query('SELECT id, name, email, role, roll_number, mobile_number, room_number FROM USER ORDER BY name', (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Error fetching users' });
        }
        res.json(results);
    });
});

module.exports = apirouter;
