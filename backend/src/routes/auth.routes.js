const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { loginWithGoogle } = require('../services/auth.service');

// Exchange a Google Identity Services ID token for a backend session JWT.
router.post('/google', async (req, res) => {
    try {
        const credential = req.body.credential || req.body.id_token;
        const { token, user } = await loginWithGoogle(credential);
        res.json({ token, user });
    } catch (error) {
        const status = error.status || 500;
        if (status >= 500) console.error('Auth /google error:', error.message);
        res.status(status).json({ error: error.message });
    }
});

// Return the current session's user (validates the token).
router.get('/me', requireAuth, (req, res) => {
    res.json({ user: { email: req.user.email, name: req.user.name, picture: req.user.picture } });
});

module.exports = router;
