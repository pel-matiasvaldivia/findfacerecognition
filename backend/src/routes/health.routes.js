const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pingDb } = require('../services/db.service');

// Basic health check
router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed diagnostics (Be careful exposing this publicly without auth in real production)
router.get('/diagnostics', async (req, res) => {
    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            DATABASE_URL_CONFIGURED: !!process.env.DATABASE_URL,
            GOOGLE_CLIENT_ID_CONFIGURED: !!process.env.GOOGLE_CLIENT_ID,
            JWT_SECRET_CONFIGURED: !!process.env.JWT_SECRET,
            NTECH_API_URL_CONFIGURED: !!process.env.NTECH_API_URL,
            NTECH_API_KEY_CONFIGURED: !!process.env.NTECH_API_KEY,
            NTECH_API_URL_VALUE: process.env.NTECH_API_URL || 'default',
        },
        connectivity: {
            database: 'pending',
            ntlab: 'pending'
        }
    };

    // Check database connectivity
    diagnostics.connectivity.database = (await pingDb()) ? 'ok' : 'error';

    // Check NTLAB connectivity (basic reachability)
    try {
        const ntechUrl = process.env.NTECH_API_URL || 'https://videoia.alertasenlinea.com.ar';
        await axios.get(ntechUrl, { timeout: 5000 }).catch(err => {
            // Expected 404 or 401 is fine, means we reached the server
            if (err.response) return;
            throw err;
        });
        diagnostics.connectivity.ntlab = 'reachable';
    } catch (error) {
        diagnostics.connectivity.ntlab = `error: ${error.message}`;
    }

    res.json(diagnostics);
});

module.exports = router;
