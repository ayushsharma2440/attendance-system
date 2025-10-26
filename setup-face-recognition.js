const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'models');
const MODEL_URLS = {
    'ssd_mobilenetv1_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2',
    'face_landmark_68_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1',
    'face_recognition_model-shard2': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2'
};

// Create models directory
if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR);
    console.log('Created models directory');
}

// Download a file
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                return downloadFile(response.headers.location, dest)
                    .then(resolve)
                    .catch(reject);
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// Download all models
async function downloadModels() {
    console.log('Downloading face recognition models...\n');
    
    let downloaded = 0;
    const total = Object.keys(MODEL_URLS).length;
    
    for (const [filename, url] of Object.entries(MODEL_URLS)) {
        const dest = path.join(MODELS_DIR, filename);
        
        if (fs.existsSync(dest)) {
            console.log(`✓ ${filename} (already exists)`);
            downloaded++;
            continue;
        }
        
        try {
            console.log(`Downloading ${filename}...`);
            await downloadFile(url, dest);
            console.log(`✓ ${filename}`);
            downloaded++;
        } catch (error) {
            console.error(`✗ Failed to download ${filename}:`, error.message);
        }
    }
    
    console.log(`\nDownloaded ${downloaded}/${total} files`);
    
    if (downloaded === total) {
        console.log('\n✓ Setup complete! You can now use face recognition.');
        console.log('Add face images to the "Images" folder (e.g., john_doe.jpg)');
    } else {
        console.log('\n⚠ Some files failed to download. Please try again.');
    }
}

downloadModels().catch(console.error);
