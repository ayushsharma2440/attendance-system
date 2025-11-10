const jwt = require('jsonwebtoken');
const { getconnection } = require('../connection');

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Also check cookies as fallback (cookies take priority for web pages)
    const cookieToken = req.cookies?.jwt;
    const finalToken = cookieToken || token;

    // Debug logging
    console.log('Auth check for:', req.path);
    console.log('Cookie token present:', !!cookieToken);
    console.log('Authorization header present:', !!token);
    console.log('All cookies:', Object.keys(req.cookies || {}));

    if (!finalToken) {
        console.log('No token found, redirecting/returning error');
        // If it's an API request, return JSON
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        // For web pages, redirect to login
        return res.redirect('/login');
    }

    // Debug: Log token format
    console.log('Token received:', finalToken?.substring(0, 20) + '...');

    try {
        const decoded = jwt.verify(finalToken, 'ayush');
        
        // Fetch user details from database
        const db = getconnection();
        db.query('SELECT id, name, email, role FROM USER WHERE id = ?', [decoded._id || decoded.userId || decoded.id], (err, results) => {
            if (err || results.length === 0) {
                console.error('Database error or user not found:', err);
                res.clearCookie('jwt');
                
                if (req.path.startsWith('/api/')) {
                    return res.status(401).json({ error: 'Invalid token' });
                }
                return res.redirect('/login');
            }

            req.user = {
                userId: results[0].id,
                name: results[0].name,
                email: results[0].email,
                role: results[0].role
            };
            next();
        });
    } catch (error) {
        console.error('Token verification error:', error);
        // Clear invalid token cookie
        res.clearCookie('jwt');
        
        // If it's an API request, return JSON
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        // For web pages, redirect to login
        return res.redirect('/login');
    }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Access denied. Admin rights required.' });
    }
};

module.exports = {
    authenticateToken,
    isAdmin
};
