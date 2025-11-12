const { getconnection } = require('../connection');
const jwt = require('jsonwebtoken');

// Mark attendance
const markAttendance = (req, res) => {
    const { userId } = req.user; // From JWT
    const { latitude, longitude } = req.body;
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    // First, check if attendance already marked for today
    const db = getconnection();
    const checkQuery = 'SELECT * FROM attendance WHERE user_id = ? AND date = ?';
    db.query(checkQuery, [userId, currentDate], (err, results) => {
        if (err) {
            console.error('Error checking attendance:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Attendance already marked for today' });
        }

        // First insert location data if provided
        if (latitude && longitude) {
            const locationQuery = 'INSERT INTO locations (latitude, longitude, at_time) VALUES (?, ?, NOW())';
            db.query(locationQuery, [latitude, longitude], (err, locationResult) => {
                if (err) {
                    console.error('Error saving location:', err);
                    return res.status(500).json({ error: 'Error saving location' });
                }

                const locationId = locationResult.insertId;
                
                // Insert attendance record with location_id
                const insertQuery = 'INSERT INTO attendance (user_id, date, at_time, location_id) VALUES (?, ?, ?, ?)';
                db.query(insertQuery, [userId, currentDate, currentTime, locationId], (err, result) => {
                    if (err) {
                        console.error('Error marking attendance:', err);
                        return res.status(500).json({ error: 'Error marking attendance' });
                    }

                    // Update user's has_attended status
                    db.query('UPDATE USER SET has_attended = TRUE WHERE id = ?', [userId]);

                    res.json({ message: 'Attendance marked successfully', attendanceId: result.insertId });
                });
            });
        } else {
            // Insert attendance without location
            const insertQuery = 'INSERT INTO attendance (user_id, date, at_time) VALUES (?, ?, ?)';
            db.query(insertQuery, [userId, currentDate, currentTime], (err, result) => {
                if (err) {
                    console.error('Error marking attendance:', err);
                    return res.status(500).json({ error: 'Error marking attendance' });
                }

                // Update user's has_attended status
                db.query('UPDATE USER SET has_attended = TRUE WHERE id = ?', [userId]);

                res.json({ message: 'Attendance marked successfully', attendanceId: result.insertId });
            });
        }
    });
};

// Get user's attendance
const getMyAttendance = (req, res) => {
    const { userId } = req.user;
    const db = getconnection();
    
    const query = `
        SELECT a.*, u.name, l.latitude, l.longitude 
        FROM attendance a
        JOIN USER u ON a.user_id = u.id
        LEFT JOIN locations l ON a.location_id = l.location_id
        WHERE a.user_id = ?
        ORDER BY a.date DESC, a.at_time DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching attendance:', err);
            return res.status(500).json({ error: 'Error fetching attendance records' });
        }
        res.json(results);
    });
};

// Get all attendance (admin only)
const getAllAttendance = (req, res) => {
    // Check if user is admin (this should be handled by auth middleware)
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const db = getconnection();
    const { date } = req.query;
    
    let query = `
        SELECT a.*, u.name, u.email, l.latitude, l.longitude 
        FROM attendance a
        JOIN USER u ON a.user_id = u.id
        LEFT JOIN locations l ON a.location_id = l.location_id
    `;
    
    const params = [];
    if (date) {
        query += ' WHERE a.date = ?';
        params.push(date);
    }
    
    query += ' ORDER BY a.date DESC, a.at_time DESC';

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching all attendance:', err);
            return res.status(500).json({ error: 'Error fetching attendance records' });
        }
        res.json(results);
    });
};

// Get attendance statistics (admin only)
const getAttendanceStats = (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const db = getconnection();
    const today = new Date().toISOString().split('T')[0];
    
    // Get total students (excluding admins)
    const totalStudentsQuery = "SELECT COUNT(*) as count FROM USER WHERE role != 'admin'";
    
    // Get present today
    const presentTodayQuery = `
        SELECT COUNT(DISTINCT user_id) as count 
        FROM attendance 
        WHERE date = ?
    `;
    
    db.query(totalStudentsQuery, (err, totalResult) => {
        if (err) {
            console.error('Error fetching total students:', err);
            return res.status(500).json({ error: 'Error fetching statistics' });
        }
        
        const totalStudents = totalResult[0].count;
        
        db.query(presentTodayQuery, [today], (err, presentResult) => {
            if (err) {
                console.error('Error fetching present today:', err);
                return res.status(500).json({ error: 'Error fetching statistics' });
            }
            
            const presentToday = presentResult[0].count;
            const absentToday = totalStudents - presentToday;
            
            res.json({
                totalStudents,
                presentToday,
                absentToday
            });
        });
    });
};

module.exports = {
    markAttendance,
    getMyAttendance,
    getAllAttendance,
    getAttendanceStats
};
