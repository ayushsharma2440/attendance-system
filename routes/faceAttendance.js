const express = require('express');
const router = express.Router();
const multer = require('multer');
const faceRecognition = require('../faceRecognition');
const { getconnection } = require('../connection');

// Configure multer for image upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

/**
 * POST /api/mark-attendance-with-face
 * Mark attendance with face verification
 * Expects: multipart/form-data with 'image' field
 */
router.post('/mark-attendance-with-face', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image provided'
            });
        }

        // Verify face
        const result = await faceRecognition.verifyFace(req.file.buffer);

        if (result.success && result.recognized) {
            const { name, confidence } = result;

            // TODO: Add your database logic here to mark attendance
            // Example:
            // await db.query('INSERT INTO attendance (name, timestamp) VALUES (?, NOW())', [name]);

            return res.json({
                success: true,
                message: `Attendance marked for ${name}`,
                name: name,
                confidence: confidence,
                timestamp: new Date()
            });
        } else {
            return res.status(401).json({
                success: false,
                error: result.error || 'Face not recognized'
            });
        }

    } catch (error) {
        console.error('Face verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Face verification failed'
        });
    }
});

/**
 * POST /api/verify-face
 * Just verify face without marking attendance
 */
router.post('/verify-face', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image provided'
            });
        }

        const result = await faceRecognition.verifyFace(req.file.buffer);
        return res.json(result);

    } catch (error) {
        console.error('Face verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Face verification failed'
        });
    }
});

/**
 * POST /api/reload-faces
 * Reload training data when new images are added
 */
router.post('/reload-faces', async (req, res) => {
    try {
        const result = await faceRecognition.reloadTraining();
        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/loaded-faces
 * Get list of loaded face names
 */
router.get('/loaded-faces', (req, res) => {
    try {
        const faces = faceRecognition.getLoadedFaces();
        return res.json({
            success: true,
            faces: faces,
            count: faces.length
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/location
 * Store attendance with location data after face verification
 */
router.post('/location', async (req, res) => {
    try {
        const { lat, lon, name, confidence, timestamp } = req.body;
        
        console.log('Received attendance data:', { lat, lon, name, confidence, timestamp });

        if (!lat || !lon || !name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: lat, lon, name'
            });
        }

        const db = getconnection();
        
        // First, find the user by name
        db.query('SELECT id FROM USER WHERE name = ?', [name], (err, userResults) => {
            if (err) {
                console.error('Error finding user:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Database error while finding user'
                });
            }

            if (userResults.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: `User '${name}' not found in database`
                });
            }

            const userId = userResults[0].id;
            const currentDate = new Date().toISOString().split('T')[0];
            const currentTime = new Date().toTimeString().split(' ')[0];

            // Check if attendance already marked for today
            db.query('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [userId, currentDate], (err, attendanceResults) => {
                if (err) {
                    console.error('Error checking attendance:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Database error while checking attendance'
                    });
                }

                if (attendanceResults.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Attendance already marked for today',
                        alreadyMarked: true
                    });
                }

                // Insert location data
                db.query('INSERT INTO locations (latitude, longitude, at_time) VALUES (?, ?, NOW())', 
                    [lat, lon], 
                    (err, locationResult) => {
                        if (err) {
                            console.error('Error saving location:', err);
                            return res.status(500).json({
                                success: false,
                                error: 'Error saving location data'
                            });
                        }

                        const locationId = locationResult.insertId;

                        // Insert attendance record
                        db.query('INSERT INTO attendance (user_id, date, at_time, location_id) VALUES (?, ?, ?, ?)', 
                            [userId, currentDate, currentTime, locationId], 
                            (err, attendanceResult) => {
                                if (err) {
                                    console.error('Error marking attendance:', err);
                                    return res.status(500).json({
                                        success: false,
                                        error: 'Error marking attendance'
                                    });
                                }

                                // Update user's has_attended status
                                db.query('UPDATE USER SET has_attended = TRUE WHERE id = ?', [userId], (err) => {
                                    if (err) {
                                        console.error('Error updating user status:', err);
                                    }
                                });

                                console.log(`✓ Attendance marked successfully for ${name} (ID: ${userId})`);

                                return res.json({
                                    success: true,
                                    message: `Attendance marked successfully for ${name}`,
                                    data: {
                                        attendanceId: attendanceResult.insertId,
                                        locationId: locationId,
                                        userId: userId,
                                        name: name,
                                        date: currentDate,
                                        time: currentTime,
                                        confidence: confidence,
                                        location: { lat, lon }
                                    }
                                });
                            }
                        );
                    }
                );
            });
        });

    } catch (error) {
        console.error('Error in /location endpoint:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
