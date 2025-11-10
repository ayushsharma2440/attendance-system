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
   
   // Optional: Verify that face recognition name matches logged-in user
   if (name && name !== authenticatedUserName) {
      console.log('⚠️ Warning: Face recognized as', name, 'but logged in as', authenticatedUserName);
      // You can choose to reject or just log the warning
      // return res.status(403).json({ success: false, error: 'Face does not match logged-in user' });
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

module.exports = apirouter;
