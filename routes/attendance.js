const express = require('express');
const router = express.Router();
const { markAttendance, getMyAttendance, getAllAttendance } = require('../controller/attendanceController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { getconnection } = require('../connection');

// Mark attendance (authenticated users)
router.post('/mark', authenticateToken, markAttendance);

// Get current user's attendance
router.get('/my', authenticateToken, getMyAttendance);

// Get all attendance records (admin only)
router.get('/all', authenticateToken, isAdmin, getAllAttendance);

// Get attendance statistics (admin only)
router.get('/stats', authenticateToken, isAdmin, (req, res) => {
    const db = getconnection();
    const today = new Date().toISOString().split('T')[0];
    
    // Get total students count
    db.query('SELECT COUNT(*) as totalStudents FROM USER WHERE role = "student"', (err, studentResult) => {
        if (err) {
            console.error('Error fetching stats:', err);
            return res.status(500).json({ error: 'Error fetching statistics' });
        }

        // Get present today count
        db.query('SELECT COUNT(*) as presentToday FROM attendance WHERE date = ?', [today], (err, presentResult) => {
            if (err) {
                console.error('Error fetching stats:', err);
                return res.status(500).json({ error: 'Error fetching statistics' });
            }

            const totalStudents = studentResult[0].totalStudents;
            const presentToday = presentResult[0].presentToday;
            const absentToday = totalStudents - presentToday;

            res.json({
                totalStudents,
                presentToday,
                absentToday
            });
        });
    });
});

// Get recent attendance records (admin only)
router.get('/recent', authenticateToken, isAdmin, (req, res) => {
    const db = getconnection();
    const limit = req.query.limit || 10;
    
    const query = `
        SELECT a.*, u.name, u.email, l.latitude, l.longitude 
        FROM attendance a
        JOIN USER u ON a.user_id = u.id
        LEFT JOIN locations l ON a.location_id = l.location_id
        ORDER BY a.date DESC, a.at_time DESC
        LIMIT ?
    `;

    db.query(query, [parseInt(limit)], (err, results) => {
        if (err) {
            console.error('Error fetching recent attendance:', err);
            return res.status(500).json({ error: 'Error fetching recent attendance' });
        }
        
        // Format the response to include time field
        const formattedResults = results.map(record => ({
            ...record,
            time: record.at_time
        }));
        
        res.json(formattedResults);
    });
});

module.exports = router;
