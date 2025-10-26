const faceapi = require('face-api.js');
const canvas = require('canvas');
const fs = require('fs');
const path = require('path');

// Setup canvas for face-api.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Path to models and images
const MODELS_PATH = path.join(__dirname, 'models');
const IMAGES_PATH = path.join(__dirname, 'Images');

let isModelLoaded = false;
let labeledDescriptors = [];

/**
 * Load face-api.js models
 */
async function loadModels() {
    if (isModelLoaded) return;
    
    try {
        console.log('[INFO] Loading face recognition models...');
        
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
        
        isModelLoaded = true;
        console.log('[INFO] Models loaded successfully');
    } catch (error) {
        console.error('[ERROR] Failed to load models:', error.message);
        throw new Error('Face recognition models not found. Please download them first.');
    }
}

/**
 * Load and train on reference images from Images folder
 */
async function loadReferenceImages() {
    try {
        if (!fs.existsSync(IMAGES_PATH)) {
            fs.mkdirSync(IMAGES_PATH);
            console.log(`[INFO] Created '${IMAGES_PATH}' directory`);
            return [];
        }
        
        const files = fs.readdirSync(IMAGES_PATH)
            .filter(file => /\.(jpg|jpeg|png)$/i.test(file));
        
        if (files.length === 0) {
            console.log('[WARNING] No images found in Images folder');
            return [];
        }
        
        console.log('[INFO] Loading reference images...');
        const labeledDescriptors = [];
        
        for (const file of files) {
            const name = path.parse(file).name;
            const imgPath = path.join(IMAGES_PATH, file);
            
            try {
                const img = await canvas.loadImage(imgPath);
                const detection = await faceapi
                    .detectSingleFace(img)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                
                if (detection) {
                    labeledDescriptors.push({
                        label: name,
                        descriptors: [detection.descriptor]
                    });
                    console.log(`[INFO] Loaded: ${name}`);
                } else {
                    console.log(`[WARNING] No face detected in ${file}`);
                }
            } catch (error) {
                console.error(`[ERROR] Failed to process ${file}:`, error.message);
            }
        }
        
        console.log(`[INFO] Training complete with ${labeledDescriptors.length} faces`);
        return labeledDescriptors;
        
    } catch (error) {
        console.error('[ERROR] Failed to load reference images:', error.message);
        return [];
    }
}

/**
 * Initialize face recognition system
 */
async function initialize() {
    try {
        await loadModels();
        labeledDescriptors = await loadReferenceImages();
        return true;
    } catch (error) {
        console.error('[ERROR] Initialization failed:', error.message);
        return false;
    }
}

/**
 * Verify face from image buffer or file path
 * @param {Buffer|string} imageInput - Image buffer or file path
 * @returns {Promise<{success: boolean, name?: string, confidence?: number, error?: string}>}
 */
async function verifyFace(imageInput) {
    try {
        if (!isModelLoaded) {
            await loadModels();
        }
        
        if (labeledDescriptors.length === 0) {
            return {
                success: false,
                error: 'No reference faces loaded. Please add images to the Images folder.'
            };
        }
        
        // Load image
        let img;
        if (typeof imageInput === 'string') {
            img = await canvas.loadImage(imageInput);
        } else {
            img = await canvas.loadImage(imageInput);
        }
        
        // Detect face
        const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (!detection) {
            return {
                success: false,
                error: 'No face detected in image'
            };
        }
        
        // Create face matcher
        const faceMatcher = new faceapi.FaceMatcher(
            labeledDescriptors.map(ld => 
                new faceapi.LabeledFaceDescriptors(ld.label, ld.descriptors)
            ),
            0.6 // Distance threshold (lower = stricter)
        );
        
        // Match face
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        
        if (bestMatch.label === 'unknown') {
            return {
                success: false,
                recognized: false,
                error: 'Face not recognized',
                confidence: Math.round((1 - bestMatch.distance) * 100)
            };
        }
        
        return {
            success: true,
            recognized: true,
            name: bestMatch.label,
            confidence: Math.round((1 - bestMatch.distance) * 100)
        };
        
    } catch (error) {
        console.error('[ERROR] Face verification failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Reload reference images (useful when new images are added)
 */
async function reloadTraining() {
    try {
        labeledDescriptors = await loadReferenceImages();
        return {
            success: true,
            message: 'Training data reloaded',
            facesLoaded: labeledDescriptors.length
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    initialize,
    verifyFace,
    reloadTraining,
    getLoadedFaces: () => labeledDescriptors.map(ld => ld.label)
};
