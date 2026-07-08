const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Local filesystem storage. Files are written to UPLOADS_DIR and served
// statically by the backend at /uploads (see index.js). This replaces the
// previous Supabase Storage bucket so the app has no external dependency.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

// Public base URL where /uploads is reachable, e.g. https://back.faceid.alertasenlinea.com.ar
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');

// Ensure the uploads directory exists at startup.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const safeName = (originalname = 'upload.jpg') => {
    const ext = path.extname(originalname).toLowerCase() || '.jpg';
    return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
};

/**
 * Persist an uploaded file (multer memory storage) to local disk.
 * @param {Object} file - multer file object with .buffer and .originalname
 * @returns {Promise<string>} Public URL of the stored file
 */
const uploadFile = async (file) => {
    const fileName = safeName(file.originalname);
    const destPath = path.join(UPLOADS_DIR, fileName);
    await fs.promises.writeFile(destPath, file.buffer);
    return `${PUBLIC_BASE_URL}/uploads/${fileName}`;
};

/**
 * Read a previously stored file back into a Buffer, given the URL returned by
 * uploadFile (or a bare filename). Returns null if it is not a local file.
 * @param {string} imageUrl
 * @returns {Promise<Buffer|null>}
 */
const readStoredFile = async (imageUrl) => {
    if (!imageUrl) return null;
    const fileName = path.basename(imageUrl.split('?')[0]);
    // Guard against path traversal.
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) return null;
    const filePath = path.join(UPLOADS_DIR, fileName);
    try {
        return await fs.promises.readFile(filePath);
    } catch (e) {
        return null;
    }
};

module.exports = {
    uploadFile,
    readStoredFile,
    UPLOADS_DIR
};
