const express = require('express');
const router = express.Router();
const multer = require('multer');
const faceRecognition = require('../faceRecognition');

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

module.exports = router;
