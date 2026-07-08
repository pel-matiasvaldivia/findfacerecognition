const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const { uploadFile, readStoredFile } = require('../services/storage.service');
const { logAccess } = require('../services/db.service');
const { detectFaces, searchFaces, verifyFaces, createFace } = require('../services/ntech.service');
const mqttService = require('../services/mqtt.service');
const requireAuth = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// All API routes require a valid backend session (Bearer token).
router.use(requireAuth);

// ... (existing code)

// Search for similar faces in the system (1:N)
router.post('/search', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // Upload image to storage
        const imageUrl = await uploadFile(req.file);

        // Detect faces first
        const detectionResult = await detectFaces(req.file.buffer, req.file.originalname);

        // Check if any faces were detected
        if (!detectionResult.objects?.face || detectionResult.objects.face.length === 0) {
            // Log no face detected
            await logAccess({
                imageUrl,
                status: 'NO_MATCH',
                metadata: { error: 'No face detected' }
            });

            return res.status(404).json({
                error: 'No faces detected in the image',
                imageUrl
            });
        }

        // Use the first detected face for search
        const firstFace = detectionResult.objects.face[0];
        const detectionId = firstFace.id;

        console.log('DEBUG: NTech Face Object:', JSON.stringify(firstFace, null, 2));

        // --- LIVENESS CHECK ---
        // Check if liveness score is available and valid
        // NTLAB usually returns 'liveness' object or attribute within the face object
        const livenessScore = firstFace.liveness?.score || firstFace.attributes?.liveness || 0;
        const LIVENESS_THRESHOLD = 0.7; // Adjust based on testing

        // If liveness is present in response, enforce it
        if (firstFace.liveness || firstFace.attributes?.liveness !== undefined) {
            const score = typeof livenessScore === 'object' ? livenessScore.score : livenessScore;
            if (score < LIVENESS_THRESHOLD) {
                console.warn(`Liveness Check Failed: Score ${score} < ${LIVENESS_THRESHOLD}`);
                await logAccess({
                    imageUrl,
                    status: 'ERROR',
                    metadata: { error: 'Liveness Check Failed', score }
                });
                return res.status(403).json({
                    error: 'Liveness Check Failed. Real person required.',
                    code: 'LIVENESS_FAILED',
                    score
                });
            }
        }
        // ----------------------

        // Search for similar faces
        const searchOptions = {
            limit: req.query.limit || 10,
            threshold: req.query.threshold || 0.75
        };

        const searchResults = await searchFaces(detectionId, searchOptions);
        const matches = searchResults.results || [];

        // NTLAB returns a list of cards with 'looks_like_confidence'
        // We need to map it to the structure expected by frontend: { card: {...}, similarity: ... }
        const ntechMatch = matches.length > 0 ? matches[0] : null;

        let bestMatch = null;
        if (ntechMatch) {
            bestMatch = {
                card: {
                    id: ntechMatch.id,
                    name: ntechMatch.name,
                    meta: ntechMatch.meta
                },
                similarity: ntechMatch.looks_like_confidence || ntechMatch.confidence || 0
            };
        }

        // Determine status
        const status = bestMatch ? 'MATCH' : 'NO_MATCH';

        // Trigger Door Open if MATCH
        if (status === 'MATCH') {
            const cardId = bestMatch.card?.id || 'unknown';
            const cardName = bestMatch.card?.name || 'Unknown';
            mqttService.openDoor(5000, cardId, cardName);
        }

        // Log access
        const logEntry = await logAccess({
            imageUrl,
            detectionId,
            matchedCardId: bestMatch?.card?.id,
            confidence: bestMatch?.similarity,
            status,
            metadata: {
                matches_count: matches.length,
                best_match: bestMatch
            }
        });

        res.json({
            imageUrl,
            detectedFace: firstFace,
            searchResults,
            matches,
            bestMatch,
            status, // 'MATCH' or 'NO_MATCH'
            logId: logEntry?.id
        });

    } catch (error) {
        console.error('Search endpoint error:', error);
        res.status(500).json({
            error: error.message,
            details: error.response?.data || 'Internal Server Error',
            step: 'search'
        });
    }
});

// Enroll a new face
router.post('/enroll', async (req, res) => {
    try {
        const { detectionId, name, meta, imageUrl } = req.body;

        if (!detectionId || !name) {
            return res.status(400).json({ error: 'Detection ID and Name are required' });
        }

        let imageBuffer;
        if (imageUrl) {
            // Photos are stored locally, so read from disk first. Fall back to an
            // HTTP fetch only for external URLs.
            imageBuffer = await readStoredFile(imageUrl);
            if (!imageBuffer) {
                try {
                    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    imageBuffer = Buffer.from(imageResponse.data);
                } catch (imgError) {
                    console.warn('Failed to load enrollment image:', imgError.message);
                    // We proceed without imageBuffer, but ntech service will warn/fail attachment
                }
            }
        }

        const newCard = await createFace({
            detectionId,
            name,
            meta,
            imageBuffer,
            imageUrl
        });

        res.json({
            message: 'Face enrolled successfully',
            card: newCard
        });

    } catch (error) {
        console.error('Enroll endpoint error:', error);
        res.status(500).json({
            error: error.message,
            details: error.response?.data || 'Internal Server Error',
            step: 'enrollment'
        });
    }
});

// Verify/compare two faces (1:1)
router.post('/verify', upload.fields([{ name: 'image1' }, { name: 'image2' }]), async (req, res) => {
    try {
        if (!req.files['image1'] || !req.files['image2']) {
            return res.status(400).json({ error: 'Both images are required' });
        }

        const file1 = req.files['image1'][0];
        const file2 = req.files['image2'][0];

        // Upload both images
        const image1Url = await uploadFile(file1);
        const image2Url = await uploadFile(file2);

        // Detect faces in both images
        const detection1 = await detectFaces(file1.buffer, file1.originalname);
        const detection2 = await detectFaces(file2.buffer, file2.originalname);

        // Check if faces were detected
        if (!detection1.objects?.face || detection1.objects.face.length === 0) {
            return res.status(404).json({ error: 'No face detected in first image' });
        }
        if (!detection2.objects?.face || detection2.objects.face.length === 0) {
            return res.status(404).json({ error: 'No face detected in second image' });
        }

        const face1Id = detection1.objects.face[0].id;
        const face2Id = detection2.objects.face[0].id;

        // Verify faces
        const verificationResult = await verifyFaces(face1Id, face2Id);

        res.json({
            image1Url,
            image2Url,
            face1: detection1.objects.face[0],
            face2: detection2.objects.face[0],
            verification: verificationResult,
            match: verificationResult.confidence?.average_conf >= 0.7
        });

    } catch (error) {
        console.error('Verify endpoint error:', error);
        res.status(500).json({
            error: error.message,
            details: error.response?.data || 'Internal Server Error',
            step: 'verification'
        });
    }
});

router.post('/door/open', (req, res) => {
    // Manual door open command
    // In a real app, check req.user or role here
    const success = mqttService.openDoor(5000, 'manual', 'Operator');
    if (success) {
        res.json({ message: 'Door opening command sent' });
    } else {
        res.status(503).json({ error: 'MQTT Service unavailable' });
    }
});

module.exports = router;
